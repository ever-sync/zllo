'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ListingInterestPanel({ listingId }: { listingId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [contact, setContact] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const { error: rpcErr } = await supabase.rpc('express_listing_interest', {
      p_listing_id: listingId,
      p_message: message.trim() || null,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setBusy(false);
      return;
    }
    setDone(true);
    const { data: c } = await supabase.rpc('get_listing_seller_contact', { p_listing_id: listingId });
    if (c && typeof c === 'object') setContact(c as { full_name: string | null; phone: string | null });
    setBusy(false);
  };

  if (done && contact) {
    return (
      <div className="mt-8 rounded-xl border border-line bg-white p-4">
        <h2 className="font-head text-sm font-extrabold text-ink">Contato do vendedor</h2>
        <p className="mt-2 text-sm font-semibold text-ink">{contact.full_name ?? 'Vendedor'}</p>
        {contact.phone ? (
          <a href={`tel:${contact.phone}`} className="mt-1 inline-block text-base font-bold text-blue">
            {contact.phone}
          </a>
        ) : null}
        <Link
          href={`/cliente/vitrine/${listingId}/chat`}
          className="mt-4 inline-flex rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white"
        >
          Conversar
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-line bg-white p-4">
      <h2 className="font-head text-sm font-extrabold text-ink">Interessado?</h2>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Olá, ainda está disponível?"
        className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm"
        rows={3}
      />
      {error ? <p className="mt-2 text-sm text-[#B91C1C]">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-3 rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Enviando…' : 'Tenho interesse'}
      </button>
    </div>
  );
}
