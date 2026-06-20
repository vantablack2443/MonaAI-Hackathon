#include "userprog/syscall.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <syscall-nr.h>
#include "threads/interrupt.h"
#include "threads/thread.h"
#include "threads/vaddr.h"
#include "userprog/process.h"
#include "userprog/pagedir.h"
#include "filesys/filesys.h"
#include "filesys/file.h"
#include "threads/malloc.h"
#include "threads/synch.h"
#include "devices/input.h"
#include "devices/shutdown.h"
#ifdef VM
#include "vm/frame.h"
#include "vm/page.h"
#endif

static void syscall_handler (struct intr_frame *);
static struct lock fs_lock;

void
syscall_init (void) 
{
  intr_register_int (0x30, 3, INTR_ON, syscall_handler, "syscall");
  lock_init (&fs_lock);
}


/* Checks if uaddr is a valid, accessible user virtual address. */
static bool
is_valid_uvaddr (const void *uaddr)
{
  if (uaddr == NULL || !is_user_vaddr (uaddr))
    return false;
  struct thread *t = thread_current ();
  /* Page is valid if already mapped OR has a lazy SPT entry. */
  if (pagedir_get_page (t->pagedir, uaddr) != NULL)
    return true;
#ifdef VM
  return spt_lookup (&t->spt, pg_round_down (uaddr)) != NULL;
#else
  return false;
#endif
}

static bool
is_valid_ptr (const void *ptr)
{
  if (ptr == NULL || !is_user_vaddr(ptr))
    return false;
  
  const uint8_t *p = (const uint8_t *) ptr;
  for (int i = 0; i < 4; i++)
    {
      if (!is_valid_uvaddr(p + i))
        return false;
    }
  return true;
}

static bool
is_valid_str (const char *str)
{
  if (str == NULL || !is_user_vaddr(str))
    return false;
  while (true)
    {
      if (!is_valid_uvaddr(str))
        return false;
      if (*str == '\0')
        return true;
      str++;
    }
}

static bool
is_valid_buf (const void *buf, unsigned size)
{
  if (buf == NULL || !is_user_vaddr(buf))
    return false;

  const uint8_t *b = (const uint8_t *) buf;
  const uint8_t *end = b + size;

  if (end < b) // check for overflow
    return false;
  
  while (b < end)
    {
      if (!is_valid_uvaddr(b))
        return false;
      
      b = (const uint8_t *) pg_round_up((void *)(b+1));
    }
  
  return is_valid_uvaddr(end - 1);
}

// Added for milestone 2
static void
bad_exit (void)
{
  if (thread_current ()->my_status != NULL)
    thread_current ()->my_status->exit_status = -1;
  thread_exit ();
}

// Added for milestone 2
// Get the nth argument from the user stack
static uint32_t
get_arg (struct intr_frame *f, int n)
{
  uint32_t *ptr = (uint32_t *) f->esp + 1 + n;
  if (!is_valid_ptr (ptr))
    bad_exit ();
  return *ptr;
}


