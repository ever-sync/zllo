'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type RequestState = { error?: string };

export async function createRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const deviceId = String(formData.get('device_id') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const shippingType = String(formData.get('shipping_type') ?? 'levar_local');
  const address = String(formData.get('address') ?? '').trim() || null;
  const lat = Number(formData.get('lat') ?? -23.5614);
  const lng = Number(formData.get('lng') ?? -46.6559);

  if (!deviceId) return { error: 'Selecione um aparelho.' };
  if (description.length < 10) return { error: 'Descreva o problema com mais detalhes.' };
  if (shippingType !== 'levar_local' && shippingType !== 'frete') return { error: 'Tipo de atendimento inválido.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('create_repair_request', {
    p_device_id: deviceId,
    p_description: description,
    p_photos: [],
    p_shipping_type: shippingType,
    p_lat: Number.isFinite(lat) ? lat : -23.5614,
    p_lng: Number.isFinite(lng) ? lng : -46.6559,
    p_address: address ?? undefined,
  });

  if (error) return { error: error.message };

  revalidatePath('/cliente', 'layout');
  redirect('/cliente/pedidos');
}
