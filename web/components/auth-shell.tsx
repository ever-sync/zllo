import type { ReactNode } from 'react';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'shop' | 'client';
};

const highlights: Record<NonNullable<AuthShellProps['variant']>, string[]> = {
  shop: ['Orçamentos em tempo real', 'Ordens de serviço', 'Vendas do marketplace'],
  client: ['Pedir assistência perto de você', 'Acompanhar reparos', 'Comprar na loja das assistências'],
};

export function AuthShell({ title, subtitle, children, footer, variant = 'shop' }: AuthShellProps) {
  return (
    <main className="flex min-h-screen bg-paper">
      <section className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-blue p-10 text-white lg:flex">
        <div className="absolute -right-16 top-24 h-64 w-64 rounded-full bg-lime/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime font-head text-2xl font-black text-blue">
            z
          </span>
          <span className="font-head text-3xl font-black tracking-tight">llo</span>
        </div>

        <div className="relative max-w-md">
          <p className="mb-3 font-head text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            {variant === 'shop' ? 'Console da assistência' : 'Portal do cliente'}
          </p>
          <h2 className="font-head text-3xl font-black leading-tight tracking-tight">
            Conserto de celular sem complicação.
          </h2>
          <ul className="mt-8 space-y-3">
            {highlights[variant].map((item) => (
              <li key={item} className="flex items-center gap-3 font-body text-sm text-white/90">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime font-head text-xs font-black text-ink">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-body text-xs text-white/50">© zllo — marketplace de assistência técnica</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime font-head text-xl font-black text-blue">
              z
            </span>
            <span className="font-head text-2xl font-black tracking-tight text-ink">llo</span>
          </div>

          <h1 className="mb-1 font-head text-2xl font-extrabold text-ink">{title}</h1>
          <p className="mb-6 font-body text-sm leading-relaxed text-g600">{subtitle}</p>

          {children}

          {footer ? <div className="mt-5">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
