import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { AccessDenied } from './access-denied';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect('/login');

  const { data: profile } = await supabase.rpc('get_my_profile');
  if (profile?.role !== 'assistencia') {
    return <AccessDenied />;
  }

  const { data: shop } = await supabase.rpc('get_my_shop');

  let orcamentos = 0;
  let ordens = 0;
  if (shop?.id) {
    const [{ count: oc }, { count: os }] = await Promise.all([
      supabase
        .from('request_targets')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .in('status', ['pendente', 'visualizado']),
      supabase
        .from('service_orders')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .not('status', 'in', '(concluida,cancelada)'),
    ]);
    orcamentos = oc ?? 0;
    ordens = os ?? 0;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        shopName={shop?.name ?? profile.full_name ?? 'Minha loja'}
        shopCity={profile.city ?? null}
        badges={{ orcamentos, ordens }}
      />
      <main className="flex min-w-0 flex-1 flex-col bg-paper">
        <TopBar
          shopName={shop?.name ?? profile.full_name ?? 'Minha loja'}
          shopId={shop?.id}
          initialOnline={shop?.is_online ?? false}
          pending={orcamentos}
          os={ordens}
        />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
