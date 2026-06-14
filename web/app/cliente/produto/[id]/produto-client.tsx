'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AddToCartButton, type ProductCartInput } from '@/components/add-to-cart-button';
import { formatBRL } from '@/lib/format';

export function ProdutoClient({ product }: { product: ProductCartInput & { description: string | null; category: string | null; photos: string[] } }) {
  const [photoIx, setPhotoIx] = useState(0);
  const photo = product.photos[photoIx] ?? product.photos[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <Link href="/cliente/loja" className="text-sm font-semibold text-blue">
        ← Loja
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl bg-g100">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={product.name} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center font-head text-5xl font-black text-blue">
            {product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {product.photos.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {product.photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setPhotoIx(i)}
              className={'h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ' + (i === photoIx ? 'border-blue' : 'border-line')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <h1 className="mt-5 font-head text-2xl font-extrabold text-ink">{product.name}</h1>
      <p className="mt-1 font-head text-2xl font-extrabold text-blue">{formatBRL(product.price)}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-g600">
        <span>{product.shop_name}</span>
        {product.category ? <span>· {product.category}</span> : null}
        <span>· {product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}</span>
      </div>

      {product.description ? (
        <div className="mt-6 rounded-xl bg-g100 p-4">
          <p className="text-sm leading-relaxed text-ink">{product.description}</p>
        </div>
      ) : null}

      <div className="mt-6">
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
