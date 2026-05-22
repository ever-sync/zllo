import { createClient } from '@/lib/supabase/server';
import { DisputasAdmin, type Dispute } from './disputas-admin';

export default async function AdminDisputas() {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_disputes');

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-head text-2xl font-black text-ink">Disputas</h1>
        <p className="font-body text-sm text-g600">Medie e resolva os conflitos da plataforma.</p>
      </header>
      <DisputasAdmin initial={(data as unknown as Dispute[]) ?? []} />
    </div>
  );
}
