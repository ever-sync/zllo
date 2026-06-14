import { createClient } from '@/lib/supabase/server';
import type { FinanceTx } from '@/lib/finance';
import { FinanceiroClient } from './financeiro-client';

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const { data: shop } = await supabase.rpc('get_my_shop');

  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Financeiro</h1>
        <p className="mt-2 font-body text-sm text-g600">Configure sua loja para ver os recebíveis.</p>
      </div>
    );
  }

  const { data: pays } = await supabase
    .from('payments')
    .select('id, amount, shop_amount, status, paid_at, created_at')
    .eq('shop_id', shop.id)
    .eq('status', 'pago');

  const { data: pords } = await supabase
    .from('product_orders')
    .select('id, total, shop_amount, status, paid_at, created_at')
    .eq('shop_id', shop.id)
    .in('status', ['pago', 'separando', 'pronto', 'concluido']);

  const txs: FinanceTx[] = [
    ...((pays ?? []) as { id: string; amount: number; shop_amount: number | null; paid_at: string | null; created_at: string }[]).map(
      (p) => ({
        id: p.id,
        kind: 'Reparo' as const,
        gross: Number(p.amount),
        share: Number(p.shop_amount ?? Number(p.amount) * 0.97),
        at: p.paid_at ?? p.created_at,
      }),
    ),
    ...((pords ?? []) as { id: string; total: number; shop_amount: number | null; paid_at: string | null; created_at: string }[]).map(
      (o) => ({
        id: o.id,
        kind: 'Produto' as const,
        gross: Number(o.total),
        share: Number(o.shop_amount ?? Number(o.total) * 0.97),
        at: o.paid_at ?? o.created_at,
      }),
    ),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <FinanceiroClient txs={txs} />
    </div>
  );
}
