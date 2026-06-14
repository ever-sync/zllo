import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { CACHE_TAG_ADMIN, CACHE_TAG_CATALOG } from '@/lib/cache-tags';

const ALLOWED = new Set([CACHE_TAG_ADMIN, CACHE_TAG_CATALOG]);

/** Invalidação on-demand do cache (chamada pelo webhook Asaas após pagamento). */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  }

  const tag = req.nextUrl.searchParams.get('tag');
  if (!tag || !ALLOWED.has(tag)) {
    return NextResponse.json({ error: 'invalid tag' }, { status: 400 });
  }

  revalidateTag(tag, 'max');
  return NextResponse.json({ revalidated: tag });
}
