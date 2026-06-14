import Link from 'next/link';
import { signOut } from './actions';

export function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEE2E2] font-head text-2xl">
          🔒
        </div>
        <h1 className="mb-2 font-head text-xl font-extrabold text-ink">Acesso restrito</h1>
        <p className="mb-6 font-body text-sm leading-relaxed text-g600">
          Este console é exclusivo para assistências. Sua conta não tem esse perfil.
        </p>
        <div className="flex flex-col gap-3">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue px-4 py-3 font-head text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-95"
            >
              Sair e trocar conta
            </button>
          </form>
          <Link
            href="/cliente/login"
            className="block rounded-xl border border-line px-4 py-3 font-head text-sm font-bold text-ink transition-colors hover:bg-g100"
          >
            Entrar como cliente
          </Link>
        </div>
      </div>
    </main>
  );
}
