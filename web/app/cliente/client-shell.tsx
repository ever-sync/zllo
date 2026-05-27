import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientSidebar } from './client-sidebar';

export async function ClientShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect('/cliente/login');

  const { data: profile } = await supabase.rpc('get_my_profile');
  if (profile?.role === 'assistencia') redirect('/operacao');
  if (!profile) redirect('/cliente/login');

  const [{ count: requests }, { count: productOrders }, { count: devices }] = await Promise.all([
    supabase.from('repair_requests').select('id', { count: 'exact', head: true }),
    supabase.from('product_orders').select('id', { count: 'exact', head: true }),
    supabase.from('devices').select('id', { count: 'exact', head: true }),
  ]);

  const name = profile.full_name ?? 'Cliente';

  return (
    <div className="flex min-h-screen bg-paper">
      <ClientSidebar
        name={name}
        email={profile.email}
        badges={{ requests: requests ?? 0, productOrders: productOrders ?? 0, devices: devices ?? 0 }}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/cliente" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime font-head text-xl font-black text-blue">
                z
              </span>
              <span className="font-head text-xl font-black text-ink">llo</span>
            </Link>
            <Link href="/cliente/solicitar" className="rounded-lg bg-blue px-3 py-2 font-head text-xs font-bold text-white">
              Pedir assistência
            </Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
