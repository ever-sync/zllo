'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ClienteLoginState = { error?: string };

export async function loginCliente(
  _prev: ClienteLoginState,
  formData: FormData,
): Promise<ClienteLoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Informe e-mail e senha.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: 'E-mail ou senha inválidos.' };
  }

  const { data: profile } = await supabase.rpc('get_my_profile');
  if (profile?.role === 'assistencia') {
    revalidatePath('/', 'layout');
    redirect('/operacao');
  }

  revalidatePath('/', 'layout');
  redirect('/cliente');
}
