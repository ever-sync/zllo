import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../(app)/actions';
import { AdminSidebar } from './sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect('/login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 font-head text-xl font-extrabold text-ink">Acesso restrito</h1>
          <p className="mb-6 font-body text-sm text-g600">
            Esta área é exclusiva da administração da zllo.
          </p>
          <form action={signOut}>
            <button type="submit" className="rounded-xl bg-blue px-4 py-2.5 font-head font-bold text-white">
              Sair
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 bg-paper">{children}</main>
    </div>
  );
}
