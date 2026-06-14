import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
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
  webhook_issues_24h?: number;
  disputes_open?: number;
};

type WebhookEvent = {
  id: string;
  event: string;
  provider_payment_id: string | null;
  outcome: string;
  created_at: string;
  details: Record<string, unknown> | null;
};

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'blue' | 'lime' | 'warn' }) {
  const cls =
    accent === 'blue'
      ? 'bg-blue text-white'
      : accent === 'lime'
        ? 'bg-lime text-ink'
        : accent === 'warn'
          ? 'border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
          : 'bg-white text-ink border border-line';
  const sub =
    accent === 'blue' ? 'text-white/70' : accent === 'lime' ? 'text-ink/60' : accent === 'warn' ? 'text-[#991B1B]' : 'text-g600';
  return (
    <div className={'rounded-2xl p-5 ' + cls}>
      <p className={'font-body text-xs ' + sub}>{label}</p>
      <p className="mt-1 font-head text-2xl font-black">{value}</p>
    </div>
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default async function AdminOverview() {
  const supabase = await createClient();
  const [data, { data: webhookData }] = await Promise.all([
    fetchAdminMetrics(),
    supabase.rpc('admin_webhook_events', { p_problems_only: true }),
  ]);
  const m = (data as unknown as Metrics) ?? null;
  const webhooks = (webhookData as unknown as WebhookEvent[]) ?? [];

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
  const webhookIssues = Number(m.webhook_issues_24h ?? 0);
  const disputesOpen = Number(m.disputes_open ?? 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Visão geral</h1>
        <p className="font-body text-sm text-g600">Indicadores da plataforma zllo.</p>
      </header>

      {(webhookIssues > 0 || disputesOpen > 0) ? (
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {webhookIssues > 0 ? (
            <Kpi label="Alertas webhook (24h)" value={String(webhookIssues)} accent="warn" />
          ) : null}
          {disputesOpen > 0 ? (
            <Link href="/admin/disputas" className="block">
              <Kpi label="Disputas abertas" value={String(disputesOpen)} accent="warn" />
            </Link>
          ) : null}
        </section>
      ) : null}

      {webhooks.length > 0 ? (
        <section className="mb-6 overflow-hidden rounded-2xl border border-[#FECACA] bg-white">
          <div className="border-b border-line bg-[#FEF2F2] px-4 py-3">
            <h2 className="font-head text-sm font-bold text-[#B91C1C]">Webhook Pix — problemas recentes</h2>
          </div>
          {webhooks.slice(0, 8).map((w) => (
            <div key={w.id} className="border-b border-line px-4 py-2.5 last:border-0">
              <p className="font-body text-xs text-ink">
                <span className="font-bold">{w.outcome}</span> · {w.event} · {fmt(w.created_at)}
              </p>
              <p className="font-body text-[11px] text-g600">
                {w.provider_payment_id ?? '—'}
                {w.details?.error ? ` · ${String(w.details.error)}` : ''}
              </p>
            </div>
          ))}
          <div className="px-4 py-2">
            <Link href="/admin/transacoes" className="font-body text-xs font-semibold text-blue">
              Ver conciliação de pagamentos →
            </Link>
          </div>
        </section>
      ) : null}

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
