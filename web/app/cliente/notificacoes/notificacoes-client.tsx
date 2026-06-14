'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fmtNotificationTime, notificationHref, type NotificationRow } from '@/lib/notifications';

export function NotificacoesClient({ initial }: { initial: NotificationRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState(initial);

  const markAllRead = useCallback(async () => {
    await supabase.rpc('mark_all_notifications_read');
    setRows((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    router.refresh();
  }, [supabase, router]);

  const onOpen = async (n: NotificationRow) => {
    if (!n.read_at) {
      await supabase.rpc('mark_notification_read', { p_id: n.id });
      setRows((prev) => prev.map((row) => (row.id === n.id ? { ...row, read_at: new Date().toISOString() } : row)));
    }
    const href = notificationHref(n);
    if (href) router.push(href);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-ink">Notificações</h1>
          <p className="mt-1 text-sm text-g600">Orçamentos, mensagens e atualizações dos seus pedidos.</p>
        </div>
        {rows.some((n) => !n.read_at) ? (
          <button type="button" onClick={() => void markAllRead()} className="text-sm font-semibold text-blue">
            Marcar todas como lidas
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center">
          <h2 className="font-head text-lg font-extrabold text-ink">Nenhuma notificação</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-g600">
            Quando receber orçamentos ou mensagens, elas aparecerão aqui.
          </p>
          <Link href="/cliente" className="mt-5 inline-flex text-sm font-semibold text-blue">
            Voltar ao início
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((n) => {
            const href = notificationHref(n);
            const unread = !n.read_at;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => void onOpen(n)}
                disabled={!href}
                className={
                  'rounded-[14px] border p-4 text-left transition-shadow ' +
                  (unread ? 'border-blue/30 bg-[#F0F4FF]' : 'border-line bg-white hover:shadow-sm') +
                  (!href ? ' cursor-default' : '')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <strong className="font-head text-[15px] text-ink">{n.title}</strong>
                  <span className="shrink-0 text-xs text-g600">{fmtNotificationTime(n.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-g600">{n.body}</p>
                {href ? <span className="mt-2 inline-block text-xs font-semibold text-blue">Abrir →</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
