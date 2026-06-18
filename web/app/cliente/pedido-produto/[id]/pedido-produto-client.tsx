'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DisputePanel, type DisputeInfo } from '@/components/dispute-panel';
import { PixModal } from '@/components/pix-modal';
import { ReviewDisplay, ReviewForm } from '@/components/review-form';
import { formatBRL } from '@/lib/format';
import { STATUS_META } from '@/lib/product-orders';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

const TEST_PAY = process.env.NEXT_PUBLIC_ALLOW_TEST_PAY === 'true';

type OrderItem = { id: string; name: string; qty: number; unit_price: number; subtotal: number };
type Order = {
  id: string;
  shop_id: string;
  total: number;
  status: string;
  shipping_type: 'retirada' | 'entrega';
  address: string | null;
  created_at: string;
  paid_at: string | null;
  shop: { name: string } | null;
  items: OrderItem[];
};
type Review = { id: string; rating: number; comment: string | null };

export function PedidoProdutoClient({
  orderId,
  userId,
  initial,
  initialError = false,
}: {
  orderId: string;
  userId: string;
  initial: Order | null;
  initialError?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<Order | null>(initial);
  const [dispute, setDispute] = useState<DisputeInfo | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loadError, setLoadError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<{ payload: string; encodedImage: string } | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uberDelivery, setUberDelivery] = useState<{ status: string; tracking_url: string | null } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_orders')
      .select(
        'id, shop_id, total, status, shipping_type, address, created_at, paid_at, shop:shops(name), items:product_order_items(id, name, qty, unit_price, subtotal)',
      )
      .eq('id', orderId)
      .maybeSingle();
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setOrder((data as unknown as Order) ?? null);

    const { data: d } = await supabase
      .from('disputes')
      .select('id, status, reason, resolution')
      .eq('product_order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1);
    setDispute((d?.[0] as DisputeInfo) ?? null);

    const { data: rev } = await supabase
      .from('reviews')
      .select('id, rating, comment')
      .eq('product_order_id', orderId)
      .maybeSingle();
    setReview((rev as Review) ?? null);

    const { data: ud } = await supabase
      .from('uber_deliveries')
      .select('status, tracking_url')
      .eq('kind', 'product_order')
      .eq('ref_id', orderId)
      .maybeSingle();
    setUberDelivery((ud as { status: string; tracking_url: string | null } | null) ?? null);
  }, [supabase, orderId]);

  const scheduleLoad = useDebouncedCallback(() => {
    void load();
  }, 400);

  useEffect(() => {
    const ch = supabase
      .channel(`web-porder-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'product_orders', filter: `id=eq.${orderId}` },
        scheduleLoad,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'uber_deliveries', filter: `ref_id=eq.${orderId}` },
        scheduleLoad,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, orderId, scheduleLoad]);

  const payWithPix = async () => {
    setPayLoading(true);
    setPayError(null);
    const { data, error } = await supabase.functions.invoke('create-product-payment', {
      body: { product_order_id: orderId },
    });
    setPayLoading(false);
    if (error || data?.error) {
      setPayError(data?.error ?? 'Não foi possível gerar o Pix.');
      setPayModal(true);
      return;
    }
    setPix({ payload: data.payload, encodedImage: data.encodedImage });
    setPayModal(true);
  };

  const copyPix = async () => {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onCancel = async () => {
    if (!window.confirm('Cancelar pedido? Esta ação não pode ser desfeita.')) return;
    setBusy(true);
    const { error } = await supabase.rpc('cancel_product_order', { p_order_id: orderId });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  };

  const payTest = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('confirm_payment_test', {
      p_kind: 'produto',
      p_order_id: orderId,
    });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  };

  const submitReview = async (rating: number, comment: string) => {
    if (!order) return;
    const { error } = await supabase.from('reviews').insert({
      product_order_id: order.id,
      shop_id: order.shop_id,
      client_id: userId,
      rating,
      comment: comment || null,
    });
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  };

  const openDispute = async (reason: string) => {
    const { error } = await supabase.rpc('open_dispute', {
      p_kind: 'produto',
      p_order_id: orderId,
      p_reason: reason,
    });
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center md:px-8">
        <p className="text-sm text-g600">Não foi possível carregar este pedido.</p>
        <button type="button" onClick={() => load()} className="mt-4 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white">
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center md:px-8">
        <p className="font-head text-lg font-bold text-ink">Pedido não encontrado</p>
        <Link href="/cliente/loja" className="mt-4 inline-block text-sm font-bold text-blue">
          ← Voltar à loja
        </Link>
      </div>
    );
  }

  const st = STATUS_META[order.status] ?? { label: order.status, cls: 'bg-g100 text-g600' };
  const isPending = order.status === 'aguardando_pagamento';
  const isPaid = !isPending && order.status !== 'cancelado';
  const canDispute = isPaid && (!dispute || dispute.status === 'recusada' || dispute.status === 'cancelada');

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <Link href="/cliente/loja" className="text-sm font-semibold text-blue">
        ← Loja
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-ink">{order.shop?.name ?? 'Loja'}</h1>
          <p className="mt-1 text-sm text-g600">
            {order.shipping_type === 'entrega' ? `Entrega · ${order.address ?? '—'}` : 'Retirar na loja'}
          </p>
          {uberDelivery?.tracking_url ? (
            <a
              href={uberDelivery.tracking_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex rounded-lg bg-blue px-3 py-2 text-xs font-bold text-white"
            >
              Acompanhar entrega
            </a>
          ) : null}
        </div>
        <span className={'rounded-full px-2.5 py-1 text-xs font-bold ' + st.cls}>{st.label}</span>
      </header>

      <div className="mt-6 rounded-2xl border border-line bg-white p-4">
        {order.items.map((it) => (
          <div key={it.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
            <span className="text-sm text-ink">
              {it.qty}x {it.name}
            </span>
            <strong className="text-sm">{formatBRL(Number(it.subtotal))}</strong>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-line pt-3">
          <span className="font-head font-bold text-ink">Total</span>
          <span className="font-head text-lg font-extrabold text-blue">{formatBRL(Number(order.total))}</span>
        </div>
      </div>

      {isPending ? (
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={payWithPix}
            disabled={payLoading || busy}
            className="w-full rounded-xl bg-lime py-3.5 font-head text-sm font-extrabold uppercase tracking-wide text-ink disabled:opacity-60"
          >
            {payLoading ? 'Gerando Pix…' : 'Pagar com Pix'}
          </button>
          {TEST_PAY ? (
            <button
              type="button"
              onClick={payTest}
              disabled={busy}
              className="w-full rounded-xl border border-line py-3 text-sm font-semibold text-g600"
            >
              Pagar (teste)
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full py-2 text-sm font-semibold text-[#B91C1C]"
          >
            Cancelar pedido
          </button>
        </div>
      ) : isPaid ? (
        <div className="mt-6 rounded-xl bg-[#DCFCE7] px-4 py-3 text-sm font-semibold text-[#15803D]">
          ✓ Pagamento confirmado — a loja vai preparar seu pedido.
        </div>
      ) : null}

      <div className="mt-6">
        <DisputePanel dispute={dispute} canOpen={canDispute} onOpen={openDispute} />
      </div>

      {order.status === 'concluido' ? (
        review ? (
          <ReviewDisplay rating={review.rating} comment={review.comment} />
        ) : (
          <ReviewForm onSubmit={submitReview} />
        )
      ) : null}

      <PixModal
        open={payModal}
        paid={order.status !== 'aguardando_pagamento' && order.status !== 'cancelado'}
        pix={pix}
        copied={copied}
        error={payError}
        onClose={() => setPayModal(false)}
        onCopy={copyPix}
      />
    </div>
  );
}
