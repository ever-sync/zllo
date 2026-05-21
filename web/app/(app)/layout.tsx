import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from './sidebar';
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

  return (
    <div className="flex min-h-screen">
      <Sidebar
        shopName={shop?.name ?? profile.full_name ?? 'Minha loja'}
        isOnline={shop?.is_online ?? false}
      />
      <main className="flex-1 bg-paper">{children}</main>
    </div>
  );
}
