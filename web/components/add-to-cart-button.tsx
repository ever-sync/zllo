'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/format';

export type ProductCartInput = {
  id: string;
  name: string;
  price: number;
  photo: string | null;
  shop_id: string;
  shop_name: string;
  stock: number;
};

export function AddToCartButton({
  product,
  className = '',
  compact = false,
}: {
  product: ProductCartInput;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { add, replaceWith } = useCart();
  const [busy, setBusy] = useState(false);

  if (product.stock <= 0) {
    return (
      <button type="button" disabled className={'rounded-xl bg-g100 px-4 py-2.5 text-sm font-semibold text-g400 ' + className}>
        Indisponível
      </button>
    );
  }

  const onAdd = () => {
    setBusy(true);
    const item = {
      product_id: product.id,
      name: product.name,
      price: product.price,
      photo: product.photo,
    };
    const res = add(product.shop_id, product.shop_name, item);
    if (res === 'other_shop') {
      const ok = window.confirm(
        'Seu carrinho tem itens de outra assistência. Limpar e adicionar este produto?',
      );
      if (!ok) {
        setBusy(false);
        return;
      }
      replaceWith(product.shop_id, product.shop_name, item);
    }
    setBusy(false);
    if (window.confirm(`${product.name} adicionado. Ver carrinho?`)) {
      router.push('/cliente/carrinho');
    }
  };

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={busy}
      className={
        (compact
          ? 'rounded-lg bg-blue px-3 py-2 font-head text-xs font-bold text-white disabled:opacity-60 '
          : 'w-full rounded-xl bg-blue py-3 font-head text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60 ') +
        className
      }
    >
      {busy ? '…' : compact ? formatBRL(product.price) + ' · +' : 'Adicionar ao carrinho'}
    </button>
  );
}
