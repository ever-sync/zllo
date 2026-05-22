import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const { data: isAdmin } = await supabase.rpc('is_admin');
    redirect(isAdmin ? '/admin' : '/operacao');
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

        <h1 className="mb-1 font-head text-2xl font-extrabold text-ink">Console da loja</h1>
        <p className="mb-6 font-body text-sm text-g600">Acesse para gerenciar pedidos e ordens.</p>

        <LoginForm />
      </div>
    </main>
  );
}
