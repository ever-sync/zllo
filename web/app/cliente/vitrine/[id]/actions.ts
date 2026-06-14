'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function deleteListing(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  const { data: listing } = await supabase.from('listings').select('seller_id').eq('id', id).maybeSingle();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  if (!listing || listing.seller_id !== userId) return;

  await supabase.from('listings').delete().eq('id', id);
  revalidatePath('/cliente/vitrine');
  redirect('/cliente/vitrine');
}
