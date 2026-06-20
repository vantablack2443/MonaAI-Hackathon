#include "vm/page.h"
#include <string.h>
#include "threads/malloc.h"
#include "threads/vaddr.h"
#include "vm/swap.h"

static unsigned spt_hash (const struct hash_elem *e, void *aux UNUSED);
static bool spt_less (const struct hash_elem *a, const struct hash_elem *b,
                      void *aux UNUSED);
static void spt_destroy_entry (struct hash_elem *e, void *aux UNUSED);

void
spt_init (struct hash *spt)
{
  hash_init (spt, spt_hash, spt_less, NULL);
}

void
spt_destroy (struct hash *spt)
{
  hash_destroy (spt, spt_destroy_entry);
}

struct spt_entry *
spt_lookup (struct hash *spt, void *upage)
{
  struct spt_entry key;
  key.upage = upage;
  struct hash_elem *e = hash_find (spt, &key.hash_elem);
  return e ? hash_entry (e, struct spt_entry, hash_elem) : NULL;
}

bool
spt_insert (struct hash *spt, struct spt_entry *spte)
{
  return hash_insert (spt, &spte->hash_elem) == NULL;
}

void
spt_remove (struct hash *spt, struct spt_entry *spte)
{
  hash_delete (spt, &spte->hash_elem);
  free (spte);
}

static unsigned
spt_hash (const struct hash_elem *e, void *aux UNUSED)
{
  const struct spt_entry *spte = hash_entry (e, struct spt_entry, hash_elem);
  return hash_bytes (&spte->upage, sizeof spte->upage);
}

static bool
spt_less (const struct hash_elem *a, const struct hash_elem *b,
          void *aux UNUSED)
{
  const struct spt_entry *sa = hash_entry (a, struct spt_entry, hash_elem);
  const struct spt_entry *sb = hash_entry (b, struct spt_entry, hash_elem);
  return sa->upage < sb->upage;
}

static void
spt_destroy_entry (struct hash_elem *e, void *aux UNUSED)
{
  struct spt_entry *spte = hash_entry (e, struct spt_entry, hash_elem);
  if (spte->type == PAGE_SWAP)
    swap_free (spte->swap_slot);
  free (spte);
}
