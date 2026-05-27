import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClienteLoginForm } from './login-form';

export default async function ClienteLoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const { data: profile } = await supabase.rpc('get_my_profile');
    redirect(profile?.role === 'assistencia' ? '/operacao' : '/cliente');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime font-head text-xl font-black text-blue">
            z
          </span>
          <span className="font-head text-2xl font-black tracking-tight text-ink">llo</span>
        </div>

        <h1 className="mb-1 font-head text-2xl font-extrabold text-ink">Área do cliente</h1>
        <p className="mb-6 font-body text-sm text-g600">
          Acompanhe assistências, pedidos e aparelhos cadastrados.
        </p>

        <ClienteLoginForm />

        <Link href="/login" className="mt-5 block text-sm font-semibold text-blue underline-offset-2 hover:underline">
          Sou assistência técnica
        </Link>
      </div>
    </main>
  );
}
