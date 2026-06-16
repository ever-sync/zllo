import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ClientHeader } from '@/components/ui/client-header';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/states';
import { SegmentedChip, SegmentedChipRow } from '@/components/ui/segmented-chips';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { geocodeCEP } from '@/lib/geocode';
import { CATEGORIES, distanceLabel, priceBRL, type BrowseProduct } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export default function Loja() {
  const router = useRouter();
  const { profile } = useAuth();
  const { count } = useCart();
  const [rows, setRows] = useState<BrowseProduct[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Geocodifica o CEP do perfil (sem pedir permissão) para ordenar por distância.
    let coords: { lat: number; lng: number } | null = null;
    if (profile?.cep) coords = await geocodeCEP(profile.cep);
    const { data, error } = await supabase.rpc('browse_products', {
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
    });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setRows((data as BrowseProduct[]) ?? []);
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cats = useMemo(
    () => CATEGORIES.filter((c) => (rows ?? []).some((p) => p.category === c)),
    [rows],
  );

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (cat) list = list.filter((p) => p.category === cat);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        `${p.name} ${p.shop_name} ${p.category ?? ''}`.toLowerCase().includes(term),
      );
    }
    return list;
  }, [rows, q, cat]);

  return (
    <Screen background={colors.canvas}>
      <ClientHeader
        title="Loja"
        subtitle="Produtos das assistências perto de você"
        right={
          <Pressable style={styles.cartBtn} onPress={() => router.push('/carrinho')} hitSlop={8}>
            <Ionicons name="cart-outline" size={22} color={colors.ink} />
            {count > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.gray400} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar produto, loja…"
          placeholderTextColor={colors.gray400}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.gray400} />
          </Pressable>
        ) : null}
      </View>

      {cats.length ? (
        <SegmentedChipRow scroll style={styles.chips}>
          <SegmentedChip label="Todos" active={cat === null} onPress={() => setCat(null)} />
          {cats.map((c) => (
            <SegmentedChip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />
          ))}
        </SegmentedChipRow>
      ) : null}

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : rows === null ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title={q || cat ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
          description={
            q || cat
              ? 'Tente outro termo ou remova os filtros.'
              : 'As assistências da sua região ainda não publicaram produtos.'
          }
          actionLabel={q || cat ? 'Limpar busca' : undefined}
          onAction={q || cat ? () => { setQ(''); setCat(null); } : undefined}
          style={{ marginTop: 16 }}
        />
      ) : (
        <View style={{ gap: 12, marginTop: 4 }}>
          {filtered.map((p) => {
            const dist = distanceLabel(p.distance_m);
            return (
              <Pressable key={p.id} style={styles.card} onPress={() => router.push(`/produto/${p.id}`)}>
                {p.photos?.[0] ? (
                  <Image source={{ uri: p.photos[0] }} style={styles.photo} contentFit="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Ionicons name="cube-outline" size={26} color={colors.gray400} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.cardShop} numberOfLines={1}>
                    {p.shop_name}
                    {dist ? ` · ${dist}` : ''}
                  </Text>
                  <Text style={styles.cardPrice}>{priceBRL(p.price)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cartBtn: { padding: 4 },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontFamily: fonts.headBold, fontSize: 10, color: colors.white },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  chips: { gap: 8, paddingVertical: 14, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.headBold, fontSize: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 12,
  },
  photo: { width: 72, height: 72, borderRadius: radius.lg },
  photoPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, justifyContent: 'center', gap: 2 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  cardShop: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600 },
  cardPrice: { fontFamily: fonts.headBlack, fontSize: 17, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
});
