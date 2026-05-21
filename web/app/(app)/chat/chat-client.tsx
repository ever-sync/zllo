'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getDeviceName } from '@/lib/format';

type Msg = { id: string; body: string; created_at: string; sender_id: string };
type RawMsg = Msg & {
  request_id: string | null;
  request: { client: { full_name: string | null } | null; device: { brand: string | null; model: string | null; nickname: string | null } | null } | null;
};
type Conversation = { requestId: string; title: string; client: string; last: string; at: string };

const CONV_SELECT =
  'id, body, created_at, sender_id, request_id, request:repair_requests(client:profiles(full_name), device:devices(brand, model, nickname))';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function ChatClient({ shopId, userId }: { shopId: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select(CONV_SELECT)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    const rows = (data as unknown as RawMsg[]) ?? [];
    const seen = new Set<string>();
    const list: Conversation[] = [];
    for (const m of rows) {
      if (!m.request_id || seen.has(m.request_id)) continue;
      seen.add(m.request_id);
      list.push({
        requestId: m.request_id,
        title: getDeviceName(m.request?.device),
        client: m.request?.client?.full_name?.split(' ')[0] ?? 'Cliente',
        last: m.body,
        at: m.created_at,
      });
    }
    setConvs(list);
  }, [supabase, shopId]);

  const loadThread = useCallback(
    async (reqId: string) => {
      const { data } = await supabase
        .from('messages')
        .select('id, body, created_at, sender_id')
        .eq('shop_id', shopId)
        .eq('request_id', reqId)
        .order('created_at', { ascending: true });
      setThread((data as Msg[]) ?? []);
    },
    [supabase, shopId],
  );

  useEffect(() => {
    loadConvs();
  }, [loadConvs]);

  useEffect(() => {
    if (selected) loadThread(selected);
  }, [selected, loadThread]);

  // Realtime: novas mensagens nas conversas da loja.
  useEffect(() => {
    const ch = supabase
      .channel(`shop-${shopId}-messages`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `shop_id=eq.${shopId}` }, (payload) => {
        loadConvs();
        const m = payload.new as RawMsg;
        if (selected && m.request_id === selected) loadThread(selected);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, shopId, selected, loadConvs, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const send = async () => {
    const body = input.trim();
    if (!body || !selected) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({ request_id: selected, shop_id: shopId, sender_id: userId, body });
    setSending(false);
    if (error) {
      alert(error.message);
      return;
    }
    setInput('');
    loadThread(selected);
    loadConvs();
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-white">
      {/* Conversas */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-line">
        {convs.length === 0 ? (
          <p className="p-5 font-body text-sm text-g600">Nenhuma conversa ainda.</p>
        ) : (
          convs.map((c) => (
            <button
              key={c.requestId}
              onClick={() => setSelected(c.requestId)}
              className={
                'flex w-full flex-col gap-0.5 border-b border-line px-4 py-3 text-left transition-colors ' +
                (selected === c.requestId ? 'bg-g100' : 'hover:bg-paper')
              }
            >
              <span className="font-head text-sm font-bold text-ink">{c.client}</span>
              <span className="truncate font-body text-xs text-g600">{c.title} · {c.last}</span>
            </button>
          ))
        )}
      </aside>

      {/* Thread */}
      <section className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-body text-sm text-g600">Selecione uma conversa.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {thread.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div
                      key={m.id}
                      className={
                        'max-w-[75%] rounded-2xl px-3.5 py-2 ' +
                        (mine ? 'self-end bg-blue text-white' : 'self-start bg-g100 text-ink')
                      }
                    >
                      <p className="font-body text-sm">{m.body}</p>
                      <p className={'mt-0.5 font-body text-[10px] ' + (mine ? 'text-white/70' : 'text-g400')}>{fmtTime(m.created_at)}</p>
                    </div>
                  );
                })}
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
                    send();
                  }
                }}
                placeholder="Escreva uma mensagem…"
                className="flex-1 rounded-xl border border-line px-3.5 py-2.5 font-body text-sm text-ink outline-none focus:border-blue"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="rounded-xl bg-blue px-4 py-2.5 font-head text-sm font-bold text-white transition-opacity disabled:opacity-60"
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
