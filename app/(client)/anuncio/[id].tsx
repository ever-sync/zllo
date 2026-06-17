import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';
import { confirmAsync, notify } from '@/lib/confirm';
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
  const [interestMsg, setInterestMsg] = useState('');
  const [interestBusy, setInterestBusy] = useState(false);
  const [contact, setContact] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [hasInterest, setHasInterest] = useState(false);
  const [ownerThreads, setOwnerThreads] = useState<
    { buyer_id: string; buyer_name: string | null; last_body: string | null }[]
  >([]);

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
    if (session?.user.id && data && (data as ListingDetail).seller_id === session.user.id) {
      const { data: threads } = await supabase.rpc('list_listing_interest_threads', { p_listing_id: id });
      setOwnerThreads((threads as typeof ownerThreads) ?? []);
    } else if (session?.user.id && data && (data as ListingDetail).seller_id !== session.user.id) {
      const { data: interest } = await supabase
        .from('listing_interests')
        .select('id')
        .eq('listing_id', id)
        .eq('buyer_id', session.user.id)
        .maybeSingle();
      if (interest) {
        setHasInterest(true);
        const { data: c } = await supabase.rpc('get_listing_seller_contact', { p_listing_id: id });
        if (c && typeof c === 'object') setContact(c as { full_name: string | null; phone: string | null });
      }
    }
  }, [id, session?.user.id]);

  const onDelete = async () => {
    if (!id) return;
    const ok = await confirmAsync('Excluir anúncio?', 'Esta ação não pode ser desfeita.', 'Excluir', true);
    if (!ok) return;
    setDeleting(true);
    const { error } = await supabase.from('listings').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    router.back();
  };

  const onInterest = async () => {
    if (!id) return;
    setInterestBusy(true);
    const { error } = await supabase.rpc('express_listing_interest', {
      p_listing_id: id,
      p_message: interestMsg.trim() || undefined,
    });
    setInterestBusy(false);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    setHasInterest(true);
    notify('Enviado!', 'O vendedor foi notificado. Você já pode ver o contato.');
    const { data: c } = await supabase.rpc('get_listing_seller_contact', { p_listing_id: id });
    if (c && typeof c === 'object') setContact(c as { full_name: string | null; phone: string | null });
  };

  const callSeller = () => {
    const phone = contact?.phone?.replace(/\D/g, '');
    if (phone) void Linking.openURL(`tel:${phone}`);
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Anúncio" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }
  if (listing === undefined) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Anúncio" />
        <View style={{ gap: 12, marginTop: 8 }}>
          <Skeleton height={PHOTO_W * 0.75} style={{ borderRadius: radius['2xl'] }} />
          <Skeleton height={24} width="65%" />
          <Skeleton height={16} width="35%" />
        </View>
      </Screen>
    );
  }
  if (listing === null) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Anúncio" />
        <EmptyState
          icon="pricetags-outline"
          title="Anúncio não encontrado"
          description="Este anúncio pode ter sido removido ou expirado."
          actionLabel="Voltar à vitrine"
          onAction={() => router.replace('/vitrine')}
        />
      </Screen>
    );
  }

  const isOwner = listing.seller_id === session?.user.id;
  const specs = [listing.brand, listing.model].filter(Boolean).join(' · ');

  return (
    <Screen background={colors.canvas}>
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
        <>
          <Button label="Editar anúncio" onPress={() => router.push(`/anuncio-editar/${listing.id}`)} style={{ marginTop: 24 }} />
          {ownerThreads.length > 0 ? (
            <View style={styles.threadsBox}>
              <Text style={styles.contactTitle}>Interessados</Text>
              {ownerThreads.map((t) => (
                <View key={t.buyer_id} style={styles.threadRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactText}>{t.buyer_name ?? 'Comprador'}</Text>
                    {t.last_body ? (
                      <Text style={styles.threadPreview} numberOfLines={1}>{t.last_body}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.chatBtn}
                    onPress={() => router.push(`/anuncio-chat/${listing.id}?buyerId=${t.buyer_id}`)}
                  >
                    <Text style={styles.chatBtnText}>Conversar</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyThreads}>Ninguém demonstrou interesse ainda.</Text>
          )}
          <Button label="Excluir anúncio" variant="secondary" loading={deleting} onPress={onDelete} style={{ marginTop: 10 }} />
        </>
      ) : hasInterest && contact ? (
        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Contato do vendedor</Text>
          <Text style={styles.contactText}>{contact.full_name ?? 'Vendedor'}</Text>
          {contact.phone ? (
            <Pressable onPress={callSeller}>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </Pressable>
          ) : null}
          <Button
            label="Conversar"
            onPress={() => router.push(`/anuncio-chat/${listing.id}`)}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : (
        <View style={{ marginTop: 24, gap: 10 }}>
          <TextField
            label="Mensagem (opcional)"
            placeholder="Olá, ainda está disponível?"
            value={interestMsg}
            onChangeText={setInterestMsg}
          />
          <Button label="Tenho interesse" loading={interestBusy} onPress={onInterest} />
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
  contactBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 16, marginTop: 24 },
  contactTitle: { fontFamily: fonts.headBold, fontSize: 12, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, marginTop: 6 },
  contactPhone: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.blue, marginTop: 4 },
  threadsBox: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 16, marginTop: 16, gap: 12 },
  threadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  threadPreview: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 2 },
  chatBtn: { backgroundColor: colors.blue, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  chatBtnText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  emptyThreads: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 16, textAlign: 'center' },
});
