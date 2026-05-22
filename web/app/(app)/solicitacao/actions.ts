'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type QuoteState = { error?: string };

export async function sendQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const requestId = String(formData.get('request_id') ?? '');
  const valueRaw = String(formData.get('value') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  const warranty = Math.max(0, parseInt(String(formData.get('warranty_days') ?? '0'), 10) || 0);

  const value = Number(valueRaw.replace(',', '.'));
  if (!requestId) return { error: 'Solicitação inválida.' };
  if (!value || value <= 0) return { error: 'Informe um valor válido.' };

  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');
  if (!shop) return { error: 'Loja não configurada.' };

  const { error: insErr } = await supabase
    .from('quotes')
    .insert({ request_id: requestId, shop_id: shop.id, value, description: note || null, warranty_days: warranty });

  if (insErr) {
    return {
      error: /duplicate|unique/i.test(insErr.message)
        ? 'Você já enviou um orçamento para esta solicitação.'
        : 'Não foi possível enviar o orçamento.',
    };
  }

  await supabase
    .from('request_targets')
    .update({ status: 'orcou' })
    .eq('request_id', requestId)
    .eq('shop_id', shop.id);

  revalidatePath('/operacao');
  redirect('/operacao');
}
