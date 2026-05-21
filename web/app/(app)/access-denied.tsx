import { signOut } from './actions';

export function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 font-head text-xl font-extrabold text-ink">Acesso restrito</h1>
        <p className="mb-6 font-body text-sm text-g600">
          Este console é exclusivo para assistências. Sua conta não tem esse perfil.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl bg-blue px-4 py-2.5 font-head font-bold text-white"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
