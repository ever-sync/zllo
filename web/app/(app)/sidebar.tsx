'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from './actions';

type Item = { label: string; href: string; icon: keyof typeof ICONS; badge?: number };

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'L';
}

export function Sidebar({
  shopName,
  shopCity,
  badges,
}: {
  shopName: string;
  shopCity?: string | null;
  badges: { orcamentos?: number; ordens?: number };
}) {
  const pathname = usePathname();

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Operação',
      items: [
        { label: 'Painel', href: '/operacao', icon: 'dashboard' },
        { label: 'Orçamentos', href: '/orcamentos', icon: 'clock', badge: badges.orcamentos },
        { label: 'Ordens de Serviço', href: '/ordens', icon: 'file', badge: badges.ordens },
        { label: 'Mensagens', href: '/chat', icon: 'chat' },
      ],
    },
    {
      title: 'Marketplace',
      items: [
        { label: 'Produtos', href: '/produtos', icon: 'box' },
        { label: 'Pedidos', href: '/pedidos', icon: 'cart' },
      ],
    },
    {
      title: 'Negócio',
      items: [
        { label: 'Financeiro', href: '/financeiro', icon: 'money' },
        { label: 'Configurações', href: '/configuracoes', icon: 'settings' },
      ],
    },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-ink py-6 text-white">
      <div className="flex items-center gap-2 px-6 pb-7">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-lime font-head text-[22px] font-black leading-none text-blue">
          z
        </span>
        <span className="font-head text-[22px] font-extrabold tracking-tight text-white">llo</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[1.5px] text-g400">
              {g.title}
            </div>
            {g.items.map((item) => {
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
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-[10px] bg-white/5 px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime to-[#A8D414] font-head text-sm font-extrabold text-ink">
          {initials(shopName)}
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[13px] text-white">{shopName}</strong>
          <span className="text-[11px] text-g400">{shopCity || 'Assistência técnica'}</span>
        </div>
      </div>
      <form action={signOut} className="px-6">
        <button type="submit" className="text-[11px] text-g400 underline-offset-2 hover:underline">
          Sair
        </button>
      </form>
    </aside>
  );
}

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  box: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ),
  money: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
    >
      {ICONS[name]}
    </svg>
  );
}
