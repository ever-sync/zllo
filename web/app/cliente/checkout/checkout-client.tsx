'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { formatBRL } from '@/lib/format';
import { useCart } from '@/lib/cart';
import {
  deliveryAddressFromProfile,
  formatDeliveryAddress,
  isDeliveryAddressComplete,
  type DeliveryAddress,
} from '@/lib/delivery-address';
import { createClient } from '@/lib/supabase/client';
import { fetchUberDeliveryQuote, type UberQuoteResult } from '@/lib/uber-quote';

type Shipping = 'retirada' | 'entrega';

type ProfileAddress = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
  cep?: string | null;
};

export function CheckoutClient({
  defaultAddress,
  profileAddress: profileAddr,
}: {
  defaultAddress: string;
  profileAddress: ProfileAddress;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { items, shopId, shopName, total, clear, hydrated } = useCart();
  const [shipping, setShipping] = useState<Shipping>('retirada');
  const [dropoff, setDropoff] = useState<DeliveryAddress>(() => deliveryAddressFromProfile(profileAddr));
  const [addressText, setAddressText] = useState(defaultAddress);
  const [uber, setUber] = useState<UberQuoteResult>({ enabled: false });
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshQuote = useCallback(async () => {
    if (!shopId || shipping !== 'entrega' || !isDeliveryAddressComplete(dropoff)) {
      setUber({ enabled: false });
      return;
    }
    setQuoting(true);
    const q = await fetchUberDeliveryQuote(shopId, dropoff);
    setUber(q);
    setQuoting(false);
  }, [shopId, shipping, dropoff]);

  /* eslint-disable react-hooks/set-state-in-effect -- re-quote when shipping or address changes */
  useEffect(() => {
    void refreshQuote();
  }, [refreshQuote]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const deliveryFee = uber.enabled && uber.quote_id ? (uber.fee ?? 0) : 0;
  const grandTotal = total + deliveryFee;
  const useUber = uber.enabled && Boolean(uber.quote_id);

  const onConfirm = async () => {
    setError(null);
    if (shipping === 'entrega') {
      if (useUber) {
        if (!isDeliveryAddressComplete(dropoff)) {
          setError('Complete rua, número, cidade, UF e CEP.');
          return;
        }
        if (!uber.quote_id) {
          setError(uber.error ?? 'Não foi possível cotar a entrega.');
          return;
        }
      } else if (addressText.trim().length < 5) {
        setError('Informe o endereço de entrega.');
        return;
      }
    }
    setLoading(true);
    const { data: orderId, error: rpcErr } = await supabase.rpc('create_product_order', {
      p_shop_id: shopId,
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      p_shipping_type: shipping,
      p_address: shipping === 'entrega'
        ? (useUber ? formatDeliveryAddress(dropoff) : addressText.trim())
        : undefined,
      p_delivery_fee: useUber ? deliveryFee : 0,
      p_uber_quote_id: useUber ? uber.quote_id : undefined,
      p_dropoff_json: useUber ? dropoff : undefined,
      p_delivery_provider: useUber ? 'uber_direct' : undefined,
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
            <span className="truncate text-ink">{it.qty}x {it.name}</span>
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
          {useUber || isDeliveryAddressComplete(dropoff) ? (
            <div className="mt-4 grid gap-3 rounded-xl border border-line bg-white p-4">
              <AddrField label="Rua" value={dropoff.street ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, street: v }))} />
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <AddrField label="Número" value={dropoff.number ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, number: v }))} />
                <AddrField label="CEP" value={dropoff.cep ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, cep: v }))} />
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <AddrField label="Cidade" value={dropoff.city ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, city: v }))} />
                <AddrField label="UF" value={dropoff.uf ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, uf: v.toUpperCase().slice(0, 2) }))} />
              </div>
            </div>
          ) : (
            <>
              <label className="mt-4 block font-head text-sm font-bold text-ink">Endereço de entrega</label>
              <textarea
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                rows={3}
                placeholder="Rua, número, bairro, cidade…"
                className="mt-2 w-full rounded-xl border border-line bg-white p-3 font-body text-sm text-ink outline-none focus:border-blue"
              />
            </>
          )}
          {quoting ? (
            <p className="mt-3 text-sm text-g600">Calculando frete…</p>
          ) : uber.fee_label ? (
            <p className="mt-3 text-sm font-bold text-blue">Frete Uber: {uber.fee_label}</p>
          ) : uber.error ? (
            <p className="mt-3 text-sm text-[#B91C1C]">{uber.error}</p>
          ) : null}
        </>
      ) : null}

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="font-head font-bold text-ink">Subtotal</span>
        <span className="font-head font-extrabold text-blue">{formatBRL(total)}</span>
      </div>
      {deliveryFee > 0 ? (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-head font-bold text-ink">Frete</span>
          <span className="font-head font-extrabold text-blue">{formatBRL(deliveryFee)}</span>
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-head text-base font-bold text-ink">Total</span>
        <span className="font-head text-2xl font-extrabold text-blue">{formatBRL(grandTotal)}</span>
      </div>

      {error ? <p className="mt-4 text-sm text-[#B91C1C]">{error}</p> : null}

      <button
        type="button"
        onClick={() => void onConfirm()}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-blue py-3.5 font-head text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
      >
        {loading ? 'Confirmando…' : 'Confirmar e pagar com Pix'}
      </button>
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

function AddrField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs font-bold text-g600">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
      />
    </label>
  );
}
