import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDeviceName } from '@/lib/format';
import { ClientShell } from '../client-shell';
import { RequestForm } from './request-form';

export default async function SolicitarPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) redirect('/cliente/login');

  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from('devices').select('id, nickname, brand, model').order('created_at', { ascending: false }),
    supabase.rpc('get_my_profile'),
  ]);
  const devices = (data ?? []).map((device) => ({ id: device.id, name: getDeviceName(device) }));

  return (
    <ClientShell>
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="font-head text-2xl font-extrabold text-ink">Pedir assistência</h1>
        <p className="mt-1 text-sm text-g600">Conte o que aconteceu e envie para assistências próximas.</p>
      </div>
      <RequestForm devices={devices} userId={userId} profile={profile} />
    </div>
    </ClientShell>
  );
}
