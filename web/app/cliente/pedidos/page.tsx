import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDeviceName, formatBRL } from '@/lib/format';
import { statusLabel } from '@/lib/order-status';
import { ClientShell } from '../client-shell';

type RepairRequest = {
  id: string;
  description: string;
  shipping_type: string;
  status: string;
  created_at: string;
  device: { nickname: string | null; brand: string | null; model: string | null } | null;
  quotes: {
    id: string;
    value: number;
    description: string | null;
    status: string;
    shop: { name: string; rating: number } | null;
  }[];
};

type ServiceOrder = {
  id: string;
  request_id: string;
  status: string;
  value: number;
  created_at: string;
  shop: { name: string } | null;
  device: { nickname: string | null; brand: string | null; model: string | null } | null;
};

type ProductOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  shop: { name: string } | null;
};

function productStatus(status: string) {
  const labels: Record<string, string> = {
    aguardando_pagamento: 'Aguardando pagamento',
    pago: 'Pago',
    separando: 'Separando',
    pronto: 'Pronto para retirada',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };
  return labels[status] ?? status;
}

export default async function ClientePedidosPage() {
  const supabase = await createClient();
  const [{ data: requests }, { data: orders }, { data: productOrders }] = await Promise.all([
    supabase
      .from('repair_requests')
      .select('id, description, shipping_type, status, created_at, device:devices(nickname, brand, model), quotes:quotes!quotes_request_id_fkey(id, value, description, status, shop:shops(name, rating))')
      .order('created_at', { ascending: false }),
    supabase
      .from('service_orders')
      .select('id, request_id, status, value, created_at, shop:shops(name), device:devices(nickname, brand, model)')
      .order('created_at', { ascending: false }),
    supabase
      .from('product_orders')
      .select('id, total, status, created_at, shop:shops(name)')
      .order('created_at', { ascending: false }),
  ]);

  const requestRows = (requests as unknown as RepairRequest[] | null) ?? [];
  const orderRows = (orders as unknown as ServiceOrder[] | null) ?? [];
  const productRows = (productOrders as unknown as ProductOrder[] | null) ?? [];

  return (
    <ClientShell>
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-ink">Pedidos</h1>
          <p className="mt-1 text-sm text-g600">Reparos, ordens de serviço e compras na loja.</p>
        </div>
        <Link href="/cliente/solicitar" className="rounded-full bg-blue px-4 py-2 text-sm font-bold text-white">
          Pedir assistência
        </Link>
      </div>

      <section className="rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
        <h2 className="font-head text-lg font-extrabold text-ink">Compras na loja</h2>
        <div className="mt-4 flex flex-col gap-3">
          {productRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center">
              <p className="text-sm text-g600">Nenhuma compra ainda.</p>
              <Link href="/cliente/loja" className="mt-3 inline-block text-sm font-semibold text-blue">
                Abrir loja →
              </Link>
            </div>
          ) : (
            productRows.map((order) => (
              <Link
                key={order.id}
                href={`/cliente/pedido-produto/${order.id}`}
                className="block rounded-xl border border-line p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-head text-base text-ink">{order.shop?.name ?? 'Loja'}</strong>
                  <span className="rounded-full bg-g100 px-2.5 py-1 text-xs font-bold text-g600">
                    {productStatus(order.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{formatBRL(Number(order.total))}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
        <h2 className="font-head text-lg font-extrabold text-ink">Ordens de serviço</h2>
        <div className="mt-4 flex flex-col gap-3">
          {orderRows.length === 0 ? (
            <p className="text-sm text-g600">Nenhuma ordem aberta ainda.</p>
          ) : (
            orderRows.map((order) => (
              <Link
                key={order.id}
                href={`/cliente/pedido/${order.request_id}`}
                className="block rounded-xl border border-line p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-head text-base text-ink">{getDeviceName(order.device)}</strong>
                  <span className="rounded-full bg-[#EEEEFF] px-2.5 py-1 text-xs font-bold text-blue">
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-g600">
                  <span>{order.shop?.name ?? 'Assistência'}</span>
                  <span>•</span>
                  <strong className="text-ink">{formatBRL(Number(order.value))}</strong>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
        <h2 className="font-head text-lg font-extrabold text-ink">Solicitações e orçamentos</h2>
        <div className="mt-4 flex flex-col gap-3">
          {requestRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center">
              <p className="text-sm text-g600">Nenhuma solicitação enviada ainda.</p>
              <Link href="/cliente/solicitar" className="mt-3 inline-block text-sm font-semibold text-blue">
                Pedir assistência →
              </Link>
            </div>
          ) : (
            requestRows.map((request) => (
              <Link
                key={request.id}
                href={`/cliente/pedido/${request.id}`}
                className="block rounded-xl border border-line p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-head text-base text-ink">{getDeviceName(request.device)}</strong>
                  <RequestPill status={request.status} />
                </div>
                <p className="text-sm text-g600">{request.description}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {request.quotes.length === 0 ? (
                    <p className="text-sm text-g600">Aguardando orçamentos das assistências próximas.</p>
                  ) : (
                    request.quotes.map((quote) => (
                      <div key={quote.id} className="rounded-lg bg-g100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{quote.shop?.name ?? 'Assistência'}</span>
                          <strong className="font-head text-sm text-blue">{formatBRL(Number(quote.value))}</strong>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-g600">{quote.description || 'Orçamento enviado.'}</p>
                      </div>
                    ))
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
    </ClientShell>
  );
}

function RequestPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    aberta: { label: 'Aberta', cls: 'bg-[#DCFCE7] text-[#15803D]' },
    fechada: { label: 'Fechada', cls: 'bg-[#EEEEFF] text-blue' },
    cancelada: { label: 'Cancelada', cls: 'bg-[#FEE2E2] text-[#B91C1C]' },
    expirada: { label: 'Expirada', cls: 'bg-g100 text-g600' },
  };
  const item = meta[status] ?? { label: status, cls: 'bg-g100 text-g600' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.cls}`}>{item.label}</span>;
}
