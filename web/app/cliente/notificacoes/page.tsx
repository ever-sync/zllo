import { createClient } from '@/lib/supabase/server';
import { ClientShell } from '../client-shell';
import { NotificacoesClient } from './notificacoes-client';
import type { NotificationRow } from '@/lib/notifications';

export default async function ClienteNotificacoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, type, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <ClientShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
        <NotificacoesClient initial={(data as NotificationRow[] | null) ?? []} />
      </div>
    </ClientShell>
  );
}
