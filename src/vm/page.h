#ifndef VM_PAGE_H
#define VM_PAGE_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <hash.h>
#include "filesys/file.h"
#include "filesys/off_t.h"

enum page_type
  {
    PAGE_ZERO,   /* All-zero page (BSS or new stack page) */
    PAGE_FILE,   /* Backed by a file segment */
    PAGE_SWAP    /* Evicted to swap partition */
  };

struct spt_entry
  {
    void *upage;              /* User virtual address (key) */
    enum page_type type;
    bool writable;

    /* PAGE_FILE fields */
    struct file *file;
    off_t file_ofs;
    uint32_t read_bytes;
    uint32_t zero_bytes;

    /* PAGE_SWAP field */
    size_t swap_slot;

    struct hash_elem hash_elem;
  };

void spt_init (struct hash *spt);
void spt_destroy (struct hash *spt);
struct spt_entry *spt_lookup (struct hash *spt, void *upage);
bool spt_insert (struct hash *spt, struct spt_entry *spte);
void spt_remove (struct hash *spt, struct spt_entry *spte);

#endif /* vm/page.h */
