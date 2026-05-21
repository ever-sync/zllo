/**
 * Traduz mensagens de erro do Supabase Auth para PT-BR amigável.
 * Cobre os casos de login e de cadastro num único lugar.
 */
export function authErrorMessage(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  if (/already registered|already exists/i.test(msg)) return 'Esse e-mail já está cadastrado.';
  if (/duplicate key.*cpf|profiles_cpf_key/i.test(msg)) return 'Esse CPF já está cadastrado.';
  if (/Password should be/i.test(msg)) return 'A senha é muito curta.';
  if (/is invalid|invalid format|Unable to validate email/i.test(msg))
    return 'E-mail inválido. Use um e-mail comum (sem "+").';
  return msg;
}
