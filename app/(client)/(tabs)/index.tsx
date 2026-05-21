import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';
import type { Listing } from '../vitrine';

export default function ClientHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'tudo bem';
  const [listings, setListings] = useState<Listing[] | null>(null);

  const loadListings = useCallback(async () => {
    const { data } = await supabase
      .from('listings')
      .select('id, seller_id, title, brand, model, price, photos, city, created_at')
      .order('created_at', { ascending: false })
      .limit(6);
    setListings((data as Listing[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { loadListings(); }, [loadListings]));

  return (
    <Screen>
      <Text style={styles.hello}>Olá, {firstName} 👋</Text>
      <Text style={styles.sub}>O que você precisa hoje?</Text>

      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Precisa consertar{'\n'}seu celular?</Text>
          <Text style={styles.heroSub}>Receba orçamentos de assistências perto de você.</Text>
        </View>
        <Ionicons name="phone-portrait-outline" size={52} color="rgba(255,255,255,0.25)" />
      </View>

      <Button label="Pedir assistência" variant="accent" onPress={() => router.push('/(client)/solicitar')} />

      <Pressable style={styles.link} onPress={() => router.push('/(client)/(tabs)/aparelhos')}>
        <Ionicons name="add-circle-outline" size={20} color={colors.blue} />
        <Text style={styles.linkText}>Cadastrar um aparelho</Text>
      </Pressable>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Celulares à venda</Text>
        <Pressable onPress={() => router.push('/(client)/vitrine')} hitSlop={6}>
          <Text style={styles.seeAll}>Ver tudo →</Text>
        </Pressable>
      </View>

      {listings === null ? (
        <ActivityIndicator color={colors.blue} style={{ marginVertical: 28 }} />
      ) : listings.length === 0 ? (
        <Pressable style={styles.placeholder} onPress={() => router.push('/(client)/anuncio-novo')}>
          <Ionicons name="pricetags-outline" size={28} color={colors.gray400} />
          <Text style={styles.placeholderText}>Seja o primeiro a anunciar um celular.</Text>
          <Text style={styles.placeholderCta}>Anunciar o meu →</Text>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
          {listings.map((l) => (
            <Pressable key={l.id} style={styles.adCard} onPress={() => router.push(`/(client)/anuncio/${l.id}`)}>
              {l.photos?.[0] ? (
                <Image source={{ uri: l.photos[0] }} style={styles.adPhoto} contentFit="cover" />
              ) : (
                <View style={[styles.adPhoto, styles.adPhotoPlaceholder]}>
                  <Ionicons name="phone-portrait-outline" size={26} color={colors.gray400} />
                </View>
              )}
              <Text style={styles.adTitle} numberOfLines={1}>{l.title}</Text>
              <Text style={styles.adPrice}>R$ {l.price.toLocaleString('pt-BR')}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: { fontFamily: fonts.headBlack, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, marginTop: 2, marginBottom: 18 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius['3xl'],
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroTitle: { fontFamily: fonts.head, fontSize: 20, color: colors.white, letterSpacing: -0.3 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.blue },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 12 },
  section: { fontFamily: fonts.head, fontSize: 16, color: colors.ink },
  seeAll: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.blue },
  placeholder: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    borderRadius: radius['2xl'],
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600 },
  placeholderCta: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.blue },
  adCard: { width: 150 },
  adPhoto: { width: 150, height: 150, borderRadius: radius['2xl'] },
  adPhotoPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  adTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginTop: 8 },
  adPrice: { fontFamily: fonts.headBlack, fontSize: 16, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
});
