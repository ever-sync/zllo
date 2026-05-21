import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type ListingDetail = {
  id: string;
  seller_id: string | null;
  title: string;
  brand: string | null;
  model: string | null;
  price: number;
  photos: string[];
  description: string | null;
  city: string | null;
  created_at: string;
};

const PHOTO_W = Dimensions.get('window').width - 40; // largura útil dentro do padding do Screen

export default function AnuncioDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [listing, setListing] = useState<ListingDetail | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('listings')
      .select('id, seller_id, title, brand, model, price, photos, description, city, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setListing((data as ListingDetail) ?? null);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = () => {
    Alert.alert('Excluir anúncio?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          setDeleting(true);
          const { error } = await supabase.from('listings').delete().eq('id', id);
          setDeleting(false);
          if (error) {
            Alert.alert('Ops', error.message);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  if (loadError) {
    return (
      <Screen>
        <AppHeader title="Anúncio" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }
  if (listing === undefined) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 60 }} />
      </Screen>
    );
  }
  if (listing === null) {
    return (
      <Screen>
        <AppHeader title="Anúncio" />
        <Text style={styles.muted}>Anúncio não encontrado ou removido.</Text>
      </Screen>
    );
  }

  const isOwner = listing.seller_id === session?.user.id;
  const specs = [listing.brand, listing.model].filter(Boolean).join(' · ');

  return (
    <Screen>
      <AppHeader title="Anúncio" subtitle={specs || undefined} />

      {listing.photos?.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {listing.photos.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={[styles.photo, { width: PHOTO_W }]} contentFit="cover" />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder, { width: PHOTO_W }]}>
          <Ionicons name="phone-portrait-outline" size={40} color={colors.gray400} />
        </View>
      )}

      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>R$ {listing.price.toLocaleString('pt-BR')}</Text>

      <View style={styles.metaRow}>
        {specs ? <Meta icon="phone-portrait-outline" text={specs} /> : null}
        {listing.city ? <Meta icon="location-outline" text={listing.city} /> : null}
      </View>

      {listing.description ? (
        <>
          <Text style={styles.section}>Descrição</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>{listing.description}</Text>
          </View>
        </>
      ) : null}

      {isOwner ? (
        <Button label="Excluir anúncio" variant="secondary" loading={deleting} onPress={onDelete} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.contactNote}>
          <Ionicons name="information-circle-outline" size={18} color={colors.gray600} />
          <Text style={styles.contactText}>Anúncio publicado por outro usuário da zllo.</Text>
        </View>
      )}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.gray600} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  gallery: { marginBottom: 16 },
  photo: { height: 240, borderRadius: radius['2xl'], marginRight: 0 },
  photoPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.headBlack, fontSize: 22, color: colors.ink, letterSpacing: -0.5 },
  price: { fontFamily: fonts.headBlack, fontSize: 26, color: colors.blue, letterSpacing: -1, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.gray600 },
  section: { fontFamily: fonts.headBold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  descBox: { backgroundColor: colors.gray100, borderRadius: radius.lg, padding: 14 },
  descText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 21 },
  contactNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.gray100, borderRadius: radius.lg, padding: 14, marginTop: 24 },
  contactText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, flex: 1 },
});
