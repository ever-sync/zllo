import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientShell } from '../../client-shell';
import { ListingForm } from './listing-form';

export default async function ClienteVitrineNovoPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) redirect('/cliente/login');

  return (
    <ClientShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
        <ListingForm userId={userId} />
      </div>
    </ClientShell>
  );
}
