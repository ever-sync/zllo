'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

type Msg = { id: string; body: string; created_at: string; sender_id: string };

export function ListingChatClient({
  listingId,
  listingTitle,
  buyerId,
}: {
  listingId: string;
  listingTitle: string;
  buyerId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [threadBuyerId, setThreadBuyerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState('Conversa');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const load = useCallback(async () => {
    if (!userId) return;

    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .maybeSingle();
    if (!listing) return;

    const isSeller = listing.seller_id === userId;
    const resolvedBuyerId = isSeller ? buyerId ?? null : userId;
    if (!resolvedBuyerId) return;
    setThreadBuyerId(resolvedBuyerId);

    if (isSeller) {
      const { data: threads } = await supabase.rpc('list_listing_interest_threads', { p_listing_id: listingId });
      const row = ((threads as { buyer_id: string; buyer_name: string | null }[] | null) ?? []).find(
        (t) => t.buyer_id === resolvedBuyerId,
      );
      setPeerName(row?.buyer_name?.split(' ')[0] ?? 'Comprador');
    } else {
      const { data: c } = await supabase.rpc('get_listing_seller_contact', { p_listing_id: listingId });
      const row = c as { full_name?: string | null } | null;
      setPeerName(row?.full_name?.split(' ')[0] ?? 'Vendedor');
    }

    const { data: m } = await supabase
      .from('listing_messages')
      .select('id, body, created_at, sender_id')
      .eq('listing_id', listingId)
      .eq('buyer_id', resolvedBuyerId)
      .order('created_at', { ascending: true });
    setMsgs((m as Msg[]) ?? []);
  }, [supabase, listingId, buyerId, userId]);

  const scheduleLoad = useDebouncedCallback(() => {
    void load();
  }, 300);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!threadBuyerId) return;
    const ch = supabase
      .channel(`listing-chat-web-${listingId}-${threadBuyerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listing_messages',
          filter: `listing_id=eq.${listingId}`,
        },
        scheduleLoad,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, listingId, threadBuyerId, scheduleLoad]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    const body = input.trim();
    if (!body || !threadBuyerId) return;
    setSending(true);
    const { error } = await supabase.rpc('send_listing_message', {
      p_listing_id: listingId,
      p_body: body,
      p_buyer_id: threadBuyerId,
    });
    setSending(false);
    if (error) {
      alert(error.message);
      return;
    }
    setInput('');
    await load();
  };

  if (!userId) {
    return <div className="mx-auto max-w-2xl animate-pulse px-4 py-8"><div className="h-64 rounded-2xl bg-g100" /></div>;
  }

  if (!threadBuyerId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-g600">Selecione um comprador na lista de interessados.</p>
        <Link href={`/cliente/vitrine/${listingId}`} className="mt-4 inline-block text-sm font-bold text-blue">
          ← Voltar ao anúncio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <Link href={`/cliente/vitrine/${listingId}`} className="text-sm font-semibold text-blue">
        ← Anúncio
      </Link>
      <h1 className="mt-4 font-head text-xl font-extrabold text-ink">{peerName}</h1>
      <p className="text-sm text-g600">{listingTitle}</p>

      <div className="mt-4 flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
        <div className="max-h-96 flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            {msgs.length === 0 ? (
              <p className="py-6 text-center text-sm text-g600">Combine detalhes da compra por aqui.</p>
            ) : (
              msgs.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? 'bg-blue text-white' : 'border border-line bg-g100 text-ink'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>
        </div>
        <div className="flex gap-2 border-t border-line p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Digite uma mensagem..."
            className="flex-1 rounded-xl border border-line px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={sending || !input.trim()}
            onClick={() => void send()}
            className="rounded-xl bg-ink px-4 py-2 font-head text-sm font-bold text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
