'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatBRL } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { createClient } from '@/lib/supabase/client';

type Shipping = 'retirada' | 'entrega';

export function CheckoutClient({ defaultAddress }: { defaultAddress: string }) {
  const router = useRouter();
  const supabase = createClient();
  const { items, shopId, shopName, total, clear, hydrated } = useCart();
  const [shipping, setShipping] = useState<Shipping>('retirada');
  const [address, setAddress] = useState(defaultAddress);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!hydrated) {
    return <div className="mx-auto max-w-2xl animate-pulse px-4 py-8 md:px-8"><div className="h-40 rounded-2xl bg-g100" /></div>;
  }

  if (items.length === 0 || !shopId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center md:px-8">
        <p className="text-sm text-g600">Seu carrinho está vazio.</p>
        <Link href="/cliente/loja" className="mt-4 inline-block text-sm font-bold text-blue">
          Ver produtos
        </Link>
      </div>
    );
  }

  const onConfirm = async () => {
    setError(null);
    if (shipping === 'entrega' && address.trim().length < 5) {
      setError('Informe o endereço de entrega.');
      return;
    }
    setLoading(true);
    const { data: orderId, error: rpcErr } = await supabase.rpc('create_product_order', {
      p_shop_id: shopId,
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      p_shipping_type: shipping,
      p_address: shipping === 'entrega' ? address.trim() : undefined,
    });
    setLoading(false);
    if (rpcErr) {
      if (/indispon|carrinho|constraint|foreign key/i.test(rpcErr.message)) {
        clear();
        alert('Carrinho desatualizado. Os itens não estão mais disponíveis.');
        router.replace('/cliente/loja');
        return;
      }
      setError(rpcErr.message);
      return;
    }
    clear();
    router.replace(`/cliente/pedido-produto/${orderId as string}`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <Link href="/cliente/carrinho" className="text-sm font-semibold text-blue">
        ← Carrinho
      </Link>
      <h1 className="mt-4 font-head text-2xl font-extrabold text-ink">Checkout</h1>
      {shopName ? <p className="mt-1 text-sm text-g600">{shopName}</p> : null}

      <h2 className="mt-6 font-head text-sm font-bold uppercase tracking-wide text-g600">Itens</h2>
      <div className="mt-2 rounded-xl border border-line bg-white p-4">
        {items.map((it) => (
          <div key={it.product_id} className="flex justify-between gap-3 py-1 text-sm">
            <span className="truncate text-ink">
              {it.qty}x {it.name}
            </span>
            <strong>{formatBRL(it.price * it.qty)}</strong>
          </div>
        ))}
      </div>

      <h2 className="mt-6 font-head text-sm font-bold uppercase tracking-wide text-g600">Como receber?</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <ShipOption label="Retirar na loja" active={shipping === 'retirada'} onPress={() => setShipping('retirada')} />
        <ShipOption label="Entrega" active={shipping === 'entrega'} onPress={() => setShipping('entrega')} />
      </div>

      {shipping === 'entrega' ? (
        <>
          <label className="mt-4 block font-head text-sm font-bold text-ink">Endereço de entrega</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="Rua, número, bairro, cidade…"
            className="mt-2 w-full rounded-xl border border-line bg-white p-3 font-body text-sm text-ink outline-none focus:border-blue"
          />
        </>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <span className="font-head text-base font-bold text-ink">Total</span>
        <span className="font-head text-2xl font-extrabold text-blue">{formatBRL(total)}</span>
      </div>

      {error ? <p className="mt-4 text-sm text-[#B91C1C]">{error}</p> : null}

      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-blue py-3.5 font-head text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {loading ? 'Confirmando…' : 'Confirmar e pagar com Pix'}
      </button>
      <p className="mt-3 text-center text-xs text-g600">
        Você gera o Pix na próxima tela. O pedido fica reservado até o pagamento.
      </p>
    </div>
  );
}

function ShipOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={
        'rounded-xl border px-4 py-4 text-center text-sm font-bold transition-colors ' +
        (active ? 'border-blue bg-[#EEEEFF] text-blue' : 'border-line bg-white text-ink')
      }
    >
      {label}
    </button>
  );
}
