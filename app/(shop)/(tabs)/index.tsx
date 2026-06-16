import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, CardHeader } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ShopHeader } from '@/components/ui/shop-header';
import { ErrorState, Skeleton, SkeletonCard } from '@/components/ui/states';
import { getDeviceName } from '@/lib/format';
import { statusLabel } from '@/lib/order-status';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { distanceLabel } from '@/lib/time';
import { colors, fonts, radius } from '@/theme';

type Target = {
  id: string;
  status: string;
  distance_m: number | null;
  request: { id: string; description: string; status: string; device: { brand: string | null; model: string | null; nickname: string | null } | null } | null;
};
type Order = { id: string; status: string; value: number; created_at: string; device: { brand: string | null; model: string | null; nickname: string | null } | null; client: { full_name: string | null } | null };

// Iniciais dos dias da semana, indexadas por Date.getDay() (0 = domingo).
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Faturamento dos últimos 7 dias, a partir das OS reais da loja. */
function weeklyRevenue(orders: Order[]): { d: string; total: number; today: boolean }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, idx) => {
    const i = 6 - idx;
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const total = orders.reduce((sum, o) => {
      const c = new Date(o.created_at).getTime();
      return c >= dayStart.getTime() && c < dayEnd.getTime() ? sum + Number(o.value) : sum;
    }, 0);
    return { d: WEEKDAY_INITIALS[dayStart.getDay()], total, today: i === 0 };
  });
}

