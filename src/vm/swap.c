#include "vm/swap.h"
#include <bitmap.h>
#include <debug.h>
#include <stdio.h>
#include "devices/block.h"
#include "threads/synch.h"
#include "threads/vaddr.h"

#define SECTORS_PER_PAGE (PGSIZE / BLOCK_SECTOR_SIZE)

static struct block *swap_block;
static struct bitmap *swap_map;
static struct lock swap_lock;

void
swap_init (void)
{
  swap_block = block_get_role (BLOCK_SWAP);
  if (swap_block == NULL)
    return;
  size_t n_slots = block_size (swap_block) / SECTORS_PER_PAGE;
  swap_map = bitmap_create (n_slots);
  if (swap_map == NULL)
    PANIC ("swap_init: cannot allocate swap bitmap");
  lock_init (&swap_lock);
}

size_t
swap_out (void *kpage)
{
  ASSERT (swap_block != NULL);
  ASSERT (swap_map != NULL);

  lock_acquire (&swap_lock);
  size_t slot = bitmap_scan_and_flip (swap_map, 0, 1, false);
  if (slot == BITMAP_ERROR)
    PANIC ("swap partition is full");

  for (size_t i = 0; i < SECTORS_PER_PAGE; i++)
    block_write (swap_block, slot * SECTORS_PER_PAGE + i,
                 (uint8_t *) kpage + i * BLOCK_SECTOR_SIZE);

  lock_release (&swap_lock);
  return slot;
}

void
swap_in (size_t slot, void *kpage)
{
  ASSERT (swap_block != NULL);
  ASSERT (swap_map != NULL);

  lock_acquire (&swap_lock);
  ASSERT (bitmap_test (swap_map, slot));

  for (size_t i = 0; i < SECTORS_PER_PAGE; i++)
    block_read (swap_block, slot * SECTORS_PER_PAGE + i,
                (uint8_t *) kpage + i * BLOCK_SECTOR_SIZE);

  bitmap_flip (swap_map, slot);
  lock_release (&swap_lock);
}

void
swap_free (size_t slot)
{
  ASSERT (swap_map != NULL);

  lock_acquire (&swap_lock);
  ASSERT (bitmap_test (swap_map, slot));
  bitmap_flip (swap_map, slot);
  lock_release (&swap_lock);
}
