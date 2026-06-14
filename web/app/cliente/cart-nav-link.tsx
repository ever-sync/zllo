'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';

export function CartNavLink() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const active = pathname === '/cliente/carrinho' || pathname.startsWith('/cliente/checkout');

  return (
    <Link
      href="/cliente/carrinho"
      className={
        'mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors ' +
        (active ? 'bg-blue text-white' : 'text-[#D1D5DB] hover:bg-white/5')
      }
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className="flex-1">Carrinho</span>
      {hydrated && count > 0 ? (
        <span className="rounded-[10px] bg-lime px-1.5 py-px font-head text-[10px] font-extrabold text-ink">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
