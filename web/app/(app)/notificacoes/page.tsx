import { createClient } from '@/lib/supabase/server';
import type { NotificationRow } from '@/lib/notifications';
import { ShopNotificacoesClient } from './notificacoes-client';

export default async function ShopNotificacoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, type, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <ShopNotificacoesClient initial={(data as NotificationRow[] | null) ?? []} />
    </div>
  );
}
