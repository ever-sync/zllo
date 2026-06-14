'use client';

import Link from 'next/link';
import { AddToCartButton, type ProductCartInput } from '@/components/add-to-cart-button';
import { formatBRL } from '@/lib/format';

type Product = ProductCartInput & {
  description: string | null;
  category: string | null;
  photos: string[];
  shop: { name: string; rating: number } | null;
};

export function LojaProductCard({ product }: { product: Product }) {
  const cartInput: ProductCartInput = {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    photo: product.photos?.[0] ?? null,
    shop_id: product.shop_id,
    shop_name: product.shop?.name ?? 'Loja',
    stock: product.stock,
  };

  return (
    <article className="flex flex-col rounded-[14px] border border-line bg-white p-4">
      <Link href={`/cliente/produto/${product.id}`} className="block flex-1">
        <div className="mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-g100">
          {product.photos?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.photos[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-head text-4xl font-black text-blue">{product.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="font-head text-base font-extrabold text-ink">{product.name}</h2>
          <strong className="whitespace-nowrap font-head text-sm text-blue">{formatBRL(Number(product.price))}</strong>
        </div>
        <p className="line-clamp-2 min-h-10 text-sm text-g600">{product.description || product.category || 'Produto disponível.'}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-g600">
          <span className="truncate">{product.shop?.name ?? 'Loja zllo'}</span>
          <span>{product.stock} em estoque</span>
        </div>
      </Link>
      <div className="mt-4">
        <AddToCartButton product={cartInput} compact />
      </div>
    </article>
  );
}
