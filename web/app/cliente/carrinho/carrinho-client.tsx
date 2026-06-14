'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatBRL } from '@/lib/format';
import { useCart } from '@/lib/cart';

export function CarrinhoClient() {
  const router = useRouter();
  const { items, shopName, total, setQty, remove, hydrated } = useCart();

  if (!hydrated) {
    return <div className="mx-auto max-w-2xl animate-pulse px-4 py-8 md:px-8"><div className="h-32 rounded-2xl bg-g100" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center md:px-8">
        <p className="font-head text-lg font-bold text-ink">Carrinho vazio</p>
        <p className="mt-2 text-sm text-g600">Explore produtos das assistências e adicione ao carrinho.</p>
        <Link
          href="/cliente/loja"
          className="mt-6 inline-block rounded-xl border border-line px-5 py-3 font-head text-sm font-bold text-ink"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <h1 className="font-head text-2xl font-extrabold text-ink">Carrinho</h1>
      {shopName ? <p className="mt-1 text-sm text-g600">{shopName}</p> : null}

      <div className="mt-6 flex flex-col gap-3">
        {items.map((it) => (
          <article key={it.product_id} className="flex gap-3 rounded-2xl border border-line bg-white p-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-g100 font-head text-xl font-black text-blue">
              {it.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                it.name.slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-sm font-bold text-ink">{it.name}</p>
              <p className="text-xs text-g600">{formatBRL(it.price)}</p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => (it.qty <= 1 ? remove(it.product_id) : setQty(it.product_id, it.qty - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink"
                >
                  {it.qty <= 1 ? '×' : '−'}
                </button>
                <span className="font-head text-sm font-bold">{it.qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(it.product_id, it.qty + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink"
                >
                  +
                </button>
              </div>
            </div>
            <p className="font-head text-sm font-bold text-ink">{formatBRL(it.price * it.qty)}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-head text-base font-bold text-ink">Total</span>
        <span className="font-head text-2xl font-extrabold text-blue">{formatBRL(total)}</span>
      </div>

      <button
        type="button"
        onClick={() => router.push('/cliente/checkout')}
        className="mt-6 w-full rounded-xl bg-blue py-3.5 font-head text-sm font-bold uppercase tracking-wide text-white"
      >
        Finalizar pedido
      </button>
    </div>
  );
}
