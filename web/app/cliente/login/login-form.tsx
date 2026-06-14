'use client';

import { useActionState } from 'react';
import { Field } from '@/components/ui/field';
import { loginCliente, type ClienteLoginState } from './actions';

const initial: ClienteLoginState = {};

export function ClienteLoginForm() {
  const [state, formAction, pending] = useActionState(loginCliente, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="cliente@exemplo.com"
      />

      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
      />

      {state.error ? (
        <p className="rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-3.5 py-2.5 font-body text-sm leading-relaxed text-[#B91C1C]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-blue px-4 py-3.5 font-head text-sm font-bold uppercase tracking-wide text-white transition-[opacity,transform] hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? 'Entrando…' : 'Entrar como cliente'}
      </button>
    </form>
  );
}
