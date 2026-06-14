'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Thread = {
  buyer_id: string;
  buyer_name: string | null;
  interested_at: string;
  last_body: string | null;
  last_at: string | null;
};

export function ListingOwnerThreads({ listingId }: { listingId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('list_listing_interest_threads', { p_listing_id: listingId });
    setThreads((data as Thread[] | null) ?? []);
    setLoading(false);
  }, [supabase, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="mt-8 h-24 animate-pulse rounded-xl bg-g100" />;
  }

  if (threads.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-line bg-white p-4">
        <h2 className="font-head text-sm font-extrabold text-ink">Interessados</h2>
        <p className="mt-2 text-sm text-g600">Ninguém demonstrou interesse ainda.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-line bg-white p-4">
      <h2 className="font-head text-sm font-extrabold text-ink">Interessados</h2>
      <ul className="mt-3 divide-y divide-line">
        {threads.map((t) => (
          <li key={t.buyer_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{t.buyer_name ?? 'Comprador'}</p>
              {t.last_body ? (
                <p className="truncate text-xs text-g600">{t.last_body}</p>
              ) : (
                <p className="text-xs text-g400">Sem mensagens</p>
              )}
            </div>
            <Link
              href={`/cliente/vitrine/${listingId}/chat?buyerId=${encodeURIComponent(t.buyer_id)}`}
              className="shrink-0 rounded-lg bg-blue px-3 py-2 font-head text-xs font-bold text-white"
            >
              Conversar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
