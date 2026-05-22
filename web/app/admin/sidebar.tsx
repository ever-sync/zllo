'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '../(app)/actions';

const NAV = [
  { label: 'Visão geral', href: '/admin' },
  { label: 'Transações', href: '/admin/transacoes' },
  { label: 'Disputas', href: '/admin/disputas' },
  { label: 'Lojas', href: '/admin/lojas' },
  { label: 'Produtos', href: '/admin/produtos' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-ink">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime font-head text-lg font-black text-blue">
          z
        </span>
        <span className="font-head text-xl font-black tracking-tight text-white">llo</span>
        <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 font-head text-[10px] font-bold uppercase tracking-wide text-lime">
          admin
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'rounded-lg px-3 py-2 font-body text-sm transition-colors ' +
                (active ? 'bg-blue text-white' : 'text-white/70 hover:bg-white/10')
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-5 py-4">
        <form action={signOut}>
          <button type="submit" className="font-body text-xs text-white/60 underline-offset-2 hover:underline">
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
