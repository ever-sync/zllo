import { fetchAdminMetrics } from '@/lib/cached-data';
import { formatPrice } from '@/lib/product-orders';

type Metrics = {
  shops: number;
  shops_online: number;
  clients: number;
  requests_open: number;
  service_orders: number;
  product_orders_paid: number;
  gmv_repair: number;
  gmv_products: number;
  commission_repair: number;
  commission_products: number;
  reviews: number;
};

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'blue' | 'lime' }) {
  const cls =
    accent === 'blue'
      ? 'bg-blue text-white'
      : accent === 'lime'
        ? 'bg-lime text-ink'
        : 'bg-white text-ink border border-line';
  const sub = accent === 'blue' ? 'text-white/70' : accent === 'lime' ? 'text-ink/60' : 'text-g600';
  return (
    <div className={'rounded-2xl p-5 ' + cls}>
      <p className={'font-body text-xs ' + sub}>{label}</p>
      <p className="mt-1 font-head text-2xl font-black">{value}</p>
    </div>
  );
}

export default async function AdminOverview() {
  const data = await fetchAdminMetrics();
  const m = (data as unknown as Metrics) ?? null;

  if (!m) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-head text-2xl font-black text-ink">Visão geral</h1>
        <p className="mt-2 font-body text-sm text-g600">Não foi possível carregar as métricas.</p>
      </div>
    );
  }

  const gmv = Number(m.gmv_repair) + Number(m.gmv_products);
  const commission = Number(m.commission_repair) + Number(m.commission_products);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Visão geral</h1>
        <p className="font-body text-sm text-g600">Indicadores da plataforma zllo.</p>
      </header>

      <section className="mb-4">
        <h2 className="mb-3 font-head text-xs font-bold uppercase tracking-wide text-g600">Receita</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="GMV total" value={formatPrice(gmv)} accent="blue" />
          <Kpi label="Comissão zllo (3%)" value={formatPrice(commission)} accent="lime" />
          <Kpi label="Pedidos pagos (produtos)" value={String(m.product_orders_paid)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-head text-xs font-bold uppercase tracking-wide text-g600">Plataforma</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Lojas" value={`${m.shops_online}/${m.shops} online`} />
          <Kpi label="Clientes" value={String(m.clients)} />
          <Kpi label="Solicitações abertas" value={String(m.requests_open)} />
          <Kpi label="Ordens de serviço" value={String(m.service_orders)} />
          <Kpi label="GMV reparo" value={formatPrice(Number(m.gmv_repair))} />
          <Kpi label="GMV produtos" value={formatPrice(Number(m.gmv_products))} />
          <Kpi label="Avaliações" value={String(m.reviews)} />
        </div>
      </section>
    </div>
  );
}
