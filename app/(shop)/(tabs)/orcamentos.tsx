import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ShopHeader } from '@/components/ui/shop-header';
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from '@/components/ui/states';
import { useDebouncedReload } from '@/hooks/use-debounced-reload';
import { getDeviceName } from '@/lib/format';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { distanceLabel, timeLeft, useNow } from '@/lib/time';
import { colors, fonts, radius } from '@/theme';

type FeedItem = {
  id: string;
  status: 'pendente' | 'visualizado' | 'orcou' | 'recusou' | 'expirou';
  distance_m: number | null;
  responds_by: string;
  request: {
    id: string;
    description: string;
    photos: string[];
    shipping_type: 'levar_local' | 'frete';
    status: 'aberta' | 'fechada' | 'cancelada' | 'expirada';
    device: { brand: string | null; model: string | null; nickname: string | null } | null;
    client: { full_name: string | null } | null;
  } | null;
};

export default function Orcamentos() {
  const router = useRouter();
  const { shop, loading } = useShop();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const now = useNow(1000);

  const load = useCallback(async () => {
    if (!shop) return;
    const { data, error } = await supabase
      .from('request_targets')
      .select(
        'id, status, distance_m, responds_by, request:repair_requests(id, description, photos, shipping_type, status, device:devices(brand, model, nickname), client:profiles(full_name))',
      )
      .eq('shop_id', shop.id)
      .order('notified_at', { ascending: false });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setItems((data as unknown as FeedItem[]) ?? []);
  }, [shop]);

  const scheduleLoad = useDebouncedReload(load);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!shop) return;
    const channel = supabase
      .channel(`shop-${shop.id}-targets`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_targets', filter: `shop_id=eq.${shop.id}` }, scheduleLoad)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shop, scheduleLoad]);

  if (loading) {
    return (
      <Screen scroll={false} background={colors.canvas}>
        <LoadingState />
      </Screen>
    );
  }
  if (!shop) return <Redirect href="/(shop)/setup" />;

  const active = (items ?? []).filter((it) => it.request && it.request.status === 'aberta');

  return (
    <Screen background={colors.canvas}>
      <ShopHeader title="Orçamentos" subtitle="Solicitações esperando sua resposta" />

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : items === null ? (
        <View style={{ gap: 10, marginTop: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : active.length === 0 ? (
        <EmptyState
          icon="flash-outline"
          title="Nenhuma solicitação agora"
          description="Novos pedidos de reparo aparecem aqui automaticamente quando clientes da região solicitam assistência."
          style={{ marginTop: 14 }}
        />
      ) : (
        <View style={{ gap: 12, marginTop: 14 }}>
          {active.map((it) => {
            const t = timeLeft(it.responds_by, now);
            const deviceName = getDeviceName(it.request!.device);
            const quoted = it.status === 'orcou';
            return (
              <Pressable key={it.id} onPress={() => router.push(`/(shop)/solicitacao/${it.request!.id}`)} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.thumb}><Text style={{ fontSize: 22 }}>📱</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.device}>{deviceName}</Text>
                    <Text style={styles.desc} numberOfLines={2}>{it.request!.description}</Text>
                    <View style={styles.metaRow}>
                      <Meta icon="location-outline" text={distanceLabel(it.distance_m)} />
                      <Meta icon="person-outline" text={it.request!.client?.full_name?.split(' ')[0] ?? 'Cliente'} />
                      <Meta icon="image-outline" text={`${it.request!.photos?.length ?? 0}`} />
                    </View>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  {quoted ? (
                    <View style={[styles.timer, { backgroundColor: colors.greenBg }]}>
                      <Text style={[styles.timerText, { color: colors.greenText }]}>Orçado ✓</Text>
                    </View>
                  ) : (
                    <View style={[styles.timer, { backgroundColor: t.urgent ? colors.redBg : colors.amberBg }]}>
                      <Ionicons name="time-outline" size={12} color={t.urgent ? colors.redText : colors.amberText} />
                      <Text style={[styles.timerText, { color: t.urgent ? colors.redText : colors.amberText }]}>{t.label}</Text>
                    </View>
                  )}
                  {!quoted ? (
                    <View style={styles.respond}>
                      <Text style={styles.respondText}>Responder</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.white} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={colors.gray600} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  device: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  desc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2, lineHeight: 17 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray600 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.md },
  timerText: { fontFamily: fonts.headBold, fontSize: 11 },
  respond: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 9 },
  respondText: { fontFamily: fonts.headBold, fontSize: 11.5, color: colors.white, textTransform: 'uppercase', letterSpacing: 0.4 },
});
