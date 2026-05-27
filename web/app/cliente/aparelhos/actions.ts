'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type DeviceState = { error?: string };

export async function createDevice(_prev: DeviceState, formData: FormData): Promise<DeviceState> {
  const nickname = String(formData.get('nickname') ?? '').trim() || null;
  const brand = String(formData.get('brand') ?? '').trim();
  const model = String(formData.get('model') ?? '').trim();
  const storage = String(formData.get('storage') ?? '').trim() || null;
  const color = String(formData.get('color') ?? '').trim() || null;

  if (!brand || !model) {
    return { error: 'Informe marca e modelo.' };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const ownerId = claims?.claims?.sub;
  if (!ownerId) return { error: 'Sessão expirada. Entre novamente.' };

  const { error } = await supabase.from('devices').insert({
    owner_id: ownerId,
    nickname,
    brand,
    model,
    storage,
    color,
  });

  if (error) return { error: error.message };

  revalidatePath('/cliente', 'layout');
  redirect('/cliente/aparelhos');
}
