'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DisputePanel, type DisputeInfo } from '@/components/dispute-panel';
import { PixModal } from '@/components/pix-modal';
import { ReviewDisplay, ReviewForm } from '@/components/review-form';
import { Timeline } from '@/components/timeline';
import { formatBRL, getDeviceName } from '@/lib/format';
import { statusLabel } from '@/lib/order-status';
import {
  eventsMap,
  type RepairDetailOrder,
  type RepairDetailQuote,
  type RepairDetailRequest,
  type RepairDetailPayment,
  type RepairRequestDetail,
} from '@/lib/repair-detail';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

const TEST_PAY = process.env.NEXT_PUBLIC_ALLOW_TEST_PAY === 'true';

type Review = { id: string; rating: number; comment: string | null };

function applyDetail(
  detail: RepairRequestDetail | null,
  setters: {
    setReq: (v: RepairDetailRequest | null) => void;
    setQuotes: (v: RepairDetailQuote[]) => void;
    setOrder: (v: RepairDetailOrder | null) => void;
    setEvents: (v: Record<string, string>) => void;
    setPayment: (v: RepairDetailPayment | null) => void;
    setReview: (v: Review | null) => void;
    setDispute: (v: DisputeInfo | null) => void;
  },
) {
  setters.setReq(detail?.request ?? null);
  setters.setQuotes(detail?.quotes ?? []);
  setters.setOrder(detail?.order ?? null);
  setters.setEvents(eventsMap(detail?.events ?? []));
  setters.setPayment(detail?.payment ?? null);
  setters.setReview(detail?.review ?? null);
  setters.setDispute(detail?.dispute ?? null);
}

