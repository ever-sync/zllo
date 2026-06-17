import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image) as any;
import { StatusBar } from 'expo-status-bar';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/states';
import { SegmentedChip, SegmentedChipRow } from '@/components/ui/segmented-chips';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { geocodeCEP } from '@/lib/geocode';
import { CATEGORIES, distanceLabel, priceBRL, type BrowseProduct } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { colors, fonts, radius } from '@/theme';

export default function Loja() {
  const router = useRouter();
  const { profile } = useAuth();
  const { count } = useCart();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);

  const { data, error: queryError, refetch } = useQuery({
    queryKey: ['browse_products', profile?.cep],
    queryFn: async () => {
      let coords: { lat: number; lng: number } | null = null;
      if (profile?.cep) coords = await geocodeCEP(profile.cep);
      const { data, error } = await supabase.rpc('browse_products', {
        p_lat: coords?.lat ?? undefined,
        p_lng: coords?.lng ?? undefined,
      });
      if (error) throw error;
      return (data as BrowseProduct[]) ?? [];
    },
  });

  const rows = data ?? null;
  const loadError = !!queryError;

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const cats = useMemo(
    () => CATEGORIES.filter((c) => (rows ?? []).some((p) => p.category === c)),
    [rows]
  );

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (cat) list = list.filter((p) => p.category === cat);
    if (maxDistance) {
      list = list.filter((p) => p.distance_m ? p.distance_m <= maxDistance * 1000 : true);
    }
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        `${p.name} ${p.shop_name} ${p.category ?? ''}`.toLowerCase().includes(term)
      );
    }
    return list;
  }, [rows, q, cat, maxDistance]);

  const toggleFavorite = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <Screen background={colors.white} padded={false}>
      <StatusBar style="dark" />

      {/* Top Header / Location Bar */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-sharp" size={18} color="#6C5CE7" />
          <Text style={styles.locationText} numberOfLines={1}>
            {profile?.neighborhood ?? 'Sua Região'}
          </Text>
          <View style={styles.plusBadge}>
            <Text style={styles.plusBadgeText}>+1</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.gray600} />
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.cartBtn} onPress={() => router.push('/carrinho')} hitSlop={8}>
            <Ionicons name="cart-outline" size={22} color={colors.ink} />
            {count > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} style={{ marginLeft: 16 }} />
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={colors.gray400} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar..."
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
      </View>

      {/* Filter Action Bar */}
      <View style={styles.filterBar}>
        <Pressable style={styles.filterButton} onPress={() => {}}>
          <Ionicons name="bookmark-outline" size={16} color={colors.ink} />
          <Text style={styles.filterButtonText}>Salvar Busca</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.filterButton} onPress={() => setFiltersOpen(true)}>
          <Ionicons name="options-outline" size={16} color={colors.ink} />
          <Text style={styles.filterButtonText}>Filtros</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.filterButton} onPress={() => {}}>
          <Ionicons name="swap-vertical-outline" size={16} color={colors.ink} />
          <Text style={styles.filterButtonText}>Ordenar</Text>
        </Pressable>
      </View>

      {/* Category Chips (Styled for Light Theme) */}
      {cats.length ? (
        <SegmentedChipRow scroll style={styles.chipsContainer}>
          <SegmentedChip
            label="Todos"
            active={cat === null}
            onPress={() => setCat(null)}
            style={cat === null ? styles.activeChip : styles.inactiveChip}
            textStyle={cat === null ? styles.activeChipText : styles.inactiveChipText}
          />
          {cats.map((c) => (
            <SegmentedChip
              key={c}
              label={c}
              active={cat === c}
              onPress={() => setCat(c)}
              style={cat === c ? styles.activeChip : styles.inactiveChip}
              textStyle={cat === c ? styles.activeChipText : styles.inactiveChipText}
            />
          ))}
        </SegmentedChipRow>
      ) : null}

      {/* Main List */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {loadError ? (
          <View style={{ padding: 16 }}>
            <ErrorState onRetry={() => refetch()} />
          </View>
        ) : rows === null ? (
          <View style={{ gap: 10, padding: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 16 }}>
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
            />
          </View>
        ) : (
          <View>
            {filtered.map((p) => {
              const dist = distanceLabel(p.distance_m);
              const isFavorited = favorites.includes(p.id);

              // Generate badges dynamically
              const itemBadges: string[] = [];
              if (p.category === 'Película') {
                itemBadges.push('Garantia Zllo');
                itemBadges.push('Instalação inclusa');
              } else if (p.category === 'Carregador' || p.category === 'Cabo') {
                itemBadges.push('Homologado');
                itemBadges.push('Original');
              } else {
                itemBadges.push('Retirada em loja');
                itemBadges.push('Garantia Zllo');
              }
              if (p.price >= 100) {
                itemBadges.push('Sem juros');
              }

              return (
                <Pressable
                  key={p.id}
                  style={styles.card}
                  onPress={() => router.push(`/produto/${p.id}`)}
                >
                  <View style={styles.photoContainer}>
                    {p.photos?.[0] ? (
                      <AnimatedImage source={{ uri: p.photos[0] }} style={styles.photo} sharedTransitionTag={`product-photo-${p.id}`} contentFit="cover" />
                    ) : (
                      <View style={[styles.photo, styles.photoPlaceholder]}>
                        <Ionicons name="cube-outline" size={26} color={colors.gray400} />
                      </View>
                    )}
                    <Pressable
                      style={styles.heartBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(p.id);
                      }}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={isFavorited ? 'heart' : 'heart-outline'}
                        size={16}
                        color={isFavorited ? '#FF4D4D' : colors.ink}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {p.name}
                    </Text>

                    <View style={styles.badgesRow}>
                      {itemBadges.map((badge, idx) => (
                        <View key={idx} style={styles.badge}>
                          <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.cardPrice}>{priceBRL(p.price)}</Text>

                    <View style={styles.statusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Online</Text>
                      <Text style={styles.locationSubText} numberOfLines={1}>
                        {` · Agora · ${p.shop_name}${dist ? ` (${dist})` : ''}`}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filtros</Text>

            <Text style={styles.modalLabel}>Raio de distância máximo</Text>
            <View style={styles.radiusRow}>
              {[
                { label: 'Qualquer', val: null },
                { label: '5 km', val: 5 },
                { label: '10 km', val: 10 },
                { label: '20 km', val: 20 },
                { label: '50 km', val: 50 },
              ].map((opt) => {
                const active = maxDistance === opt.val;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => setMaxDistance(opt.val)}
                    style={[styles.radiusChip, active && styles.radiusChipActive]}
                  >
                    <Text style={[styles.radiusText, active && styles.radiusTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Button label="Aplicar filtros" onPress={() => setFiltersOpen(false)} style={{ marginTop: 28, alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  locationText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginHorizontal: 6,
    maxWidth: '60%',
  },
  plusBadge: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  plusBadgeText: {
    fontFamily: fonts.headBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBtn: {
    position: 'relative',
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4D4D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontFamily: fonts.headBold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.gray100,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.ink,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray200,
  },
  chipsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
  activeChip: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  activeChipText: {
    color: colors.white,
  },
  inactiveChip: {
    backgroundColor: colors.gray100,
    borderColor: 'transparent',
  },
  inactiveChipText: {
    color: colors.ink,
  },
  listContent: {
    paddingBottom: 24,
    backgroundColor: colors.white,
  },
  card: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'flex-start',
    backgroundColor: colors.white,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 12,
  },
  photoPlaceholder: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
    borderRadius: 12,
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white === '#FFFFFF' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  badge: {
    backgroundColor: 'rgba(108, 92, 231, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(108, 92, 231, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: '#6C5CE7',
  },
  cardPrice: {
    fontFamily: fonts.headBold,
    fontSize: 18,
    color: colors.ink,
    marginTop: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#10B981',
  },
  locationSubText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.gray600,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: fonts.headBlack,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: fonts.headBold,
    fontSize: 13,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radiusChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  radiusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.gray600,
  },
  radiusTextActive: {
    color: colors.white,
  },
});
