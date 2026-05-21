'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from './actions';

type NavItem = { label: string; href: string; soon?: boolean };

const NAV: NavItem[] = [
  { label: 'Operação', href: '/operacao' },
  { label: 'Produtos', href: '/produtos' },
  { label: 'Orçamentos', href: '/orcamentos', soon: true },
  { label: 'Ordens', href: '/ordens', soon: true },
  { label: 'Chat', href: '/chat', soon: true },
  { label: 'Financeiro', href: '/financeiro', soon: true },
  { label: 'Configurações', href: '/configuracoes', soon: true },
];

export function Sidebar({ shopName, isOnline }: { shopName: string; isOnline: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime font-head text-lg font-black text-blue">
          z
        </span>
        <span className="font-head text-xl font-black tracking-tight text-ink">llo</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          if (item.soon) {
            return (
              <span
                key={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2 font-body text-sm text-g400"
              >
                {item.label}
                <span className="rounded bg-g100 px-1.5 py-0.5 font-body text-[10px] text-g600">
                  em breve
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'rounded-lg px-3 py-2 font-body text-sm transition-colors ' +
                (active ? 'bg-blue text-white' : 'text-ink hover:bg-g100')
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={'h-2 w-2 rounded-full ' + (isOnline ? 'bg-success' : 'bg-g400')}
            aria-hidden
          />
          <span className="truncate font-body text-sm text-ink" title={shopName}>
            {shopName}
          </span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="font-body text-xs text-g600 underline-offset-2 hover:underline"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
