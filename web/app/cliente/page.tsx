import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDeviceName, formatBRL } from '@/lib/format';
import type { RegionalRankRow } from '@/lib/ranking';
import { RegionalRanking } from '@/components/regional-ranking';
import { ClientShell } from './client-shell';

type RepairRequest = {
  id: string;
  description: string;
  shipping_type: string;
  status: string;
  created_at: string;
  expires_at: string;
  device: { nickname: string | null; brand: string | null; model: string | null } | null;
  quotes: { id: string; value: number; status: string; shop: { name: string; rating: number } | null }[];
};

type ProductOrder = {
  id: string;
  total: number;
  status: string;
  shipping_type: string;
  created_at: string;
  shop: { name: string } | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  shop: { name: string } | null;
};

export default async function ClienteHomePage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.rpc('get_my_profile');

  const [{ data: requests }, { data: productOrders }, { data: devices }, { data: products }, { data: ranking }] =
    await Promise.all([
      supabase
        .from('repair_requests')
        .select('id, description, shipping_type, status, created_at, expires_at, device:devices(nickname, brand, model), quotes:quotes!quotes_request_id_fkey(id, value, status, shop:shops(name, rating))')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('product_orders')
        .select('id, total, status, shipping_type, created_at, shop:shops(name)')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase.from('devices').select('id, nickname, brand, model').order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('id, name, price, category, shop:shops(name)')
        .eq('is_active', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase.rpc('get_regional_shop_ranking', { p_limit: 5 }),
    ]);

  const repairRows = ((requests as unknown as RepairRequest[]) ?? []);
  const orderRows = ((productOrders as unknown as ProductOrder[]) ?? []);
  const productRows = ((products as unknown as Product[]) ?? []);
  const rankRows = ((ranking as RegionalRankRow[] | null) ?? []);
  const openRequests = repairRows.filter((r) => r.status === 'aberta').length;

  return (
    <ClientShell>
    <div className="px-4 py-6 md:px-8">
      <section className="mb-[18px] flex flex-col justify-between gap-4 rounded-2xl bg-blue px-5 py-5 text-white md:flex-row md:items-center md:px-6">
        <div>
          <h1 className="font-head text-2xl font-extrabold tracking-[-0.3px]">
            Oi, {profile?.full_name?.split(' ')[0] ?? 'cliente'}
          </h1>
          <p className="mt-1 max-w-xl font-body text-[13.5px] opacity-85">
            Peça assistência técnica, compare orçamentos e acompanhe seus pedidos em um só lugar.
          </p>
        </div>
        <Link
          href="/cliente/solicitar"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-lime px-5 py-3 font-head text-xs font-extrabold uppercase tracking-[0.5px] text-ink"
        >
          Pedir assistência
        </Link>
      </section>

      <div className="mb-[18px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi label="Solicitações abertas" value={String(openRequests)} delta="aguardando resposta" />
        <Kpi label="Orçamentos" value={String(repairRows.reduce((s, r) => s + r.quotes.length, 0))} delta="recebidos" />
        <Kpi label="Aparelhos" value={String(devices?.length ?? 0)} delta="cadastrados" />
        <Kpi label="Pedidos loja" value={String(orderRows.length)} delta="marketplace" dark />
      </div>

      {rankRows.length > 0 ? (
        <div className="mb-[18px]">
          <RegionalRanking rows={rankRows} />
        </div>
      ) : null}

      <div className="grid gap-[18px] lg:grid-cols-[2fr_1fr]">
        <section className="rounded-[14px] border border-line bg-white p-4 md:p-[18px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-head text-lg font-extrabold text-ink">Assistências em andamento</h2>
            <Link href="/cliente/pedidos" className="text-sm font-semibold text-blue">
              Ver tudo
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {repairRows.length === 0 ? (
              <Empty title="Nenhuma solicitação ainda" text="Comece pedindo assistência para um aparelho cadastrado." href="/cliente/solicitar" />
            ) : (
              repairRows.map((request) => (
                <Link key={request.id} href={`/cliente/pedido/${request.id}`} className="block rounded-xl border border-line p-4 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <strong className="font-head text-[15px] text-ink">{getDeviceName(request.device)}</strong>
                    <StatusPill status={request.status} />
                  </div>
                  <p className="line-clamp-2 text-sm text-g600">{request.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-g600">
                    <span>{request.shipping_type === 'frete' ? 'Entrega/coleta' : 'Levar no local'}</span>
                    <span>•</span>
                    <span>{request.quotes.length} orçamento(s)</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-3.5">
          <section className="rounded-[14px] bg-ink p-[18px] text-white">
            <h2 className="font-head text-lg font-extrabold">Produtos próximos</h2>
            <div className="mt-4 flex flex-col gap-3">
              {productRows.length === 0 ? (
                <p className="text-sm text-g400">Nenhum produto ativo encontrado.</p>
              ) : (
                productRows.map((product) => (
                  <Link key={product.id} href={`/cliente/produto/${product.id}`} className="block rounded-xl bg-white/5 p-3 transition-opacity hover:opacity-90">
                    <div className="text-[13px] font-bold">{product.name}</div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-g400">{product.shop?.name ?? 'Loja zllo'}</span>
                      <strong className="text-lime">{formatBRL(Number(product.price))}</strong>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <Link href="/cliente/loja" className="mt-4 inline-block text-sm font-bold text-lime">
              Abrir loja
            </Link>
          </section>

          <section className="rounded-[14px] border border-line bg-white p-[18px]">
            <h2 className="font-head text-lg font-extrabold text-ink">Vitrine P2P</h2>
            <p className="mt-2 text-sm text-g600">Compre ou venda celulares usados entre usuários da zllo.</p>
            <Link href="/cliente/vitrine" className="mt-4 inline-block text-sm font-bold text-blue">
              Ver vitrine →
            </Link>
          </section>

          <section className="rounded-[14px] border border-line bg-white p-[18px]">
            <h2 className="font-head text-lg font-extrabold text-ink">Últimos pedidos</h2>
            <div className="mt-4 flex flex-col gap-3">
              {orderRows.length === 0 ? (
                <p className="text-sm text-g600">Você ainda não comprou produtos pela loja.</p>
              ) : (
                orderRows.map((order) => (
                  <Link key={order.id} href={`/cliente/pedido-produto/${order.id}`} className="block border-b border-line pb-3 last:border-0 last:pb-0 hover:opacity-80">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-ink">{order.shop?.name ?? 'Loja'}</span>
                      <strong className="font-head text-sm text-ink">{formatBRL(Number(order.total))}</strong>
                    </div>
                    <p className="mt-1 text-xs text-g600">{productStatus(order.status)}</p>
                  </Link>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
    </ClientShell>
  );
}

function Kpi({ label, value, delta, dark }: { label: string; value: string; delta: string; dark?: boolean }) {
  return (
    <div className={`rounded-xl border px-[18px] py-4 ${dark ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'}`}>
      <div className={`mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.6px] ${dark ? 'text-g400' : 'text-g600'}`}>
        {label}
      </div>
      <div className="mb-1.5 font-head text-[30px] font-extrabold leading-none tracking-[-1px]">{value}</div>
      <span className={`text-[11.5px] font-semibold ${dark ? 'text-lime' : 'text-[#16A34A]'}`}>{delta}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    aberta: { label: 'Aberta', cls: 'bg-[#DCFCE7] text-[#15803D]' },
    fechada: { label: 'Fechada', cls: 'bg-[#EEEEFF] text-blue' },
    cancelada: { label: 'Cancelada', cls: 'bg-[#FEE2E2] text-[#B91C1C]' },
    expirada: { label: 'Expirada', cls: 'bg-g100 text-g600' },
  };
  const item = meta[status] ?? { label: status, cls: 'bg-g100 text-g600' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.cls}`}>{item.label}</span>;
}

function Empty({ title, text, href }: { title: string; text: string; href?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <strong className="font-head text-base text-ink">{title}</strong>
      <p className="mx-auto mt-1 max-w-md text-sm text-g600">{text}</p>
      {href ? (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-blue">
          Começar agora →
        </Link>
      ) : null}
    </div>
  );
}

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
