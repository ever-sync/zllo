import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type RankRow = { id: string; name: string; rating: number; reviews_count: number };
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client: { full_name: string | null } | null;
};

export default function Reputacao() {
  const { shop } = useShop();
  const [ranking, setRanking] = useState<RankRow[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const { data: r, error: rErr } = await supabase
      .from('shops')
      .select('id, name, rating, reviews_count')
      .order('rating', { ascending: false })
      .order('reviews_count', { ascending: false })
      .limit(5);
    if (rErr) {
      setLoadError(true);
      return;
    }
    setRanking((r as RankRow[]) ?? []);

    if (shop) {
      const { data: rev, error: revErr } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, client:profiles(full_name)')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (revErr) {
        setLoadError(true);
        return;
      }
      setReviews((rev as unknown as Review[]) ?? []);
    } else {
      setReviews([]);
    }
    setLoadError(false);
  }, [shop]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rating = shop?.rating ?? 0;
  const reviewsCount = shop?.reviews_count ?? 0;
  const list = reviews ?? [];
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const n = list.filter((rv) => rv.rating === star).length;
    return { star, pct: list.length ? Math.round((n / list.length) * 100) : 0 };
  });

  if (loadError) {
    return (
      <Screen>
        <AppHeader title="Reputação" subtitle="Notas, ranking e avaliações" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Reputação" subtitle="Notas, ranking e avaliações" />

      <Card style={{ backgroundColor: colors.ink, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
          <View>
            <Text style={styles.bigRating}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingSub}>★★★★★ · {reviewsCount} avaliações</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {dist.map((d) => (
              <View key={d.star} style={styles.distRow}>
                <Text style={styles.distNum}>{d.star}</Text>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: `${d.pct}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Text style={styles.section}>Ranking por nota</Text>
        {ranking === null ? (
          <ActivityIndicator color={colors.blue} style={{ marginVertical: 12 }} />
        ) : (
          ranking.map((r, i) => {
            const you = r.id === shop?.id;
            return (
              <View key={r.id} style={[styles.rankRow, you && { backgroundColor: colors.lime, borderRadius: radius.md, paddingHorizontal: 10 }]}>
                <Text style={styles.rankPos}>{i + 1}</Text>
                <Text style={styles.rankName}>
                  {r.name} {you ? <Text style={styles.you}>VOCÊ</Text> : ''}
                </Text>
                <Text style={styles.rankRating}>★ {r.rating.toFixed(1)}</Text>
              </View>
            );
          })
        )}
      </Card>

      <Card>
        <Text style={styles.section}>Avaliações recentes</Text>
        {reviews === null ? (
          <ActivityIndicator color={colors.blue} style={{ marginVertical: 12 }} />
        ) : list.length === 0 ? (
          <Text style={styles.note}>Ainda não há avaliações. Conclua reparos para receber as primeiras.</Text>
        ) : (
          list.slice(0, 8).map((r, i) => (
            <View key={r.id} style={[styles.review, i < Math.min(list.length, 8) - 1 && styles.reviewBorder]}>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewName}>{r.client?.full_name?.split(' ')[0] ?? 'Cliente'}</Text>
                <Text style={styles.stars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
              </View>
              {r.comment ? <Text style={styles.reviewText}>{r.comment}</Text> : null}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigRating: { fontFamily: fonts.headBlack, fontSize: 52, color: colors.lime, letterSpacing: -3 },
  ratingSub: { fontFamily: fonts.body, fontSize: 11, color: colors.gray400 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distNum: { fontFamily: fonts.body, fontSize: 11, color: colors.gray400, width: 10 },
  distTrack: { flex: 1, height: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: colors.lime },
  section: { fontFamily: fonts.head, fontSize: 15, color: colors.ink, marginBottom: 12 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rankPos: { fontFamily: fonts.headBlack, fontSize: 16, color: colors.ink, width: 22 },
  rankName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  you: { fontFamily: fonts.headBold, fontSize: 9, color: colors.blue },
  rankRating: { fontFamily: fonts.headBold, fontSize: 14, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, lineHeight: 18 },
  review: { paddingVertical: 12 },
  reviewBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  stars: { color: colors.amber, fontSize: 13 },
  reviewText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, lineHeight: 19 },
});
