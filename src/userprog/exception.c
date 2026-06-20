#include "userprog/exception.h"
#include <inttypes.h>
#include <stdio.h>
#include <string.h>
#include "userprog/gdt.h"
#include "userprog/pagedir.h"
#include "threads/interrupt.h"
#include "threads/malloc.h"
#include "threads/thread.h"
#include "threads/vaddr.h"
#ifdef VM
#include "vm/frame.h"
#include "vm/page.h"
#include "vm/swap.h"
#include "filesys/file.h"
#endif

/* Number of page faults processed. */
static long long page_fault_cnt;

/* Maximum user stack size: 8 MB */
#define MAX_STACK_SIZE (8 * 1024 * 1024)

static void kill (struct intr_frame *);
static void page_fault (struct intr_frame *);

void
exception_init (void)
{
  intr_register_int (3, 3, INTR_ON, kill, "#BP Breakpoint Exception");
  intr_register_int (4, 3, INTR_ON, kill, "#OF Overflow Exception");
  intr_register_int (5, 3, INTR_ON, kill,
                     "#BR BOUND Range Exceeded Exception");

  intr_register_int (0, 0, INTR_ON, kill, "#DE Divide Error");
  intr_register_int (1, 0, INTR_ON, kill, "#DB Debug Exception");
  intr_register_int (6, 0, INTR_ON, kill, "#UD Invalid Opcode Exception");
  intr_register_int (7, 0, INTR_ON, kill,
                     "#NM Device Not Available Exception");
  intr_register_int (11, 0, INTR_ON, kill, "#NP Segment Not Present");
  intr_register_int (12, 0, INTR_ON, kill, "#SS Stack Fault Exception");
  intr_register_int (13, 0, INTR_ON, kill, "#GP General Protection Exception");
  intr_register_int (16, 0, INTR_ON, kill, "#MF x87 FPU Floating-Point Error");
  intr_register_int (19, 0, INTR_ON, kill,
                     "#XF SIMD Floating-Point Exception");

  intr_register_int (14, 0, INTR_OFF, page_fault, "#PF Page-Fault Exception");
}

void
exception_print_stats (void)
{
  printf ("Exception: %lld page faults\n", page_fault_cnt);
}

static void
kill (struct intr_frame *f)
{
  switch (f->cs)
    {
    case SEL_UCSEG:
      printf ("%s: dying due to interrupt %#04x (%s).\n",
              thread_name (), f->vec_no, intr_name (f->vec_no));
      intr_dump_frame (f);

      thread_current ()->exception_exit = true;

      thread_exit ();

    case SEL_KCSEG:
      intr_dump_frame (f);
      PANIC ("Kernel bug - unexpected interrupt in kernel");

    default:
      printf ("Interrupt %#04x (%s) in unknown segment %04x\n",
             f->vec_no, intr_name (f->vec_no), f->cs);
      thread_exit ();
    }
}

static void
page_fault (struct intr_frame *f)
{
  bool not_present;
  bool write;
  bool user;
  void *fault_addr;

  asm ("movl %%cr2, %0" : "=r" (fault_addr));
  intr_enable ();
  page_fault_cnt++;

  not_present = (f->error_code & PF_P) == 0;
  write = (f->error_code & PF_W) != 0;
  user = (f->error_code & PF_U) != 0;

#ifdef VM
  {
    struct thread *t = thread_current ();

    /* Save user stack pointer on first user→kernel transition. */
    if (user)
      t->user_esp = f->esp;

    /* Only handle not-present faults on valid user addresses. */
    if (!not_present || fault_addr == NULL || !is_user_vaddr (fault_addr))
      goto vm_kill;

    void *fault_page = pg_round_down (fault_addr);
    void *esp = user ? f->esp : t->user_esp;

    struct spt_entry *spte = spt_lookup (&t->spt, fault_page);

    if (spte == NULL)
      {
        /* Check for valid stack growth: fault must be within 32 bytes
           below the stack pointer and within the 8 MB stack limit. */
        if (esp != NULL
            && (uintptr_t) fault_addr >= (uintptr_t) esp - 32
            && (uintptr_t) fault_page
               >= (uintptr_t) PHYS_BASE - MAX_STACK_SIZE)
          {
            spte = malloc (sizeof *spte);
            if (spte == NULL)
              goto vm_kill;
            spte->upage = fault_page;
            spte->type = PAGE_ZERO;
            spte->writable = true;
            spte->file = NULL;
            spte->file_ofs = 0;
            spte->read_bytes = 0;
            spte->zero_bytes = PGSIZE;
            spte->swap_slot = 0;
            if (!spt_insert (&t->spt, spte))
              {
                free (spte);
                goto vm_kill;
              }
          }
        else
          goto vm_kill;
      }

    if (write && !spte->writable)
      goto vm_kill;

    void *kpage = frame_alloc (PAL_USER, fault_page);
    if (kpage == NULL)
      goto vm_kill;

    if (spte->type == PAGE_ZERO)
      {
        memset (kpage, 0, PGSIZE);
      }
    else if (spte->type == PAGE_FILE)
      {
        if (spte->read_bytes > 0)
          {
            if (file_read_at (spte->file, kpage, spte->read_bytes,
                              spte->file_ofs) != (off_t) spte->read_bytes)
              {
                frame_free (kpage);
                goto vm_kill;
              }
          }
        memset ((uint8_t *) kpage + spte->read_bytes, 0, spte->zero_bytes);
      }
    else /* PAGE_SWAP */
      {
        swap_in (spte->swap_slot, kpage);
        spte->type = PAGE_ZERO;
      }

    if (!pagedir_set_page (t->pagedir, fault_page, kpage, spte->writable))
      {
        frame_free (kpage);
        goto vm_kill;
      }

    return;

  vm_kill:
    if (user)
      {
        printf ("%s: dying due to interrupt %#04x (%s).\n",
                thread_name (), f->vec_no, intr_name (f->vec_no));
        t->exception_exit = true;
        thread_exit ();
      }
    else
      {
        printf ("Page fault at %p: %s error %s page in kernel context.\n",
                fault_addr,
                not_present ? "not present" : "rights violation",
                write ? "writing" : "reading");
        PANIC ("kernel page fault on user address");
      }
  }
#else
  printf ("Page fault at %p: %s error %s page in %s context.\n",
          fault_addr,
          not_present ? "not present" : "rights violation",
          write ? "writing" : "reading",
          user ? "user" : "kernel");
  kill (f);
#endif
}
