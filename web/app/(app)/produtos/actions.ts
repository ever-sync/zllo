'use server';

import { updateTag } from 'next/cache';
import { CACHE_TAG_CATALOG } from '@/lib/cache-tags';

/** Invalida o cache do catálogo público após mutações de produto pela loja. */
export async function invalidateProductCatalog() {
  updateTag(CACHE_TAG_CATALOG);
}
