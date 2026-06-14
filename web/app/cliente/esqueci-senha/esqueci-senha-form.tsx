'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Field } from '@/components/ui/field';
import { requestPasswordReset, type ResetState } from './actions';

const initial: ResetState = {};

export function EsqueciSenhaForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="E-mail" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
      {state.error ? <p className="rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-2.5 text-sm text-[#B91C1C]">{state.error}</p> : null}
      {state.success ? <p className="rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] px-3.5 py-2.5 text-sm text-[#15803D]">{state.success}</p> : null}
      <button type="submit" disabled={pending} className="rounded-xl bg-blue px-4 py-3.5 font-head text-sm font-bold uppercase text-white disabled:opacity-60">
        {pending ? 'Enviando…' : 'Enviar link'}
      </button>
      <Link href="/cliente/login" className="text-center text-sm font-semibold text-blue">
        Voltar ao login
      </Link>
    </form>
  );
}
