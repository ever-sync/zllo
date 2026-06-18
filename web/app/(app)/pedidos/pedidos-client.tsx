'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import {
  NEXT_ACTION,
  SHOP_ORDER_SELECT,
  STATUS_META,
  formatPrice,
  type ShopOrder,
} from '@/lib/product-orders';
import { dispatchUberDelivery } from '@/lib/uber-quote';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

type POStatus = Database['public']['Enums']['product_order_status'];
type UberRow = { ref_id: string; status: string; tracking_url: string | null };

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'ativos', label: 'Ativos', match: (s) => ['pago', 'separando', 'pronto'].includes(s) },
  { key: 'pago', label: 'A separar', match: (s) => s === 'pago' },
  { key: 'separando', label: 'Separando', match: (s) => s === 'separando' },
  { key: 'pronto', label: 'Prontos', match: (s) => s === 'pronto' },
  { key: 'concluido', label: 'Concluídos', match: (s) => s === 'concluido' },
  { key: 'todos', label: 'Todos', match: () => true },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function PedidosClient({ shopId, initial }: { shopId: string; initial: ShopOrder[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<ShopOrder[]>(initial);
  const [uberByOrder, setUberByOrder] = useState<Record<string, UberRow>>({});
  const [filter, setFilter] = useState('ativos');
  const [busy, setBusy] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('product_orders')
      .select(SHOP_ORDER_SELECT)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setOrders((data as unknown as ShopOrder[]) ?? []);

    const { data: uberRows } = await supabase
      .from('uber_deliveries')
      .select('ref_id, status, tracking_url')
      .eq('kind', 'product_order');
    const map: Record<string, UberRow> = {};
    (uberRows ?? []).forEach((u: UberRow) => {
      map[u.ref_id] = u;
    });
    setUberByOrder(map);
  }, [supabase, shopId]);

  const scheduleRefetch = useDebouncedCallback(() => {
    void refetch();
  }, 400);

  useEffect(() => {
    const ch = supabase
      .channel(`shop-${shopId}-porders`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_orders', filter: `shop_id=eq.${shopId}` }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uber_deliveries' }, scheduleRefetch)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, shopId, scheduleRefetch]);

  const advance = async (id: string, status: POStatus) => {
    setBusy(id);
    const { error } = await supabase.rpc('advance_product_order', { p_order_id: id, p_status: status });
    setBusy(null);
    if (error) {
      alert(error.message);
      return;
    }
    await refetch();
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancelar este pedido?')) return;
    setBusy(id);
    const { error } = await supabase.rpc('advance_product_order', { p_order_id: id, p_status: 'cancelado' });
    setBusy(null);
    if (error) {
      alert(error.message);
      return;
    }
    await refetch();
  };

  const callUber = async (id: string) => {
    setBusy(id);
    const res = await dispatchUberDelivery(id);
    setBusy(null);
    if (!res.ok) {
      alert(res.error ?? 'Não foi possível chamar a Uber');
      return;
    }
    await refetch();
  };

  const active = FILTERS.find((f) => f.key === filter)!;
  const list = orders.filter((o) => active.match(o.status));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = orders.filter((o) => f.match(o.status)).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                'rounded-full border px-3.5 py-1.5 font-head text-xs font-bold transition-colors ' +
                (filter === f.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-g100')
              }
            >
              {f.label} {n > 0 ? `· ${n}` : ''}
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-body text-sm text-g600">Nenhum pedido neste filtro.</p>
          {filter === 'ativos' || filter === 'todos' ? (
            <Link href="/produtos" className="mt-4 inline-block font-head text-sm font-bold text-blue">
              Cadastrar produtos →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((o) => {
            const meta = STATUS_META[o.status] ?? { label: o.status, cls: 'bg-g100 text-g600' };
            const next = NEXT_ACTION[o.status];
            const canCancel = ['pago', 'separando', 'pronto'].includes(o.status);
            const uber = uberByOrder[o.id];
            const canUber =
              o.shipping_type === 'entrega' &&
              o.delivery_provider === 'uber_direct' &&
              ['pago', 'separando', 'pronto'].includes(o.status) &&
              (!uber || ['canceled', 'failed', 'delivered'].includes(uber.status));
            return (
              <div key={o.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-head text-sm font-bold text-ink">
                      {o.client?.full_name?.split(' ')[0] ?? 'Cliente'} · #{o.id.slice(0, 8)}
                    </p>
                    <p className="font-body text-xs text-g600">{fmtDate(o.created_at)}</p>
                  </div>
                  <span className={'shrink-0 rounded-md px-2 py-1 font-head text-xs font-bold ' + meta.cls}>
                    {meta.label}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                  {o.items?.map((it) => (
                    <div key={it.id} className="flex justify-between font-body text-sm">
                      <span className="text-ink">{it.qty}x {it.name}</span>
                      <span className="text-g600">{formatPrice(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-body text-xs text-g600">
                    {o.shipping_type === 'entrega' ? `🛵 ${o.address ?? 'Entrega'}` : '🏪 Retirar na loja'}
                  </span>
                  <span className="font-head text-base font-black text-ink">{formatPrice(o.total)}</span>
                </div>

                {(next || canCancel || canUber || uber?.tracking_url) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canUber ? (
                      <button
                        onClick={() => callUber(o.id)}
                        disabled={busy === o.id}
                        className="flex-1 rounded-lg bg-blue px-3 py-2 font-head text-xs font-bold text-white transition-opacity disabled:opacity-60"
                      >
                        {busy === o.id ? '…' : 'Chamar Uber'}
                      </button>
                    ) : null}
                    {uber?.tracking_url ? (
                      <a
                        href={uber.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-line px-3 py-2 font-head text-xs font-bold text-ink hover:bg-g100"
                      >
                        Rastrear
                      </a>
                    ) : null}
                    {next ? (
                      <button
                        onClick={() => advance(o.id, next.status as POStatus)}
                        disabled={busy === o.id}
                        className="flex-1 rounded-lg bg-blue px-3 py-2 font-head text-xs font-bold text-white transition-opacity disabled:opacity-60"
                      >
                        {next.label}
                      </button>
                    ) : null}
                    {canCancel ? (
                      <button
                        onClick={() => cancel(o.id)}
                        disabled={busy === o.id}
                        className="rounded-lg border border-line px-3 py-2 font-head text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
