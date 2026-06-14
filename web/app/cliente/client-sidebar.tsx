import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOutCliente } from './actions';

type Item = { label: string; href: string; icon: keyof typeof ICONS; badge?: number };

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'C';
}

export function ClientSidebar({
  name,
  email,
  badges,
  cartLink,
}: {
  name: string;
  email?: string | null;
  badges: { requests?: number; productOrders?: number; devices?: number };
  cartLink?: ReactNode;
}) {
  const pathname = usePathname();
  const items: Item[] = [
    { label: 'Início', href: '/cliente', icon: 'home' },
    { label: 'Pedir assistência', href: '/cliente/solicitar', icon: 'plus' },
    { label: 'Pedidos', href: '/cliente/pedidos', icon: 'file', badge: badges.requests },
    { label: 'Aparelhos', href: '/cliente/aparelhos', icon: 'phone', badge: badges.devices },
    { label: 'Loja', href: '/cliente/loja', icon: 'store', badge: badges.productOrders },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink py-6 text-white md:flex">
      <div className="flex items-center gap-2 px-6 pb-7">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-lime font-head text-[22px] font-black leading-none text-blue">
          z
        </span>
        <span className="font-head text-[22px] font-extrabold tracking-tight text-white">llo</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[1.5px] text-g400">
          Cliente
        </div>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors ' +
                (active ? 'bg-blue text-white' : 'text-[#D1D5DB] hover:bg-white/5')
              }
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-[10px] bg-lime px-1.5 py-px font-head text-[10px] font-extrabold text-ink">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        {cartLink}
      </nav>

      <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-[10px] bg-white/5 px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime to-[#A8D414] font-head text-sm font-extrabold text-ink">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[13px] text-white">{name}</strong>
          <span className="block truncate text-[11px] text-g400">{email || 'Cliente zllo'}</span>
        </div>
      </div>
      <form action={signOutCliente} className="px-6">
        <button type="submit" className="text-[11px] text-g400 underline-offset-2 hover:underline">
          Sair
        </button>
      </form>
    </aside>
  );
}

const ICONS = {
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  plus: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ),
  store: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
