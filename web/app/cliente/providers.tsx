'use client';

import { CartProvider } from '@/lib/cart';

export function ClienteProviders({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
