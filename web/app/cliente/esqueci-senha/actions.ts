'use server';

export type ResetState = { error?: string; success?: string };

export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Informe seu e-mail.' };

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: 'Não foi possível enviar o e-mail. Tente novamente.' };
  return { success: 'Enviamos um link de recuperação para o seu e-mail.' };
}
