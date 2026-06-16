import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/screen';
import { ErrorState, EmptyState, Skeleton, SkeletonCard } from '@/components/ui/states';
import { Timeline } from '@/components/ui/timeline';
import { useAuth } from '@/lib/auth';
import { confirmAsync, notify } from '@/lib/confirm';
import { useDebouncedReload } from '@/hooks/use-debounced-reload';
import { getDeviceName } from '@/lib/format';
import { statusLabel } from '@/lib/order-status';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

const TEST_PAY = process.env.EXPO_PUBLIC_ALLOW_TEST_PAY === 'true';

type Quote = {
  id: string;
  value: number;
  description: string | null;
  status: string;
  shop_id: string;
  shop: { name: string; rating: number; reviews_count: number } | null;
};

type Req = {
  id: string;
  description: string;
  status: string;
  device: { brand: string | null; model: string | null; nickname: string | null } | null;
};

type Order = { id: string; status: string; value: number; shop_id: string; warranty_days: number; shop: { name: string } | null };

type Review = { id: string; rating: number; comment: string | null };

type Payment = { id: string; status: 'pendente' | 'pago' | 'cancelado' | 'estornado'; amount: number };

type Dispute = { id: string; status: string; reason: string; resolution: string | null };

const DISPUTE_LABEL: Record<string, string> = {
  aberta: 'Disputa aberta',
  em_analise: 'Disputa em análise',
  resolvida: 'Disputa resolvida',
  recusada: 'Disputa recusada',
  cancelada: 'Disputa cancelada',
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function PedidoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [req, setReq] = useState<Req | null | undefined>(undefined);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [concludedAt, setConcludedAt] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [pix, setPix] = useState<{ payload: string; encodedImage: string } | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeBusy, setDisputeBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !session) return;
    const { data, error } = await supabase.rpc('get_repair_request_detail', { p_request_id: id });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);

    type Detail = {
      request: Req | null;
      quotes: Quote[];
      order: Order | null;
      events: { status: string; created_at: string }[];
      review: Review | null;
      payment: Payment | null;
      dispute: Dispute | null;
    };
    const detail = (data ?? null) as Detail | null;
    setReq(detail?.request ?? null);
    setQuotes(detail?.quotes ?? []);
    setOrder(detail?.order ?? null);

    const map: Record<string, string> = {};
    let conc: string | null = null;
    (detail?.events ?? []).forEach((e) => {
      map[e.status] = fmt(e.created_at);
      if (e.status === 'concluida') conc = e.created_at;
    });
    setEvents(map);
    setConcludedAt(conc);
    setMyReview(detail?.review ?? null);
    setPayment(detail?.payment ?? null);
    setDispute(detail?.dispute ?? null);
  }, [id, session]);

  const scheduleLoad = useDebouncedReload(load);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: novos orçamentos chegando enquanto a solicitação está aberta.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`req-${id}-quotes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes', filter: `request_id=eq.${id}` }, scheduleLoad)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, scheduleLoad]);

  // Realtime: confirmação do pagamento da OS.
  useEffect(() => {
    const orderId = order?.id;
    if (!orderId) return;
    const channel = supabase
      .channel(`pay-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `order_id=eq.${orderId}` }, scheduleLoad)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, scheduleLoad]);

  const onChoose = async (q: Quote) => {
    const ok = await confirmAsync(
      'Escolher esta assistência?',
      `${q.shop?.name ?? 'Assistência'} — R$ ${q.value.toLocaleString('pt-BR')}`,
    );
    if (!ok) return;
    setAccepting(q.id);
    const { error } = await supabase.rpc('accept_quote', { p_quote_id: q.id });
    setAccepting(null);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    load();
  };

  const openChat = (shopId: string, shopName?: string | null) => {
    if (!req) return;
    router.push({
      pathname: '/chat/[id]',
      params: { id: req.id, shopId, shopName: shopName ?? 'Assistência' },
    });
  };

  const submitReview = async () => {
    if (!order || !session || reviewStars < 1) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert({
      order_id: order.id,
      shop_id: order.shop_id,
      client_id: session.user.id,
      rating: reviewStars,
      comment: reviewComment.trim() || null,
    });
    setSubmittingReview(false);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    setReviewComment('');
    load();
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
      let msg = 'Não foi possível gerar o Pix.';
      try {
        const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
        if (body?.error) msg = body.error;
      } catch {
        // mantém a mensagem genérica
      }
      setPayError(msg);
      return;
    }
    if (data?.error) {
      setPayError(data.error);
      return;
    }
    setPix({ payload: data.payload, encodedImage: data.encodedImage });
    setPayModal(true);
  };

  const copyPix = async () => {
    if (!pix) return;
    await Clipboard.setStringAsync(pix.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const payTest = async () => {
    if (!order) return;
    setPayLoading(true);
    const { error } = await supabase.rpc('confirm_payment_test', { p_kind: 'reparo', p_order_id: order.id });
    setPayLoading(false);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    load();
  };

  const openDispute = async () => {
    if (!order || disputeReason.trim().length < 5) {
      notify('Disputa', 'Descreva o motivo com mais detalhes.');
      return;
    }
    setDisputeBusy(true);
    const { error } = await supabase.rpc('open_dispute', {
      p_kind: 'reparo',
      p_order_id: order.id,
      p_reason: disputeReason.trim(),
    });
    setDisputeBusy(false);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    setDisputeReason('');
    setShowDispute(false);
    load();
  };

  if (loadError) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Pedido" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }
  if (req === undefined) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Pedido" />
        <View style={{ gap: 12, marginTop: 8 }}>
          <SkeletonCard />
          <Skeleton height={120} style={{ borderRadius: radius['2xl'] }} />
          <Skeleton height={80} style={{ borderRadius: radius['2xl'] }} />
        </View>
      </Screen>
    );
  }
  if (req === null) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Pedido" />
        <EmptyState
          icon="search-outline"
          title="Pedido não encontrado"
          description="Este pedido pode ter sido removido ou você não tem acesso."
          actionLabel="Voltar aos pedidos"
          onAction={() => router.replace('/pedidos')}
        />
      </Screen>
    );
  }

  const deviceName = getDeviceName(req.device);

  return (
    <Screen background={colors.canvas}>
      <AppHeader title={deviceName} subtitle={req.description} />

      {order ? (
        // ---------- OS em andamento: linha do tempo ----------
        <>
          <View style={styles.osCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.osShop}>{order.shop?.name ?? 'Assistência'}</Text>
              <Text style={styles.osStatus}>{statusLabel(order.status)}</Text>
            </View>
            <Text style={styles.osValue}>R$ {order.value.toLocaleString('pt-BR')}</Text>
          </View>

          {order.warranty_days > 0 ? (
            <Text style={styles.warranty}>
              🛡️ Garantia de {order.warranty_days} dias
              {concludedAt
                ? ` · até ${new Date(new Date(concludedAt).getTime() + order.warranty_days * 86400000).toLocaleDateString('pt-BR')}`
                : ''}
            </Text>
          ) : null}

          {payment?.status === 'pago' ? (
            <View style={styles.paidBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.greenText} />
              <Text style={styles.paidText}>Pagamento confirmado</Text>
            </View>
          ) : (
            <>
              <Pressable style={styles.payBtn} onPress={payWithPix} disabled={payLoading}>
                {payLoading ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <>
                    <Ionicons name="qr-code-outline" size={18} color={colors.ink} />
                    <Text style={styles.payText}>Pagar com Pix</Text>
                  </>
                )}
              </Pressable>
              {payError ? <Text style={styles.payErrorText}>{payError}</Text> : null}
              {TEST_PAY ? (
                <Pressable style={styles.payTestBtn} onPress={payTest} disabled={payLoading}>
                  <Text style={styles.payTestText}>Pagar (teste)</Text>
                </Pressable>
              ) : null}
            </>
          )}

          <Text style={styles.section}>Acompanhamento</Text>
          <View style={styles.card}>
            <Timeline status={order.status} events={events} />
          </View>

          <Pressable style={styles.osChatBtn} onPress={() => openChat(order.shop_id, order.shop?.name)}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} />
            <Text style={styles.osChatText}>Conversar com a assistência</Text>
          </Pressable>

          {dispute && dispute.status !== 'recusada' && dispute.status !== 'cancelada' ? (
            <View style={styles.disputeBox}>
              <Text style={styles.disputeStatus}>{DISPUTE_LABEL[dispute.status] ?? dispute.status}</Text>
              <Text style={styles.disputeReason}>“{dispute.reason}”</Text>
              {dispute.resolution ? (
                <Text style={styles.disputeResolution}>Resolução: {dispute.resolution}</Text>
              ) : null}
            </View>
          ) : order.status !== 'cancelada' ? (
            showDispute ? (
              <View style={styles.disputeBox}>
                <Text style={styles.disputeStatus}>Abrir disputa</Text>
                <TextInput
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  placeholder="O que houve com o reparo?"
                  placeholderTextColor={colors.gray400}
                  multiline
                  style={styles.disputeInput}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable style={[styles.chooseBtn, { flex: 1 }]} onPress={openDispute} disabled={disputeBusy}>
                    {disputeBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.chooseText}>Enviar</Text>}
                  </Pressable>
                  <Pressable style={styles.disputeCancel} onPress={() => setShowDispute(false)}>
                    <Text style={styles.disputeCancelText}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.disputeLink} onPress={() => setShowDispute(true)}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.gray600} />
                <Text style={styles.disputeLinkText}>Tive um problema com este reparo</Text>
              </Pressable>
            )
          ) : null}

          {order.status === 'concluida' ? (
            myReview ? (
              <View style={styles.reviewDone}>
                <Text style={styles.reviewDoneLabel}>Sua avaliação</Text>
                <Text style={styles.reviewDoneStars}>
                  {'★'.repeat(myReview.rating)}{'☆'.repeat(5 - myReview.rating)}
                </Text>
                {myReview.comment ? <Text style={styles.reviewDoneText}>{myReview.comment}</Text> : null}
              </View>
            ) : (
              <View style={styles.reviewBox}>
                <Text style={styles.section}>Avaliar atendimento</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Pressable key={s} onPress={() => setReviewStars(s)} hitSlop={6}>
                      <Ionicons name={s <= reviewStars ? 'star' : 'star-outline'} size={32} color={colors.amber} />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Conte como foi (opcional)"
                  placeholderTextColor={colors.gray400}
                  multiline
                  style={styles.reviewInput}
                />
                <Pressable
                  style={[styles.chooseBtn, { marginTop: 12, opacity: reviewStars < 1 ? 0.5 : 1 }]}
                  onPress={submitReview}
                  disabled={reviewStars < 1 || submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.chooseText}>Enviar avaliação</Text>
                  )}
                </Pressable>
              </View>
            )
          ) : null}
        </>
      ) : (
        // ---------- Solicitação aberta: orçamentos recebidos ----------
        <>
          <Text style={styles.section}>
            Orçamentos recebidos {quotes.length > 0 ? `(${quotes.length})` : ''}
          </Text>
          {quotes.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.blue} />
              <Text style={styles.emptyText}>Aguardando assistências responderem…</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {quotes.map((q) => (
                <View key={q.id} style={styles.quote}>
                  <View style={styles.quoteTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quoteShop}>{q.shop?.name ?? 'Assistência'}</Text>
                      <Text style={styles.quoteRating}>★ {q.shop?.rating?.toFixed(1) ?? '—'} · {q.shop?.reviews_count ?? 0} reparos</Text>
                    </View>
                    <Text style={styles.quoteValue}>R$ {q.value.toLocaleString('pt-BR')}</Text>
                  </View>
                  {q.description ? <Text style={styles.quoteDesc}>{q.description}</Text> : null}
                  <View style={styles.quoteActions}>
                    <Pressable style={styles.chatBtn} onPress={() => openChat(q.shop_id, q.shop?.name)} hitSlop={4}>
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.ink} />
                    </Pressable>
                    <Pressable
                      style={[styles.chooseBtn, { flex: 1 }]}
                      onPress={() => onChoose(q)}
                      disabled={accepting !== null}
                    >
                      {accepting === q.id ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.chooseText}>Escolher esta</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {payment?.status === 'pago' ? (
              <View style={styles.paySuccess}>
                <Ionicons name="checkmark-circle" size={48} color={colors.greenText} />
                <Text style={styles.sheetTitle}>Pagamento confirmado!</Text>
                <Pressable onPress={() => setPayModal(false)} style={[styles.copyBtn, { marginTop: 16 }]}>
                  <Text style={styles.copyText}>Fechar</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Pague com Pix</Text>
                <Text style={styles.sheetSub}>Escaneie o QR Code ou copie o código abaixo.</Text>
                {pix?.encodedImage ? (
                  <Image source={{ uri: `data:image/png;base64,${pix.encodedImage}` }} style={styles.qr} contentFit="contain" />
                ) : null}
                <Pressable style={styles.copyBtn} onPress={copyPix}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.white} />
                  <Text style={styles.copyText}>{copied ? 'Copiado!' : 'Copiar código Pix'}</Text>
                </Pressable>
                <View style={styles.waitRow}>
                  <ActivityIndicator color={colors.gray400} size="small" />
                  <Text style={styles.waitText}>Aguardando pagamento…</Text>
                </View>
                <Pressable onPress={() => setPayModal(false)} style={{ marginTop: 6, alignSelf: 'center' }}>
                  <Text style={styles.closeLink}>Fechar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  section: { fontFamily: fonts.head, fontSize: 16, color: colors.ink, marginTop: 18, marginBottom: 12 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600 },
  quote: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 14, gap: 10 },
  quoteTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quoteShop: { fontFamily: fonts.head, fontSize: 16, color: colors.ink },
  quoteRating: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 2 },
  quoteValue: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.ink },
  quoteDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, lineHeight: 19 },
  quoteActions: { flexDirection: 'row', gap: 10 },
  chatBtn: { width: 46, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  chooseBtn: { backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  chooseText: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  osChatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 14, marginTop: 16 },
  osChatText: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  disputeBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 16, marginTop: 14 },
  disputeStatus: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  disputeReason: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 4, fontStyle: 'italic' },
  disputeResolution: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.greenText, marginTop: 8 },
  disputeInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 12, minHeight: 64, textAlignVertical: 'top', fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginTop: 10 },
  disputeCancel: { flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  disputeCancelText: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.4 },
  disputeLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingVertical: 8 },
  disputeLinkText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.gray600, textDecorationLine: 'underline' },
  paidBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.greenBg, borderRadius: radius.lg, padding: 14, marginTop: 14 },
  paidText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.greenText },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.lime, borderRadius: radius.lg, paddingVertical: 14, marginTop: 14 },
  payText: { fontFamily: fonts.headBold, fontSize: 13, color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  payErrorText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginTop: 10 },
  payTestBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, paddingVertical: 13, marginTop: 10 },
  payTestText: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34, alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200, marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.headBlack, fontSize: 20, color: colors.ink, textAlign: 'center' },
  sheetSub: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 4, textAlign: 'center' },
  qr: { width: 220, height: 220, marginVertical: 18, backgroundColor: colors.white },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 13, paddingHorizontal: 20, alignSelf: 'stretch' },
  copyText: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  waitText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600 },
  closeLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.gray600, paddingVertical: 8 },
  paySuccess: { alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  reviewBox: { marginTop: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 16 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  reviewInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 12, minHeight: 70, textAlignVertical: 'top', fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  reviewDone: { marginTop: 18, backgroundColor: colors.gray100, borderRadius: radius['2xl'], padding: 16, gap: 6 },
  reviewDoneLabel: { fontFamily: fonts.headBold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6 },
  reviewDoneStars: { fontFamily: fonts.body, fontSize: 18, color: colors.amber },
  reviewDoneText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.gray600, lineHeight: 19 },
  osCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.lime, borderRadius: radius['2xl'], padding: 16 },
  osShop: { fontFamily: fonts.head, fontSize: 17, color: colors.ink },
  osStatus: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, opacity: 0.75, marginTop: 2 },
  osValue: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.ink },
  warranty: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.gray600, marginTop: 12 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 18 },
});
