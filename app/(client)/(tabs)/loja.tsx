import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
  const [favorites, setFavorites] = useState<string[]>([]);

  const load = useCallback(async () => {
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cats = useMemo(
    () => CATEGORIES.filter((c) => (rows ?? []).some((p) => p.category === c)),
    [rows]
  );

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (cat) list = list.filter((p) => p.category === cat);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        `${p.name} ${p.shop_name} ${p.category ?? ''}`.toLowerCase().includes(term)
      );
    }
    return list;
  }, [rows, q, cat]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  return (
    <Screen background="#FFFFFF" padded={false}>
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
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
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
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
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
        <Pressable style={styles.filterButton} onPress={() => {}}>
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
            <ErrorState onRetry={load} />
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
                      <Image source={{ uri: p.photos[0] }} style={styles.photo} contentFit="cover" />
                    ) : (
                      <View style={[styles.photo, styles.photoPlaceholder]}>
                        <Ionicons name="cube-outline" size={26} color="#9CA3AF" />
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
                        color={isFavorited ? '#FF4D4D' : '#1E1E1E'}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E5E7EB',
  },
  chipsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  activeChip: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  activeChipText: {
    color: colors.white,
  },
  inactiveChip: {
    backgroundColor: '#F3F4F6',
    borderColor: 'transparent',
  },
  inactiveChipText: {
    color: colors.ink,
  },
  listContent: {
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  card: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F3F4F6',
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
    color: '#6B7280',
    flex: 1,
  },
});