export default function Painel() {
  const router = useRouter();
  const { shop, loading } = useShop();
  const [targets, setTargets] = useState<Target[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    const { data: t, error: tErr } = await supabase
      .from('request_targets')
      .select('id, status, distance_m, request:repair_requests(id, description, status, device:devices(brand, model, nickname))')
      .eq('shop_id', shop.id)
      .order('notified_at', { ascending: false });
    if (tErr) {
      setLoadError(true);
      return;
    }
    setTargets((t as unknown as Target[]) ?? []);
    const { data: o, error: oErr } = await supabase
      .from('service_orders')
      .select('id, status, value, created_at, device:devices(brand, model, nickname), client:profiles(full_name)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    if (oErr) {
      setLoadError(true);
      return;
    }
    setOrders((o as unknown as Order[]) ?? []);
    setLoadError(false);
  }, [shop]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <Screen background={colors.canvas}>
        <View style={{ gap: 12, marginTop: 8 }}>
          <Skeleton height={120} style={{ borderRadius: radius['2xl'] }} />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }
  if (!shop) return <Redirect href="/setup" />;
  if (loadError) return <Screen scroll={false} background={colors.canvas}><ErrorState onRetry={load} /></Screen>;

  const pending = targets.filter((t) => t.request && t.request.status === 'aberta');
  const orcou = targets.filter((t) => t.status === 'orcou').length;
  const inProgress = orders.filter((o) => o.status !== 'concluida' && o.status !== 'cancelada');
  const revenue = orders.reduce((s, o) => s + Number(o.value), 0);
  const conv = orcou > 0 ? Math.round((orders.length / orcou) * 100) : 0;
  const week = weeklyRevenue(orders);
  const weekRevenue = week.reduce((s, b) => s + b.total, 0);
  const weekMax = Math.max(...week.map((b) => b.total), 1);

  return (
    <Screen background={colors.canvas}>
      <ShopHeader greeting subtitle={`${pending.length} orçamentos · ${inProgress.length} OS em andamento`} />

      {/* HERO */}
      <View style={styles.hero}>
        <View style={{ flex: 1, zIndex: 1 }}>
          <Text style={styles.heroTitle}>Sua nota está em {shop.rating?.toFixed(1) ?? '5.0'} ⭐</Text>
          <Text style={styles.heroSub}>Responda rápido para subir no ranking da sua região.</Text>
          <Pressable style={styles.heroBtn} onPress={() => router.push('/reputacao')}>
            <Text style={styles.heroBtnText}>Ver ranking →</Text>
          </Pressable>
        </View>
        <Text style={styles.heroZ}>z</Text>
      </View>

      {/* KPIs */}
      <View style={styles.kpis}>
        <Kpi label="Orçamentos" value={String(pending.length)} delta={`${orcou} respondidos`} />
        <Kpi label="OS andamento" value={String(inProgress.length)} dark />
        <Kpi label="Conversão" value={`${conv}%`} />
        <Kpi label="Faturamento" value={`R$ ${revenue.toLocaleString('pt-BR')}`} lime />
      </View>

      {/* Vendas do marketplace */}
      <Pressable style={styles.salesCard} onPress={() => router.push('/vendas')}>
        <View style={styles.salesIcon}><Text style={{ fontSize: 20 }}>🛍️</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.salesTitle}>Vendas do marketplace</Text>
          <Text style={styles.salesSub}>Pedidos de produtos · separar e entregar</Text>
        </View>
        <Text style={styles.salesArrow}>→</Text>
      </Pressable>

      {/* Orçamentos pendentes */}
      <Card style={{ marginTop: 4 }}>
        <CardHeader title="Orçamentos pendentes" count={pending.length} actionLabel="Ver todos →" onAction={() => router.push('/orcamentos')} />
        {pending.length === 0 ? (
          <Text style={styles.muted}>Nenhum no momento.</Text>
        ) : (
          pending.slice(0, 4).map((t) => {
            const name = getDeviceName(t.request!.device);
            return (
              <Pressable key={t.id} style={styles.rowItem} onPress={() => router.push(`/solicitacao/${t.request!.id}`)}>
                <View style={styles.thumb}><Text style={{ fontSize: 18 }}>📱</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{name}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{t.request!.description}</Text>
                </View>
                <Text style={styles.rowDist}>{distanceLabel(t.distance_m)}</Text>
              </Pressable>
            );
          })
        )}
      </Card>

      {/* Reputação */}
      <Card style={{ marginTop: 14, backgroundColor: colors.ink }}>
        <View style={styles.repHead}>
          <View style={styles.repAvatar}><Text style={styles.repAvatarText}>{shop.name.slice(0, 2).toUpperCase()}</Text></View>
          <View>
            <Text style={styles.repName}>{shop.name}</Text>
            <Text style={styles.repVerified}>✓ Verificada pela zllo</Text>
          </View>
        </View>
        <View style={styles.repNotes}>
          <RepNote label="Nota zllo" value={shop.rating?.toFixed(1) ?? '—'} />
          <RepNote label="Avaliações" value={String(shop.reviews_count ?? 0)} />
        </View>
      </Card>

      {/* OS em andamento */}
      <Card style={{ marginTop: 14 }}>
        <CardHeader title="OS em andamento" count={inProgress.length} actionLabel="Ver todas →" onAction={() => router.push('/ordens')} />
        {inProgress.length === 0 ? (
          <Text style={styles.muted}>Nenhuma OS ativa.</Text>
        ) : (
          inProgress.slice(0, 5).map((o) => {
            const name = getDeviceName(o.device);
            return (
              <Pressable key={o.id} style={styles.osRow} onPress={() => router.push(`/os/${o.id}`)}>
                <View style={[styles.dotSm, { backgroundColor: colors.blue }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{name}</Text>
                  <Text style={styles.rowSub}>{statusLabel(o.status)}</Text>
                </View>
                <Text style={styles.rowDist}>R$ {o.value.toLocaleString('pt-BR')}</Text>
              </Pressable>
            );
          })
        )}
      </Card>

      {/* Faturamento da semana */}
      <Card style={{ marginTop: 14, backgroundColor: colors.lime, marginBottom: 8 }}>
        <Text style={styles.weekTitle}>Faturamento da semana</Text>
        <Text style={styles.weekValue}>R$ {weekRevenue.toLocaleString('pt-BR')}</Text>
        <View style={styles.chart}>
          {week.map((b, i) => {
            const h = b.total === 0 ? 4 : Math.round((b.total / weekMax) * 100);
            return (
              <View key={i} style={styles.barCol}>
                <View style={[styles.bar, { height: `${h}%`, backgroundColor: b.today ? colors.blue : colors.ink }]} />
                <Text style={styles.barLabel}>{b.d}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

function Kpi({ label, value, delta, dark, lime }: { label: string; value: string; delta?: string; dark?: boolean; lime?: boolean }) {
  const bg = dark ? colors.ink : lime ? colors.lime : colors.white;
  const fg = dark ? colors.white : colors.ink;
  return (
    <View style={[styles.kpi, { backgroundColor: bg, borderColor: dark ? colors.ink : lime ? colors.lime : colors.gray200 }]}>
      <Text style={[styles.kpiLabel, { color: dark ? '#A1A1A1' : colors.gray600 }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {delta ? <Text style={[styles.kpiDelta, { color: dark ? colors.lime : colors.green }]}>{delta}</Text> : null}
    </View>
  );
}

function RepNote({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.repNote}>
      <Text style={styles.repNoteLabel}>{label}</Text>
      <Text style={styles.repNoteValue}><Text style={{ color: colors.lime }}>★ </Text>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', backgroundColor: colors.blue, borderRadius: radius['3xl'], padding: 20, overflow: 'hidden', marginBottom: 14 },
  heroTitle: { fontFamily: fonts.head, fontSize: 18, color: colors.white, letterSpacing: -0.3 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, marginBottom: 14 },
  heroBtn: { alignSelf: 'flex-start', backgroundColor: colors.lime, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 9 },
  heroBtnText: { fontFamily: fonts.headBold, fontSize: 12, color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  heroZ: { position: 'absolute', right: -6, bottom: -40, fontFamily: fonts.headBlack, fontSize: 150, color: 'rgba(211,254,24,0.12)' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpi: { width: '47.8%', flexGrow: 1, borderWidth: 1, borderRadius: radius.xl, padding: 14 },
  kpiLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  kpiValue: { fontFamily: fonts.headBlack, fontSize: 24, letterSpacing: -1, marginTop: 6 },
  kpiDelta: { fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 6 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, paddingVertical: 6 },
  salesCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 14, marginBottom: 14 },
  salesIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  salesTitle: { fontFamily: fonts.head, fontSize: 15, color: colors.ink },
  salesSub: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 2 },
  salesArrow: { fontFamily: fonts.headBold, fontSize: 18, color: colors.blue },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 12, marginBottom: 8 },
  thumb: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  rowSub: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 1 },
  rowDist: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.ink },
  repHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  repAvatar: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  repAvatarText: { fontFamily: fonts.headBlack, fontSize: 16, color: colors.ink },
  repName: { fontFamily: fonts.head, fontSize: 15, color: colors.white },
  repVerified: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.lime, marginTop: 2 },
  repNotes: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.lg, padding: 14 },
  repNote: { flex: 1 },
  repNoteLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5 },
  repNoteValue: { fontFamily: fonts.headBlack, fontSize: 20, color: colors.white, marginTop: 4 },
  osRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  dotSm: { width: 10, height: 10, borderRadius: 5 },
  weekTitle: { fontFamily: fonts.head, fontSize: 15, color: colors.ink },
  weekValue: { fontFamily: fonts.headBlack, fontSize: 30, color: colors.ink, letterSpacing: -1.5, marginTop: 6, marginBottom: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 64 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 6 },
  barLabel: { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.ink, marginTop: 4 },
});