export function PedidoClient({
  requestId,
  userId,
  initial,
  initialError = false,
}: {
  requestId: string;
  userId: string;
  initial: RepairRequestDetail | null;
  initialError?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [req, setReq] = useState<RepairDetailRequest | null>(initial?.request ?? null);
  const [quotes, setQuotes] = useState<RepairDetailQuote[]>(initial?.quotes ?? []);
  const [order, setOrder] = useState<RepairDetailOrder | null>(initial?.order ?? null);
  const [events, setEvents] = useState<Record<string, string>>(() => eventsMap(initial?.events ?? []));
  const [payment, setPayment] = useState<RepairDetailPayment | null>(initial?.payment ?? null);
  const [review, setReview] = useState<Review | null>(initial?.review ?? null);
  const [dispute, setDispute] = useState<DisputeInfo | null>(initial?.dispute ?? null);
  const [loadError, setLoadError] = useState(initialError);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [pix, setPix] = useState<{ payload: string; encodedImage: string } | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_repair_request_detail', {
      p_request_id: requestId,
    });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    const detail = (data ?? null) as RepairRequestDetail | null;
    applyDetail(detail, { setReq, setQuotes, setOrder, setEvents, setPayment, setReview, setDispute });
  }, [supabase, requestId]);

  const scheduleLoad = useDebouncedCallback(() => {
    void load();
  }, 400);

  useEffect(() => {
    const ch = supabase
      .channel(`web-req-${requestId}-quotes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotes', filter: `request_id=eq.${requestId}` },
        scheduleLoad,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, requestId, scheduleLoad]);

  useEffect(() => {
    const orderId = order?.id;
    if (!orderId) return;
    const ch = supabase
      .channel(`web-pay-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `order_id=eq.${orderId}` },
        scheduleLoad,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, order?.id, scheduleLoad]);

  const onChoose = async (q: RepairDetailQuote) => {
    if (!window.confirm(`Escolher ${q.shop?.name ?? 'esta assistência'} por ${formatBRL(Number(q.value))}?`)) {
      return;
    }
    setAccepting(q.id);
    setActionError(null);
    const { error } = await supabase.rpc('accept_quote', { p_quote_id: q.id });
    setAccepting(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    await load();
  };

  const payWithPix = async () => {
    if (!order) return;
    setPayLoading(true);
    setPayError(null);
    const { data, error } = await supabase.functions.invoke('create-pix-payment', {
      body: { order_id: order.id },
    });
    setPayLoading(false);
    if (error) {
      setPayError('Não foi possível gerar o Pix.');
      setPayModal(true);
      return;
    }
    if (data?.error) {
      setPayError(String(data.error));
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

  const payTest = async () => {
    if (!order) return;
    setPayLoading(true);
    const { error } = await supabase.rpc('confirm_payment_test', {
      p_kind: 'reparo',
      p_order_id: order.id,
    });
    setPayLoading(false);
    if (error) {
      setPayError(error.message);
      return;
    }
    await load();
  };

  const submitReview = async (rating: number, comment: string) => {
    if (!order) return;
    const { error } = await supabase.from('reviews').insert({
      order_id: order.id,
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
    if (!order) return;
    const { error } = await supabase.rpc('open_dispute', {
      p_kind: 'reparo',
      p_order_id: order.id,
      p_reason: reason,
    });
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  };

  const chatHref = (shopId: string, shopName: string) =>
    `/cliente/conversa/${requestId}?shopId=${encodeURIComponent(shopId)}&shopName=${encodeURIComponent(shopName)}`;

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center md:px-8">
        <p className="font-body text-sm text-g600">Não foi possível carregar este pedido.</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 rounded-xl bg-blue px-4 py-2.5 font-head text-sm font-bold text-white"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (req === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center md:px-8">
        <p className="font-head text-lg font-bold text-ink">Pedido não encontrado</p>
        <Link href="/cliente/pedidos" className="mt-4 inline-block text-sm font-bold text-blue">
          ← Voltar aos pedidos
        </Link>
      </div>
    );
  }

  const deviceName = getDeviceName(req.device);
  const isPaid = payment?.status === 'pago';
  const canDispute = isPaid && (!dispute || dispute.status === 'recusada' || dispute.status === 'cancelada');

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <Link href="/cliente/pedidos" className="text-sm font-semibold text-blue">
        ← Pedidos
      </Link>

      <header className="mt-4">
        <h1 className="font-head text-2xl font-extrabold text-ink">{deviceName}</h1>
        <p className="mt-1 font-body text-sm text-g600">{req.description}</p>
      </header>

      {actionError ? (
        <p className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-4 py-3 text-sm text-[#B91C1C]">
          {actionError}
        </p>
      ) : null}

      {order ? (
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-lime px-5 py-4">
            <div>
              <p className="font-head text-base font-extrabold text-ink">{order.shop?.name ?? 'Assistência'}</p>
              <p className="text-sm text-ink/70">{statusLabel(order.status)}</p>
            </div>
            <p className="font-head text-xl font-extrabold text-ink">{formatBRL(Number(order.value))}</p>
          </div>

          {payment?.status === 'pago' ? (
            <div className="flex items-center gap-2 rounded-xl bg-[#DCFCE7] px-4 py-3 text-sm font-semibold text-[#15803D]">
              ✓ Pagamento confirmado
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={payWithPix}
                disabled={payLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 py-3.5 font-head text-sm font-extrabold uppercase tracking-wide text-ink disabled:opacity-60"
              >
                {payLoading ? 'Gerando Pix…' : 'Pagar com Pix'}
              </button>
              {payError ? <p className="text-sm text-[#B91C1C]">{payError}</p> : null}
              {TEST_PAY ? (
                <button
                  type="button"
                  onClick={payTest}
                  disabled={payLoading}
                  className="w-full rounded-xl border border-line py-3 text-sm font-semibold text-g600"
                >
                  Pagar (teste)
                </button>
              ) : null}
            </div>
          )}

          <Link
            href={chatHref(order.shop_id, order.shop?.name ?? 'Assistência')}
            className="flex items-center justify-center gap-2 rounded-xl bg-ink py-3.5 font-head text-sm font-bold text-white"
          >
            Conversar com a assistência
          </Link>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="mb-4 font-head text-base font-extrabold text-ink">Acompanhamento</h2>
            <Timeline status={order.status} events={events} />
          </div>

          <DisputePanel dispute={dispute} canOpen={canDispute} onOpen={openDispute} />

          {order.status === 'concluida' ? (
            review ? (
              <ReviewDisplay rating={review.rating} comment={review.comment} />
            ) : (
              <ReviewForm onSubmit={submitReview} />
            )
          ) : null}
        </section>
      ) : (
        <section className="mt-6">
          <h2 className="font-head text-base font-extrabold text-ink">
            Orçamentos recebidos{quotes.length > 0 ? ` (${quotes.length})` : ''}
          </h2>
          {quotes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line bg-g100/40 px-6 py-10 text-center">
              <p className="font-body text-sm text-g600">Aguardando assistências responderem…</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {quotes.map((q) => (
                <article key={q.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-head text-base font-bold text-ink">{q.shop?.name ?? 'Assistência'}</p>
                      <p className="text-xs text-g600">
                        ★ {q.shop?.rating?.toFixed(1) ?? '—'} · {q.shop?.reviews_count ?? 0} reparos
                      </p>
                    </div>
                    <p className="font-head text-lg font-extrabold text-blue">{formatBRL(Number(q.value))}</p>
                  </div>
                  {q.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-g600">{q.description}</p>
                  ) : null}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={chatHref(q.shop_id, q.shop?.name ?? 'Assistência')}
                      className="flex flex-1 items-center justify-center rounded-xl border border-line py-3 font-head text-sm font-bold text-ink"
                    >
                      Chat
                    </Link>
                    <button
                      type="button"
                      onClick={() => onChoose(q)}
                      disabled={accepting !== null}
                      className="flex-[2] rounded-xl bg-blue py-3 font-head text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
                    >
                      {accepting === q.id ? 'Confirmando…' : 'Escolher'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <PixModal
        open={payModal}
        paid={payment?.status === 'pago'}
        pix={pix}
        copied={copied}
        error={payError}
        onClose={() => setPayModal(false)}
        onCopy={copyPix}
      />
    </div>
  );
}
