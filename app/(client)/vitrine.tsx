import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export type Listing = {
  id: string;
  seller_id: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  price: number;
  photos: string[];
  city: string | null;
  created_at: string;
};

const LISTING_COLUMNS = 'id, seller_id, title, brand, model, price, photos, city, created_at';

export default function Vitrine() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<'todos' | 'meus'>('todos');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select(LISTING_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setRows((data as Listing[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (tab === 'meus') list = list.filter((l) => l.seller_id === session?.user.id);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((l) => `${l.title} ${l.brand ?? ''} ${l.model ?? ''}`.toLowerCase().includes(term));
    }
    return list;
  }, [rows, tab, q, session]);

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Vitrine" subtitle="Celulares à venda" />

      <Button label="Anunciar meu celular" variant="accent" onPress={() => router.push('/(client)/anuncio-novo')} />

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.gray400} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar por modelo, marca…"
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

      <View style={styles.chips}>
        <Chip label="Todos" active={tab === 'todos'} onPress={() => setTab('todos')} />
        <Chip label="Meus anúncios" active={tab === 'meus'} onPress={() => setTab('meus')} />
      </View>

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : rows === null ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pricetags-outline" size={32} color={colors.gray400} />
          <Text style={styles.emptyText}>
            {tab === 'meus'
              ? 'Você ainda não anunciou nenhum celular.'
              : q
                ? 'Nenhum anúncio encontrado para essa busca.'
                : 'Ainda não há celulares à venda por aqui.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 4 }}>
          {filtered.map((l) => (
            <Pressable key={l.id} style={styles.card} onPress={() => router.push(`/(client)/anuncio/${l.id}`)}>
              {l.photos?.[0] ? (
                <Image source={{ uri: l.photos[0] }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Ionicons name="phone-portrait-outline" size={28} color={colors.gray400} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{l.title}</Text>
                <Text style={styles.cardSpecs} numberOfLines={1}>
                  {[l.brand, l.model].filter(Boolean).join(' · ') || 'Celular'}
                </Text>
                <Text style={styles.cardPrice}>R$ {l.price.toLocaleString('pt-BR')}</Text>
                {l.city ? (
                  <View style={styles.cityRow}>
                    <Ionicons name="location-outline" size={12} color={colors.gray600} />
                    <Text style={styles.cityText}>{l.city}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? colors.ink : colors.white, borderColor: active ? colors.ink : colors.gray200 }]}>
      <Text style={[styles.chipText, { color: active ? colors.white : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.headBold, fontSize: 12 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 12,
  },
  photo: { width: 84, height: 84, borderRadius: radius.lg },
  photoPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, justifyContent: 'center', gap: 2 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  cardSpecs: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600 },
  cardPrice: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cityText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray600 },
});
