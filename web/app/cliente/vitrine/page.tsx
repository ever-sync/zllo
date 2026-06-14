import { createClient } from '@/lib/supabase/server';
import { ClientShell } from '../client-shell';
import { VitrineList } from './vitrine-list';

export default async function ClienteVitrinePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: listings } = await supabase
    .from('listings')
    .select('id, seller_id, title, brand, model, price, photos, city, created_at')
    .order('created_at', { ascending: false });

  return (
    <ClientShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
        <VitrineList listings={listings ?? []} userId={userId ?? ''} />
      </div>
    </ClientShell>
  );
}
