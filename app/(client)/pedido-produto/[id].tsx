import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { priceBRL } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

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
type Dispute = { id: string; status: string; reason: string; resolution: string | null };
type Review = { id: string; rating: number; comment: string | null };

const DISPUTE_LABEL: Record<string, string> = {
  aberta: 'Disputa aberta',
  em_analise: 'Disputa em análise',
  resolvida: 'Disputa resolvida',
  recusada: 'Disputa recusada',
  cancelada: 'Disputa cancelada',
};

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', color: colors.amberText, bg: colors.amberBg },
  pago: { label: 'Pago', color: colors.greenText, bg: colors.greenBg },
  separando: { label: 'Separando', color: colors.blue, bg: '#EEEEFF' },
  pronto: { label: 'Pronto', color: colors.greenText, bg: colors.greenBg },
  concluido: { label: 'Concluído', color: colors.greenText, bg: colors.greenBg },
  cancelado: { label: 'Cancelado', color: colors.redText, bg: colors.redBg },
};

export default function PedidoProduto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<{ payload: string; encodedImage: string } | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeBusy, setDisputeBusy] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('product_orders')
      .select(
        'id, shop_id, total, status, shipping_type, address, created_at, paid_at, shop:shops(name), items:product_order_items(id, name, qty, unit_price, subtotal)',
      )
      .eq('id', id)
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
      .eq('product_order_id', id)
      .order('created_at', { ascending: false })
      .limit(1);
    setDispute((d?.[0] as Dispute) ?? null);

    const { data: rev } = await supabase
      .from('reviews')
      .select('id, rating, comment')
      .eq('product_order_id', id)
      .maybeSingle();
    setMyReview((rev as Review) ?? null);
  }, [id]);

  useEffect(() => {
    load();
    if (!id) return;
    // Atualiza ao vivo (ex.: pagamento confirmado pelo webhook → status 'pago').
    const ch = supabase
      .channel(`porder-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'product_orders', filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  if (loadError) {
    return (
      <Screen>
        <AppHeader title="Pedido" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }
  if (order === undefined) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 60 }} />
      </Screen>
    );
  }
  if (order === null) {
    return (
      <Screen>
        <AppHeader title="Pedido" />
        <Text style={styles.muted}>Pedido não encontrado.</Text>
      </Screen>
    );
  }

  const st = STATUS[order.status] ?? { label: order.status, color: colors.gray600, bg: colors.gray100 };
  const isPending = order.status === 'aguardando_pagamento';
  const isPaid = order.status !== 'aguardando_pagamento' && order.status !== 'cancelado';
  const canDispute = isPaid && (!dispute || dispute.status === 'recusada' || dispute.status === 'cancelada');

  const openDispute = async () => {
    if (disputeReason.trim().length < 5) {
      Alert.alert('Disputa', 'Descreva o motivo com mais detalhes.');
      return;
    }
    setDisputeBusy(true);
    const { error } = await supabase.rpc('open_dispute', {
      p_kind: 'produto',
      p_order_id: id,
      p_reason: disputeReason.trim(),
    });
    setDisputeBusy(false);
    if (error) {
      Alert.alert('Ops', error.message);
      return;
    }
    setDisputeReason('');
    setShowDispute(false);
    load();
  };

  const submitReview = async () => {
    if (!order || !session || reviewStars < 1) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert({
      product_order_id: order.id,
      shop_id: order.shop_id,
      client_id: session.user.id,
      rating: reviewStars,
      comment: reviewComment.trim() || null,
    });
    setSubmittingReview(false);
    if (error) {
      Alert.alert('Ops', error.message);
      return;
    }
    setReviewComment('');
    load();
  };

  const payWithPix = async () => {
    setPayLoading(true);
    setPayError(null);
    const { data, error } = await supabase.functions.invoke('create-product-payment', {
      body: { product_order_id: id },
    });
    setPayLoading(false);
    if (error) {
      let msg = 'Não foi possível gerar o Pix.';
      try {
        const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
        if (body?.error) msg = body.error;
      } catch {
        // mantém genérica
      }
      setPayError(msg);
      setPayModal(true);
      return;
    }
    if (data?.error) {
      setPayError(data.error);
      setPayModal(true);
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

  const onCancel = () => {
    Alert.alert('Cancelar pedido?', 'Esta ação não pode ser desfeita.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar pedido',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase.rpc('cancel_product_order', { p_order_id: id });
          setBusy(false);
          if (error) {
            Alert.alert('Ops', error.message);
            return;
          }
          load();
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Pedido" subtitle={order.shop?.name ?? undefined} />

      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
      </View>

      <Text style={styles.section}>Itens</Text>
      <View style={styles.box}>
        {order.items?.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{it.qty}x {it.name}</Text>
            <Text style={styles.itemVal}>{priceBRL(it.subtotal)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.itemRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{priceBRL(order.total)}</Text>
        </View>
      </View>

      <Text style={styles.section}>Entrega</Text>
      <View style={styles.box}>
        <Text style={styles.deliveryText}>
          {order.shipping_type === 'entrega' ? `Entrega: ${order.address ?? '—'}` : 'Retirar na loja'}
        </Text>
      </View>

      {dispute && dispute.status !== 'recusada' && dispute.status !== 'cancelada' ? (
        <>
          <Text style={styles.section}>Disputa</Text>
          <View style={styles.box}>
            <Text style={styles.disputeStatus}>{DISPUTE_LABEL[dispute.status] ?? dispute.status}</Text>
            <Text style={styles.disputeReason}>“{dispute.reason}”</Text>
            {dispute.resolution ? (
              <Text style={styles.disputeResolution}>Resolução: {dispute.resolution}</Text>
            ) : null}
          </View>
        </>
      ) : canDispute ? (
        showDispute ? (
          <View style={[styles.box, { marginTop: 22, gap: 10 }]}>
            <Text style={styles.disputeStatus}>Abrir disputa</Text>
            <TextInput
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder="O que houve com o pedido?"
              placeholderTextColor={colors.gray400}
              multiline
              style={styles.disputeInput}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Enviar" onPress={openDispute} loading={disputeBusy} style={{ flex: 1 }} />
              <Button label="Cancelar" variant="secondary" onPress={() => setShowDispute(false)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <Pressable style={styles.disputeLink} onPress={() => setShowDispute(true)}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.gray600} />
            <Text style={styles.disputeLinkText}>Tive um problema com este pedido</Text>
          </Pressable>
        )
      ) : null}

      {order.status === 'concluido' ? (
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
            <Text style={styles.reviewTitle}>Avaliar a compra</Text>
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
              style={styles.disputeInput}
            />
            <Button label="Enviar avaliação" onPress={submitReview} loading={submittingReview} disabled={reviewStars < 1} style={{ marginTop: 12 }} />
          </View>
        )
      ) : null}

      {isPaid ? (
        <View style={styles.paidBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.greenText} />
          <Text style={styles.paidText}>Pagamento confirmado</Text>
        </View>
      ) : null}

      {isPending ? (
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
          <Button label="Cancelar pedido" variant="secondary" loading={busy} onPress={onCancel} style={{ marginTop: 10 }} />
        </>
      ) : (
        <Button label="Voltar para a Loja" variant="secondary" onPress={() => router.replace('/(client)/(tabs)/loja')} style={{ marginTop: 22 }} />
      )}

      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {isPaid ? (
              <View style={styles.paySuccess}>
                <Ionicons name="checkmark-circle" size={48} color={colors.greenText} />
                <Text style={styles.sheetTitle}>Pagamento confirmado!</Text>
                <Pressable onPress={() => setPayModal(false)} style={[styles.copyBtn, { marginTop: 16 }]}>
                  <Text style={styles.copyText}>Fechar</Text>
                </Pressable>
              </View>
            ) : payError ? (
              <View style={styles.paySuccess}>
                <Ionicons name="alert-circle" size={44} color={colors.redText} />
                <Text style={styles.sheetSub}>{payError}</Text>
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
  statusBadge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  statusText: { fontFamily: fonts.headBold, fontSize: 13 },
  section: { fontFamily: fonts.headBold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 8 },
  box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 14, gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  itemVal: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: 2 },
  totalLabel: { fontFamily: fonts.headBold, fontSize: 15, color: colors.ink },
  totalValue: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.blue, letterSpacing: -0.5 },
  deliveryText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  disputeStatus: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  disputeReason: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 4, fontStyle: 'italic' },
  disputeResolution: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.greenText, marginTop: 8 },
  disputeInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 12, minHeight: 64, textAlignVertical: 'top', fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  disputeLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, paddingVertical: 8 },
  disputeLinkText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.gray600, textDecorationLine: 'underline' },
  reviewBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 16, marginTop: 22 },
  reviewTitle: { fontFamily: fonts.head, fontSize: 16, color: colors.ink, marginBottom: 12 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  reviewDone: { marginTop: 22, backgroundColor: colors.gray100, borderRadius: radius['2xl'], padding: 16, gap: 6 },
  reviewDoneLabel: { fontFamily: fonts.headBold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6 },
  reviewDoneStars: { fontFamily: fonts.body, fontSize: 18, color: colors.amber },
  reviewDoneText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.gray600, lineHeight: 19 },
  paidBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.greenBg, borderRadius: radius.lg, padding: 14, marginTop: 22 },
  paidText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.greenText },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.lime, borderRadius: radius.lg, paddingVertical: 14, marginTop: 22 },
  payText: { fontFamily: fonts.headBold, fontSize: 13, color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
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
});
