'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TARGET_SELECT, type FeedItem } from '@/lib/feed';
import { getDeviceName } from '@/lib/format';
import { distanceLabel, timeLeft } from '@/lib/time';
import { useNow } from '@/lib/use-now';

/** Beep curto para avisar de pedido novo (pode ser bloqueado até o 1º clique). */
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch {
    // sem áudio disponível — segue só com o aviso visual
  }
}

export function OperacaoBoard({ shopId, initial }: { shopId: string; initial: FeedItem[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<FeedItem[]>(initial);
  const now = useNow(1000);
  const seen = useRef<Set<string>>(new Set(initial.map((i) => i.id)));

  const fetchFeed = useCallback(async () => {
    const { data } = await supabase
      .from('request_targets')
      .select(TARGET_SELECT)
      .eq('shop_id', shopId)
      .order('notified_at', { ascending: false });
    setItems((data as unknown as FeedItem[]) ?? []);
  }, [supabase, shopId]);

  useEffect(() => {
    const channel = supabase
      .channel(`shop-${shopId}-targets`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'request_targets', filter: `shop_id=eq.${shopId}` },
        () => fetchFeed(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, shopId, fetchFeed]);

  useEffect(() => {
    let isNew = false;
    for (const it of items) {
      if (it.request?.status === 'aberta' && it.status !== 'orcou' && !seen.current.has(it.id)) {
        isNew = true;
      }
      seen.current.add(it.id);
    }
    if (isNew) beep();
  }, [items]);

  const chegando = items.filter((it) => it.request?.status === 'aberta' && it.status !== 'orcou');

  return (
    <div className="rounded-[14px] border border-line bg-white p-[18px]">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-head text-[15px] font-extrabold text-ink">
          Orçamentos Pendentes
          <span className="rounded-[10px] bg-blue px-2 py-0.5 font-head text-[11px] font-bold text-white">
            {chegando.length}
          </span>
        </div>
        <Link href="/orcamentos" className="shrink-0 font-head text-[12.5px] font-bold text-blue">
          Ver todos →
        </Link>
      </div>

      {chegando.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center font-body text-sm text-g600">
          Nenhuma solicitação no momento. Elas aparecem aqui automaticamente.
        </p>
      ) : (
        chegando.map((it) => {
          const t = timeLeft(it.responds_by, now);
          const name = getDeviceName(it.request!.device);
          const client = it.request!.client?.full_name?.split(' ')[0] ?? 'Cliente';
          return (
            <Link
              key={it.id}
              href={`/solicitacao/${it.request!.id}`}
              className="mb-2.5 flex items-center gap-3 rounded-xl border border-line p-3.5 transition-shadow last:mb-0 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-g100 text-xl">
                📱
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-bold text-ink">{name}</p>
                <p className="line-clamp-2 font-body text-xs text-g600">{it.request!.description}</p>
                <div className="mt-1 flex flex-wrap gap-3 font-body text-[11px] text-g600">
                  <span>📍 {distanceLabel(it.distance_m)}</span>
                  <span>👤 {client}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span
                  className={
                    'whitespace-nowrap rounded-md px-2 py-1 font-head text-[11px] font-bold ' +
                    (t.urgent ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF3C7] text-[#B45309]')
                  }
                >
                  ⏱ {t.label}
                </span>
                <span className="whitespace-nowrap rounded-lg bg-ink px-3.5 py-2 font-head text-[11.5px] font-bold uppercase tracking-[0.4px] text-white">
                  Responder
                </span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
