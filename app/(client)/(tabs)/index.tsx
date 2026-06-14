import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClientTourModal } from '@/components/client-tour-modal';
import { ClientHeader } from '@/components/ui/client-header';
import { Screen } from '@/components/ui/screen';
import { EmptyState, SkeletonCard } from '@/components/ui/states';
import { hasSeenClientTour, markClientTourSeen } from '@/lib/client-tour';
import { getDeviceName } from '@/lib/format';
import { rankBadge, type RegionalRankRow } from '@/lib/ranking-badges';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type RecentRequest = {
  id: string;
  description: string;
  status: 'aberta' | 'fechada' | 'cancelada' | 'expirada';
  created_at: string;
  device: { brand: string | null; model: string | null; nickname: string | null } | null;
};

const STATUS: Record<RecentRequest['status'], { label: string; color: string }> = {
  aberta: { label: 'Recebendo orçamentos', color: colors.amber },
  fechada: { label: 'Em andamento', color: colors.green },
  cancelada: { label: 'Cancelada', color: colors.gray400 },
  expirada: { label: 'Expirada', color: colors.gray400 },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function ClientHome() {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentRequest[] | null>(null);
  const [stats, setStats] = useState<{ ativos: number; aparelhos: number }>({ ativos: 0, aparelhos: 0 });
  const [ranking, setRanking] = useState<RegionalRankRow[]>([]);
  const [tourVisible, setTourVisible] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('repair_requests')
      .select('id, description, status, created_at, device:devices(brand, model, nickname)')
      .order('created_at', { ascending: false })
      .limit(3);
    setRecent((data as unknown as RecentRequest[]) ?? []);

    const { count: ativos } = await supabase
      .from('repair_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['aberta', 'fechada']);
    const { count: aparelhos } = await supabase
      .from('devices')
      .select('id', { count: 'exact', head: true });
    setStats({ ativos: ativos ?? 0, aparelhos: aparelhos ?? 0 });

    const { data: rankData } = await supabase.rpc('get_regional_shop_ranking', { p_limit: 5 });
    setRanking((rankData as RegionalRankRow[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    hasSeenClientTour().then((seen) => {
      if (!seen) setTourVisible(true);
    });
  }, []);

  const finishTour = () => {
    void markClientTourSeen();
    setTourVisible(false);
  };

  return (
    <Screen background={colors.canvas}>
      <StatusBar style="dark" />

      <ClientTourModal
        visible={tourVisible}
        step={tourStep}
        onNext={() => {
          if (tourStep >= 2) finishTour();
          else setTourStep((s) => s + 1);
        }}
        onSkip={finishTour}
        onGoDevices={() => {
          finishTour();
          router.push('/(client)/aparelho-novo');
        }}
      />

      <ClientHeader greeting subtitle="O que você precisa hoje?" />

      {/* Card destaque: faixa lima + corpo escuro (CTA) */}
      <Pressable style={styles.heroCard} onPress={() => router.push('/(client)/solicitar')}>
        <View style={styles.heroBanner}>
          <Text style={styles.heroBannerLabel}>ASSISTÊNCIA</Text>
          <Text style={styles.heroBannerRight}>perto de você</Text>
        </View>
        <View style={styles.heroBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>Conserto de celular</Text>
            <Text style={styles.heroTitle}>Pedir assistência</Text>
          </View>
          <View style={styles.heroArrow}>
            <Ionicons name="arrow-forward" size={20} color={colors.ink} />
          </View>
        </View>
      </Pressable>

      {/* Par de métricas */}
      <View style={styles.metrics}>
        <Pressable style={styles.metricCard} onPress={() => router.push('/(client)/(tabs)/pedidos')}>
          <Text style={styles.metricLabel}>Pedidos ativos</Text>
          <Text style={styles.metricValue}>{stats.ativos}</Text>
          <Text style={[styles.metricDelta, { color: colors.green }]}>em andamento</Text>
        </Pressable>
        <Pressable style={styles.metricCard} onPress={() => router.push('/(client)/(tabs)/aparelhos')}>
          <Text style={styles.metricLabel}>Aparelhos</Text>
          <Text style={styles.metricValue}>{stats.aparelhos}</Text>
          <Text style={[styles.metricDelta, { color: colors.blue }]}>cadastrados</Text>
        </Pressable>
      </View>

      <Pressable style={styles.vitrineCard} onPress={() => router.push('/(client)/vitrine')}>
        <View style={styles.vitrineIcon}>
          <Ionicons name="pricetags-outline" size={18} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.vitrineTitle}>Vitrine P2P</Text>
          <Text style={styles.vitrineSub}>Compre ou venda celulares usados</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
      </Pressable>

      {ranking.length > 0 ? (
        <>
          <View style={[styles.sectionRow, { marginTop: 20 }]}>
            <Text style={styles.section}>Melhores assistências</Text>
            <Pressable onPress={() => router.push('/(client)/solicitar')} hitSlop={6}>
              <Text style={styles.seeAll}>Pedir assistência</Text>
            </Pressable>
          </View>
          <View style={{ gap: 8 }}>
            {ranking.map((row) => {
              const badge = rankBadge(row.badge);
              return (
                <Pressable
                  key={row.id}
                  onPress={() => router.push('/(client)/solicitar')}
                  style={[styles.rankCard, row.rank_position === 1 && { borderColor: colors.lime, backgroundColor: '#F7FEE7' }]}
                >
                  <Text style={styles.rankPos}>{row.rank_position}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName} numberOfLines={1}>{row.name}</Text>
                    <Text style={styles.rankMeta}>
                      ★ {Number(row.rating).toFixed(1)} · {row.reviews_count} aval. · {row.distance_km} km
                    </Text>
                  </View>
                  {badge ? (
                    <View style={[styles.rankBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.rankBadgeText, { color: badge.fg }]}>{badge.label}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Lista */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Meus pedidos</Text>
        <Pressable onPress={() => router.push('/(client)/(tabs)/pedidos')} hitSlop={6}>
          <Text style={styles.seeAll}>Ver todos</Text>
        </Pressable>
      </View>

      {recent === null ? (
        <View style={{ gap: 10 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : recent.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Nenhum pedido ainda"
          description="Peça assistência para receber orçamentos de lojas perto de você."
          actionLabel="Pedir assistência"
          onAction={() => router.push('/(client)/solicitar')}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {recent.map((r) => {
            const st = STATUS[r.status];
            return (
              <Pressable key={r.id} style={styles.newsCard} onPress={() => router.push(`/(client)/pedido/${r.id}`)}>
                <View style={styles.newsIcon}>
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.newsTitle} numberOfLines={1}>{getDeviceName(r.device)}</Text>
                  <Text style={styles.newsDesc} numberOfLines={1}>{r.description}</Text>
                  <View style={styles.newsMeta}>
                    <Text style={[styles.newsStatus, { color: st.color }]}>{st.label}</Text>
                    <Text style={styles.newsDate}>{fmtDate(r.created_at)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: radius['3xl'], overflow: 'hidden', marginTop: 20 },
  heroBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.lime, paddingHorizontal: 18, paddingVertical: 11 },
  heroBannerLabel: { fontFamily: fonts.headBold, fontSize: 11, color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.6 },
  heroBannerRight: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink, opacity: 0.7 },
  heroBody: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, paddingHorizontal: 18, paddingVertical: 18 },
  heroSmall: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' },
  heroTitle: { fontFamily: fonts.headBlack, fontSize: 24, color: colors.white, letterSpacing: -0.5, marginTop: 3 },
  heroArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },

  metrics: { flexDirection: 'row', gap: 12, marginTop: 12 },
  metricCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 16 },
  metricLabel: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.gray600 },
  metricValue: { fontFamily: fonts.headBlack, fontSize: 30, color: colors.ink, letterSpacing: -1, marginTop: 6 },
  metricDelta: { fontFamily: fonts.bodyBold, fontSize: 11.5, marginTop: 4 },

  vitrineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 14,
  },
  vitrineIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitrineTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink },
  vitrineSub: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 1 },

  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 12,
  },
  rankPos: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.ink,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: fonts.headBlack,
    fontSize: 13,
  },
  rankName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  rankMeta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray600, marginTop: 2 },
  rankBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  rankBadgeText: { fontFamily: fonts.bodyBold, fontSize: 9 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  section: { fontFamily: fonts.head, fontSize: 17, color: colors.ink },
  seeAll: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.blue },
  newsCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 14 },
  newsIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  newsTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink },
  newsDesc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 1 },
  newsMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  newsStatus: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
  newsDate: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray400 },
});
