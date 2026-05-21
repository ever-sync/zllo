'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-body text-sm text-g600">E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-xl border border-line bg-white px-3.5 py-2.5 font-body text-ink outline-none focus:border-blue"
          placeholder="loja@exemplo.com"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-body text-sm text-g600">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-xl border border-line bg-white px-3.5 py-2.5 font-body text-ink outline-none focus:border-blue"
          placeholder="••••••••"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg bg-[#FEE2E2] px-3 py-2 font-body text-sm text-[#B91C1C]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-blue px-4 py-3 font-head font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
