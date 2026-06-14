'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

type Msg = { id: string; body: string; created_at: string; sender_id: string };

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Thread de chat cliente ↔ assistência por request_id + shop_id. */
export function ClientChatThread({
  requestId,
  shopId,
  userId,
  shopName,
}: {
  requestId: string;
  shopId: string;
  userId: string;
  shopName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, body, created_at, sender_id')
      .eq('request_id', requestId)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });
    setMsgs((data as Msg[]) ?? []);
  }, [supabase, requestId, shopId]);

  const scheduleLoad = useDebouncedCallback(() => {
    void load();
  }, 300);

  /* eslint-disable react-hooks/set-state-in-effect -- initial fetch + realtime subscription on mount */
  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`client-chat-${requestId}-${shopId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` },
        scheduleLoad,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, requestId, shopId, load, scheduleLoad]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      request_id: requestId,
      shop_id: shopId,
      sender_id: userId,
      body,
    });
    setSending(false);
    if (error) {
      alert(error.message);
      return;
    }
    setInput('');
    await load();
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <p className="font-head text-sm font-bold text-ink">{shopName}</p>
        <p className="text-xs text-g600">Conversa sobre este pedido</p>
      </div>
      <div className="max-h-80 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {msgs.length === 0 ? (
            <p className="py-6 text-center text-sm text-g600">Nenhuma mensagem ainda. Diga olá!</p>
          ) : (
            msgs.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div
                  key={m.id}
                  className={
                    'max-w-[80%] rounded-2xl px-3.5 py-2 ' +
                    (mine ? 'self-end bg-blue text-white' : 'self-start bg-g100 text-ink')
                  }
                >
                  <p className="text-sm">{m.body}</p>
                  <p className={'mt-0.5 text-[10px] ' + (mine ? 'text-white/70' : 'text-g400')}>
                    {fmtTime(m.created_at)}
                  </p>
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
          placeholder="Escreva uma mensagem…"
          className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-blue"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="rounded-xl bg-blue px-4 py-2.5 font-head text-sm font-bold text-white disabled:opacity-60"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
