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

  // Realtime: qualquer mudança nos meus targets recarrega o feed.
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

  // Avisa quando chega um pedido que ainda não tínhamos visto.
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

  const open = items.filter((it) => it.request?.status === 'aberta');
  const chegando = open.filter((it) => it.status !== 'orcou');
  const aguardando = open.filter((it) => it.status === 'orcou');

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 font-head text-xs font-bold uppercase tracking-wide text-g600">
          Chegando agora · {chegando.length}
        </h2>
        {chegando.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
            <p className="font-body text-sm text-g600">
              Nenhuma solicitação no momento. Elas aparecem aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {chegando.map((it) => {
              const t = timeLeft(it.responds_by, now);
              const name = getDeviceName(it.request!.device);
              const client = it.request!.client?.full_name?.split(' ')[0] ?? 'Cliente';
              return (
                <Link
                  key={it.id}
                  href={`/solicitacao/${it.request!.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-g100 text-xl">
                      📱
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-head text-base font-bold text-ink">{name}</p>
                      <p className="line-clamp-2 font-body text-xs text-g600">
                        {it.request!.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 font-body text-xs text-g600">
                      <span>📍 {distanceLabel(it.distance_m)}</span>
                      <span>👤 {client}</span>
                      <span>🖼 {it.request!.photos?.length ?? 0}</span>
                    </div>
                    <span
                      className={
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 font-head text-xs font-bold ' +
                        (t.urgent ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF3C7] text-[#B45309]')
                      }
                    >
                      ⏱ {t.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {aguardando.length > 0 ? (
        <section>
          <h2 className="mb-3 font-head text-xs font-bold uppercase tracking-wide text-g600">
            Orçados · aguardando cliente · {aguardando.length}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {aguardando.map((it) => {
              const name = getDeviceName(it.request!.device);
              return (
                <Link
                  key={it.id}
                  href={`/solicitacao/${it.request!.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 opacity-90 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-g100 text-lg">
                    📱
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-bold text-ink">{name}</p>
                    <p className="font-body text-xs text-[#15803D]">Orçado ✓</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