static void
syscall_handler (struct intr_frame *f UNUSED)
{
#ifdef VM
  /* Save user stack pointer so the page fault handler can use it for
     stack growth detection when faults occur in kernel mode. */
  thread_current ()->user_esp = f->esp;
#endif

  if (!is_valid_ptr (f->esp))
    bad_exit ();
  int syscall_num = *(int *) f->esp;

  // Handle the system call based on the syscall number
  switch (syscall_num)
    {
      case SYS_HALT:
        shutdown_power_off ();
        break;        
      
      case SYS_EXIT:
        {
          int status = (int) get_arg(f, 0);
          struct thread *cur = thread_current ();
          if (cur->my_status != NULL) 
            {
              cur->my_status->exit_status = status;
            }
          thread_exit ();
          break;
        }
      
      case SYS_EXEC:
        {
          const char *file_name = (const char *) get_arg(f, 0);
          if (!is_valid_str(file_name))
            bad_exit ();
          
          lock_acquire (&fs_lock);
          tid_t tid = process_execute(file_name);
          lock_release (&fs_lock);
          
          f->eax = tid;
          break;
        }
      
      case SYS_WAIT:
        {
          tid_t tid = (tid_t) get_arg(f, 0);
          f->eax = process_wait(tid);
          break;
        }
      
      case SYS_CREATE:
        {
          const char *file = (const char *) get_arg(f, 0);
          unsigned initial_size = (unsigned) get_arg(f, 1);
          
          if (!is_valid_str(file))
            bad_exit ();
          
          lock_acquire (&fs_lock);
          bool success = filesys_create(file, initial_size);
          lock_release (&fs_lock);
          
          f->eax = success ? 1 : 0;
          break;
        }
      
      case SYS_REMOVE:
        {
          const char *file = (const char *) get_arg(f, 0);
          
          if (!is_valid_str(file))
            bad_exit ();
          
          lock_acquire (&fs_lock);
          bool success = filesys_remove(file);
          lock_release (&fs_lock);
          
          f->eax = success ? 1 : 0;
          break;
        }
      
      case SYS_OPEN:
        {
          const char *file_name = (const char *) get_arg(f, 0);
          
          if (!is_valid_str(file_name))
            bad_exit ();
          
          lock_acquire (&fs_lock);
          struct file *file = filesys_open(file_name);
          lock_release (&fs_lock);
          
          if (file == NULL)
            {
              f->eax = -1;
            }
          else
            {
              struct thread *cur = thread_current();
              struct open_file_entry *entry = malloc(sizeof(struct open_file_entry));
              if (entry == NULL)
                {
                  lock_acquire (&fs_lock);
                  file_close(file);
                  lock_release (&fs_lock);
                  f->eax = -1;
                }
              else
                {
                  entry->fd = cur->next_fd++;
                  entry->file = file;
                  list_push_back(&cur->opened_files, &entry->elem);
                  f->eax = entry->fd;
                }
            }
          break;
        }
      
      case SYS_CLOSE:
        {
          int fd = (int) get_arg(f, 0);
          struct thread *cur = thread_current();
          struct list_elem *e;
          
          for (e = list_begin(&cur->opened_files);
               e != list_end(&cur->opened_files);
               e = list_next(e))
            {
              struct open_file_entry *entry = list_entry(e, struct open_file_entry, elem);
              if (entry->fd == fd)
                {
                  lock_acquire (&fs_lock);
                  file_close(entry->file);
                  lock_release (&fs_lock);
                  list_remove(e);
                  free(entry);
                  return;
                }
            }
          break;
        }
      
      case SYS_FILESIZE:
        {
          int fd = (int) get_arg(f, 0);
          struct thread *cur = thread_current();
          struct list_elem *e;
          
          for (e = list_begin(&cur->opened_files);
               e != list_end(&cur->opened_files);
               e = list_next(e))
            {
              struct open_file_entry *entry = list_entry(e, struct open_file_entry, elem);
              if (entry->fd == fd)
                {
                  lock_acquire (&fs_lock);
                  off_t size = file_length(entry->file);
                  lock_release (&fs_lock);
                  f->eax = size;
                  return;
                }
            }
          f->eax = -1;
          break;
        }
      
      case SYS_READ:
        {
          int fd = (int) get_arg(f, 0);
          void *buffer = (void *) get_arg(f, 1);
          unsigned size = (unsigned) get_arg(f, 2);
          
          if (!is_valid_buf(buffer, size))
            bad_exit ();
          
          if (fd == 0)
            {
              // Read from stdin
              uint8_t *buf = (uint8_t *) buffer;
              for (unsigned i = 0; i < size; i++)
                {
                  buf[i] = input_getc();
                }
              f->eax = size;
            }
          else
            {
              struct thread *cur = thread_current();
              struct list_elem *e;
              
              for (e = list_begin(&cur->opened_files);
                   e != list_end(&cur->opened_files);
                   e = list_next(e))
                {
                  struct open_file_entry *entry = list_entry(e, struct open_file_entry, elem);
                  if (entry->fd == fd)
                    {
                      lock_acquire (&fs_lock);
                      off_t bytes_read = file_read(entry->file, buffer, size);
                      lock_release (&fs_lock);
                      f->eax = bytes_read;
                      return;
                    }
                }
              f->eax = -1;
            }
          break;
        }
      
      case SYS_WRITE:
        {
          int fd = (int) get_arg(f, 0);
          const void *buffer = (const void *) get_arg(f, 1);
          unsigned size = (unsigned) get_arg(f, 2);

          if (!is_valid_buf(buffer, size))
            bad_exit ();

          if (fd == 1)
            {
              // Write to stdout
              putbuf (buffer, size);
              f->eax = size;
            }
          else
            {
              struct thread *cur = thread_current();
              struct list_elem *e;
              
              for (e = list_begin(&cur->opened_files);
                   e != list_end(&cur->opened_files);
                   e = list_next(e))
                {
                  struct open_file_entry *entry = list_entry(e, struct open_file_entry, elem);
                  if (entry->fd == fd)
                    {
                      lock_acquire (&fs_lock);
                      off_t bytes_written = file_write(entry->file, buffer, size);
                      lock_release (&fs_lock);
                      f->eax = bytes_written;
                      return;
                    }
                }
              f->eax = -1;
            }
          break;
        }
      
      case SYS_SEEK:
        {
          int fd = (int) get_arg(f, 0);
          unsigned position = (unsigned) get_arg(f, 1);
          struct thread *cur = thread_current();
          struct list_elem *e;
          
          for (e = list_begin(&cur->opened_files);
               e != list_end(&cur->opened_files);
               e = list_next(e))
            {
              struct open_file_entry *entry = list_entry(e, struct open_file_entry, elem);
              if (entry->fd == fd)
                {
                  lock_acquire (&fs_lock);
                  file_seek(entry->file, position);
                  lock_release (&fs_lock);
                  return;
                }
            }
          break;
        }
      
      case SYS_TELL:
        {
          int fd = (int) get_arg(f, 0);
          struct thread *cur = thread_current();
          struct list_elem *e;
          
          for (e = list_begin(&cur->opened_files);
               e != list_end(&cur->opened_files);
               e = list_next(e))
            {
              struct open_file_entry *entry = list_entry(e, struct open_file_entry, elem);
              if (entry->fd == fd)
                {
                  lock_acquire (&fs_lock);
                  off_t pos = file_tell(entry->file);
                  lock_release (&fs_lock);
                  f->eax = pos;
                  return;
                }
            }
          f->eax = -1;
          break;
        }
      
      default:
        bad_exit ();
    }
}
