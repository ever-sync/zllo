import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { Timeline } from '@/components/ui/timeline';
import { useAuth } from '@/lib/auth';
import { getDeviceName } from '@/lib/format';
import { statusLabel } from '@/lib/order-status';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

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

type Order = { id: string; status: string; value: number; shop_id: string; shop: { name: string } | null };

type Review = { id: string; rating: number; comment: string | null };

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
  const [accepting, setAccepting] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = useCallback(async () => {
    if (!id || !session) return;
    const { data: r, error: rErr } = await supabase
      .from('repair_requests')
      .select('id, description, status, device:devices(brand, model, nickname)')
      .eq('id', id)
      .maybeSingle();
    if (rErr) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setReq((r as unknown as Req) ?? null);

    const { data: q } = await supabase
      .from('quotes')
      .select('id, value, description, status, shop_id, shop:shops(name, rating, reviews_count)')
      .eq('request_id', id)
      .order('value', { ascending: true });
    setQuotes((q as unknown as Quote[]) ?? []);

    const { data: o } = await supabase
      .from('service_orders')
      .select('id, status, value, shop_id, shop:shops(name)')
      .eq('request_id', id)
      .maybeSingle();
    setOrder((o as unknown as Order) ?? null);

    if (o?.id) {
      const { data: ev } = await supabase
        .from('service_order_events')
        .select('status, created_at')
        .eq('order_id', o.id)
        .order('created_at', { ascending: true });
      const map: Record<string, string> = {};
      (ev ?? []).forEach((e: { status: string; created_at: string }) => {
        map[e.status] = fmt(e.created_at);
      });
      setEvents(map);

      const { data: rev } = await supabase
        .from('reviews')
        .select('id, rating, comment')
        .eq('order_id', o.id)
        .maybeSingle();
      setMyReview((rev as Review) ?? null);
    }
  }, [id, session]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: novos orçamentos chegando enquanto a solicitação está aberta.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`req-${id}-quotes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes', filter: `request_id=eq.${id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  const onChoose = (q: Quote) => {
    Alert.alert(
      'Escolher esta assistência?',
      `${q.shop?.name ?? 'Assistência'} — R$ ${q.value.toLocaleString('pt-BR')}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAccepting(q.id);
            const { error } = await supabase.rpc('accept_quote', { p_quote_id: q.id });
            setAccepting(null);
            if (error) {
              Alert.alert('Ops', error.message);
              return;
            }
            load();
          },
        },
      ],
    );
  };

  const openChat = (shopId: string, shopName?: string | null) => {
    if (!req) return;
    router.push({
      pathname: '/(client)/chat/[id]',
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
      Alert.alert('Ops', error.message);
      return;
    }
    setReviewComment('');
    load();
  };

  if (loadError) {
    return (
      <Screen>
        <AppHeader title="Pedido" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }
  if (req === undefined) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 60 }} />
      </Screen>
    );
  }
  if (req === null) {
    return (
      <Screen>
        <AppHeader title="Pedido" />
        <Text style={styles.muted}>Pedido não encontrado.</Text>
      </Screen>
    );
  }

  const deviceName = getDeviceName(req.device);

  return (
    <Screen>
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

          <Text style={styles.section}>Acompanhamento</Text>
          <View style={styles.card}>
            <Timeline status={order.status} events={events} />
          </View>

          <Pressable style={styles.osChatBtn} onPress={() => openChat(order.shop_id, order.shop?.name)}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} />
            <Text style={styles.osChatText}>Conversar com a assistência</Text>
          </Pressable>

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
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 18 },
});
