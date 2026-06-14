import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
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
    <AuthShell
      variant="shop"
      title="Console da loja"
      subtitle="Acesse para gerenciar orçamentos, ordens de serviço e vendas."
      footer={
        <Link href="/cliente/login" className="text-sm font-semibold text-blue underline-offset-2 hover:underline">
          Sou cliente — entrar no portal
        </Link>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
