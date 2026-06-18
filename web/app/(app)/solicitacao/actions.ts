'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type QuoteState = { error?: string };

/** "1.234,56" / "1234,56" → 1234.56 */
function parseBRL(raw: string): number {
  const cleaned = raw.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  return Number(cleaned);
}

export async function sendQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const requestId = String(formData.get('request_id') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  const warranty = Math.max(0, parseInt(String(formData.get('warranty_days') ?? '0'), 10) || 0);

  const valueMin = parseBRL(String(formData.get('value_min') ?? ''));
  const valueMax = parseBRL(String(formData.get('value_max') ?? ''));
  if (!requestId) return { error: 'Solicitação inválida.' };
  if (!valueMin || valueMin <= 0 || !valueMax || valueMax <= 0) {
    return { error: 'Informe os valores mínimo e máximo.' };
  }
  if (valueMax < valueMin) {
    return { error: 'O valor máximo não pode ser menor que o mínimo.' };
  }

  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');
  if (!shop) return { error: 'Loja não configurada.' };

  const { error: insErr } = await supabase
    .from('quotes')
    .insert({
      request_id: requestId,
      shop_id: shop.id,
      value: valueMin,
      value_min: valueMin,
      value_max: valueMax,
      description: note || null,
      warranty_days: warranty,
    });

  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message)) {
      return { error: 'Você já enviou um orçamento para esta solicitação.' };
    }
    // Regras de negócio do banco (ex.: wallet Asaas obrigatória) chegam como
    // mensagem de exceção — repassamos para o lojista saber o que fazer.
    if (/asaas|wallet|configur/i.test(insErr.message)) {
      return { error: insErr.message };
    }
    return { error: insErr.message || 'Não foi possível enviar o orçamento.' };
  }

  await supabase
    .from('request_targets')
    .update({ status: 'orcou' })
    .eq('request_id', requestId)
    .eq('shop_id', shop.id);

  revalidatePath('/operacao');
  redirect('/operacao');
}
