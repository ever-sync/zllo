'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { getDeviceName } from '@/lib/format';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';
import { formatPrice } from '@/lib/product-orders';
import { nextStep, statusLabel } from '@/lib/order-status';

type SOStatus = Database['public']['Enums']['service_order_status'];

export type ServiceOrder = {
  id: string;
  status: string;
  value: number;
  created_at: string;
  device: { brand: string | null; model: string | null; nickname: string | null } | null;
  client: { full_name: string | null } | null;
};

const SELECT =
  'id, status, value, created_at, device:devices(brand, model, nickname), client:profiles(full_name)';

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'ativas', label: 'Ativas', match: (s) => s !== 'concluida' && s !== 'cancelada' },
  { key: 'concluida', label: 'Concluídas', match: (s) => s === 'concluida' },
  { key: 'cancelada', label: 'Canceladas', match: (s) => s === 'cancelada' },
  { key: 'todas', label: 'Todas', match: () => true },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function OrdensClient({ shopId, initial }: { shopId: string; initial: ServiceOrder[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<ServiceOrder[]>(initial);
  const [filter, setFilter] = useState('ativas');
  const [busy, setBusy] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('service_orders')
      .select(SELECT)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setOrders((data as unknown as ServiceOrder[]) ?? []);
  }, [supabase, shopId]);

  const scheduleRefetch = useDebouncedCallback(() => {
    void refetch();
  }, 400);

  useEffect(() => {
    const ch = supabase
      .channel(`shop-${shopId}-orders`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders', filter: `shop_id=eq.${shopId}` }, scheduleRefetch)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, shopId, scheduleRefetch]);

  const advance = async (id: string, status: SOStatus, note?: string) => {
    setBusy(id);
    const { error } = await supabase.rpc('advance_service_order', { p_order_id: id, p_status: status, p_note: note });
    setBusy(null);
    if (error) {
      alert(error.message);
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
          <p className="font-body text-sm text-g600">Nenhuma ordem neste filtro.</p>
          {filter === 'ativas' ? (
            <Link href="/orcamentos" className="mt-4 inline-block font-head text-sm font-bold text-blue">
              Ver orçamentos enviados →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((o) => {
            const next = nextStep(o.status);
            const terminal = o.status === 'concluida' || o.status === 'cancelada';
            return (
              <div key={o.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-head text-sm font-bold text-ink">{getDeviceName(o.device)}</p>
                    <p className="font-body text-xs text-g600">
                      {o.client?.full_name?.split(' ')[0] ?? 'Cliente'} · {fmtDate(o.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#EEEEFF] px-2 py-1 font-head text-xs font-bold text-blue">
                    {statusLabel(o.status)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-head text-base font-black text-ink">{formatPrice(o.value)}</span>
                  {!terminal && (
                    <div className="flex gap-2">
                      {next ? (
                        <button
                          onClick={() => advance(o.id, next.key as SOStatus)}
                          disabled={busy === o.id}
                          className="rounded-lg bg-blue px-3 py-2 font-head text-xs font-bold text-white transition-opacity disabled:opacity-60"
                        >
                          {next.label} →
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          if (confirm('Cancelar esta ordem?')) advance(o.id, 'cancelada' as SOStatus);
                        }}
                        disabled={busy === o.id}
                        className="rounded-lg border border-line px-3 py-2 font-head text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
