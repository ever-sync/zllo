'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
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

  // Console é exclusivo da assistência. Cliente não entra aqui.
  const { data: profile } = await supabase.rpc('get_my_profile');
  if (profile?.role !== 'assistencia') {
    await supabase.auth.signOut();
    return { error: 'Este console é exclusivo para assistências.' };
  }

  revalidatePath('/', 'layout');
  redirect('/operacao');
}
