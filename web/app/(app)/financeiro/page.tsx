import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/product-orders';

type Tx = { id: string; kind: 'Reparo' | 'Produto'; gross: number; share: number; at: string };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

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

  const txs: Tx[] = [
    ...((pays ?? []) as { id: string; amount: number; shop_amount: number | null; paid_at: string | null; created_at: string }[]).map((p) => ({
      id: p.id,
      kind: 'Reparo' as const,
      gross: Number(p.amount),
      share: Number(p.shop_amount ?? Number(p.amount) * 0.97),
      at: p.paid_at ?? p.created_at,
    })),
    ...((pords ?? []) as { id: string; total: number; shop_amount: number | null; paid_at: string | null; created_at: string }[]).map((o) => ({
      id: o.id,
      kind: 'Produto' as const,
      gross: Number(o.total),
      share: Number(o.shop_amount ?? Number(o.total) * 0.97),
      at: o.paid_at ?? o.created_at,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const totalShare = txs.reduce((s, t) => s + t.share, 0);
  const totalGross = txs.reduce((s, t) => s + t.gross, 0);
  const totalFee = totalGross - totalShare;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Financeiro</h1>
        <p className="font-body text-sm text-g600">Recebíveis confirmados (reparos + marketplace) — 97% líquido.</p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-blue p-5">
          <p className="font-body text-xs text-white/70">Você recebeu</p>
          <p className="mt-1 font-head text-2xl font-black text-white">{formatPrice(totalShare)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="font-body text-xs text-g600">Vendas brutas</p>
          <p className="mt-1 font-head text-2xl font-black text-ink">{formatPrice(totalGross)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="font-body text-xs text-g600">Taxa zllo (3%)</p>
          <p className="mt-1 font-head text-2xl font-black text-ink">{formatPrice(totalFee)}</p>
        </div>
      </div>

      {txs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-body text-sm text-g600">Nenhum recebível confirmado ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-line bg-g100 px-4 py-2.5 font-head text-xs font-bold uppercase tracking-wide text-g600">
            <span>Origem</span>
            <span className="text-right">Bruto</span>
            <span className="text-right">Líquido</span>
          </div>
          {txs.map((t) => (
            <div key={t.kind + t.id} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-line px-4 py-3 last:border-0">
              <div>
                <p className="font-body text-sm font-bold text-ink">{t.kind}</p>
                <p className="font-body text-xs text-g600">{fmtDate(t.at)}</p>
              </div>
              <span className="self-center text-right font-body text-sm text-g600">{formatPrice(t.gross)}</span>
              <span className="self-center text-right font-head text-sm font-bold text-ink">{formatPrice(t.share)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
