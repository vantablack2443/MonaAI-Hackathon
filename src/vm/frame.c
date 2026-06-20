#include "vm/frame.h"
#include <debug.h>
#include <stdio.h>
#include <string.h>
#include "threads/init.h"
#include "threads/malloc.h"
#include "threads/palloc.h"
#include "threads/synch.h"
#include "threads/thread.h"
#include "userprog/pagedir.h"
#include "vm/page.h"
#include "vm/swap.h"

static struct list frame_list;
static struct lock frame_lock;
static struct list_elem *clock_hand;

static struct frame_entry *frame_pick_evict (void);
static void frame_do_evict (struct frame_entry *fe);

void
frame_init (void)
{
  list_init (&frame_list);
  lock_init (&frame_lock);
  clock_hand = NULL;
}

void *
frame_alloc (enum palloc_flags flags, void *upage)
{
  lock_acquire (&frame_lock);

  void *kpage = palloc_get_page (flags);

  if (kpage == NULL)
    {
      /* No free frames: evict one */
      struct frame_entry *victim = frame_pick_evict ();
      if (victim == NULL)
        PANIC ("out of frames and nothing to evict");

      frame_do_evict (victim);

      /* Remove and free the frame entry (physical page is still usable) */
      kpage = victim->kpage;
      if (clock_hand == &victim->elem)
        clock_hand = list_next (&victim->elem);
      list_remove (&victim->elem);
      free (victim);

      /* Zero if requested */
      if (flags & PAL_ZERO)
        memset (kpage, 0, PGSIZE);
    }

  struct frame_entry *fe = malloc (sizeof *fe);
  if (fe == NULL)
    {
      palloc_free_page (kpage);
      lock_release (&frame_lock);
      return NULL;
    }
  fe->kpage = kpage;
  fe->upage = upage;
  fe->owner = thread_current ();
  fe->pinned = false;
  list_push_back (&frame_list, &fe->elem);

  lock_release (&frame_lock);
  return kpage;
}

void
frame_free (void *kpage)
{
  lock_acquire (&frame_lock);
  struct list_elem *e;
  for (e = list_begin (&frame_list); e != list_end (&frame_list);
       e = list_next (e))
    {
      struct frame_entry *fe = list_entry (e, struct frame_entry, elem);
      if (fe->kpage == kpage)
        {
          if (clock_hand == e)
            clock_hand = list_next (e);
          list_remove (e);
          free (fe);
          palloc_free_page (kpage);
          lock_release (&frame_lock);
          return;
        }
    }
  lock_release (&frame_lock);
  PANIC ("frame_free: frame not found");
}

void
frame_exit_process (struct thread *t)
{
  lock_acquire (&frame_lock);
  struct list_elem *e = list_begin (&frame_list);
  while (e != list_end (&frame_list))
    {
      struct frame_entry *fe = list_entry (e, struct frame_entry, elem);
      if (fe->owner == t)
        {
          if (clock_hand == e)
            clock_hand = list_next (e);
          e = list_remove (e);
          free (fe);
          /* Physical page freed by pagedir_destroy */
        }
      else
        e = list_next (e);
    }
  lock_release (&frame_lock);
}

void
frame_pin (void *kpage)
{
  lock_acquire (&frame_lock);
  struct list_elem *e;
  for (e = list_begin (&frame_list); e != list_end (&frame_list);
       e = list_next (e))
    {
      struct frame_entry *fe = list_entry (e, struct frame_entry, elem);
      if (fe->kpage == kpage)
        {
          fe->pinned = true;
          lock_release (&frame_lock);
          return;
        }
    }
  lock_release (&frame_lock);
}

void
frame_unpin (void *kpage)
{
  lock_acquire (&frame_lock);
  struct list_elem *e;
  for (e = list_begin (&frame_list); e != list_end (&frame_list);
       e = list_next (e))
    {
      struct frame_entry *fe = list_entry (e, struct frame_entry, elem);
      if (fe->kpage == kpage)
        {
          fe->pinned = false;
          lock_release (&frame_lock);
          return;
        }
    }
  lock_release (&frame_lock);
}

/* Clock algorithm: find a frame to evict. Called with frame_lock held. */
static struct frame_entry *
frame_pick_evict (void)
{
  if (list_empty (&frame_list))
    return NULL;

  /* Two full passes: first pass clears accessed bits, second finds victim */
  int passes = 0;
  size_t n = list_size (&frame_list);
  size_t checked = 0;

  while (passes < 2 && checked <= 2 * n)
    {
      if (clock_hand == NULL || clock_hand == list_end (&frame_list))
        {
          clock_hand = list_begin (&frame_list);
          passes++;
        }

      if (clock_hand == list_end (&frame_list))
        break;

      struct frame_entry *fe = list_entry (clock_hand, struct frame_entry,
                                           elem);
      clock_hand = list_next (clock_hand);
      checked++;

      if (fe->pinned)
        continue;

      /* Check accessed bit (user page table and kernel alias) */
      bool accessed = pagedir_is_accessed (fe->owner->pagedir, fe->upage);
      if (!accessed)
        accessed = pagedir_is_accessed (init_page_dir, fe->kpage);

      if (accessed)
        {
          pagedir_set_accessed (fe->owner->pagedir, fe->upage, false);
          pagedir_set_accessed (init_page_dir, fe->kpage, false);
          continue;
        }

      return fe;
    }

  /* Fallback: pick first non-pinned frame */
  struct list_elem *e;
  for (e = list_begin (&frame_list); e != list_end (&frame_list);
       e = list_next (e))
    {
      struct frame_entry *fe = list_entry (e, struct frame_entry, elem);
      if (!fe->pinned)
        return fe;
    }

  return NULL;
}

/* Evict a frame: write data to swap if needed, clear page table entry.
   Called with frame_lock held.
   The physical page (kpage) is NOT freed here — caller reuses it. */
static void
frame_do_evict (struct frame_entry *fe)
{
  struct thread *owner = fe->owner;
  void *upage = fe->upage;
  void *kpage = fe->kpage;

  struct spt_entry *spte = spt_lookup (&owner->spt, upage);
  ASSERT (spte != NULL);

  bool dirty = pagedir_is_dirty (owner->pagedir, upage)
               || pagedir_is_dirty (init_page_dir, kpage);

  if (!spte->writable)
    {
      /* Read-only page: just discard (can re-read from file) */
      ASSERT (spte->type == PAGE_FILE);
    }
  else
    {
      /* Writable page: write to swap */
      if (spte->type == PAGE_SWAP)
        swap_free (spte->swap_slot);
      (void) dirty; /* always swap writable pages for correctness */
      size_t slot = swap_out (kpage);
      spte->swap_slot = slot;
      spte->type = PAGE_SWAP;
    }

  /* Clear the page table entry so future accesses fault */
  pagedir_clear_page (owner->pagedir, upage);
}
