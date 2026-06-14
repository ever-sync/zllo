import { fetchAdminOrders } from '@/lib/cached-data';
import { formatPrice } from '@/lib/product-orders';

type Tx = {
  type: 'Produto' | 'Reparo';
  id: string;
  shop: string | null;
  client: string | null;
  value: number;
  status: string;
  at: string;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default async function AdminTransacoes() {
  const data = await fetchAdminOrders();
  const txs = (data as unknown as Tx[]) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Transações</h1>
        <p className="font-body text-sm text-g600">Reparos e vendas do marketplace — mais recentes primeiro.</p>
      </header>

      {txs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-body text-sm text-g600">Nenhuma transação ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 border-b border-line bg-g100 px-4 py-2.5 font-head text-xs font-bold uppercase tracking-wide text-g600">
            <span>Tipo</span>
            <span>Loja</span>
            <span>Cliente</span>
            <span className="text-right">Status</span>
            <span className="text-right">Valor</span>
          </div>
          {txs.map((t) => (
            <div key={t.type + t.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 border-b border-line px-4 py-3 last:border-0">
              <span className={'rounded-md px-2 py-1 font-head text-[10px] font-bold ' + (t.type === 'Produto' ? 'bg-[#EEEEFF] text-blue' : 'bg-g100 text-g600')}>
                {t.type}
              </span>
              <div className="min-w-0">
                <p className="truncate font-body text-sm text-ink">{t.shop ?? '—'}</p>
                <p className="font-body text-xs text-g400">{fmt(t.at)}</p>
              </div>
              <span className="truncate font-body text-sm text-g600">{t.client?.split(' ')[0] ?? '—'}</span>
              <span className="text-right font-body text-xs text-g600">{t.status}</span>
              <span className="text-right font-head text-sm font-bold text-ink">{formatPrice(Number(t.value))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
