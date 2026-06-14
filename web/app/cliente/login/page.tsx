import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
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
    <AuthShell
      variant="client"
      title="Área do cliente"
      subtitle="Acompanhe assistências, pedidos de produtos e aparelhos cadastrados."
      footer={
        <Link href="/login" className="text-sm font-semibold text-blue underline-offset-2 hover:underline">
          Sou assistência técnica
        </Link>
      }
    >
      <ClienteLoginForm />
    </AuthShell>
  );
}
