import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useCart } from '@/lib/cart';
import { priceBRL } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Detail = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  photos: string[];
  shop_id: string;
  shop: { name: string } | null;
};

const PHOTO_W = Dimensions.get('window').width - 40;

export default function ProdutoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add, replaceWith } = useCart();
  const [p, setP] = useState<Detail | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, category, price, stock, photos, shop_id, shop:shops(name)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    // supabase-js (sem schema tipado) infere o embed to-one como array; em
    // runtime vem objeto único — daí o cast via unknown.
    setP((data as unknown as Detail) ?? null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loadError) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Produto" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }
  if (p === undefined) {
    return (
      <Screen scroll={false} background={colors.canvas}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 60 }} />
      </Screen>
    );
  }
  if (p === null) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Produto" />
        <Text style={styles.muted}>Produto não encontrado ou indisponível.</Text>
      </Screen>
    );
  }

  const outOfStock = p.stock <= 0;

  const confirmAdded = () =>
    Alert.alert('Adicionado ✓', `${p.name} foi para o carrinho.`, [
      { text: 'Continuar comprando' },
      { text: 'Ver carrinho', onPress: () => router.push('/(client)/carrinho') },
    ]);

  const onBuy = () => {
    const item = { product_id: p.id, name: p.name, price: p.price, photo: p.photos?.[0] ?? null };
    const shopName = p.shop?.name ?? 'Loja';
    const res = add(p.shop_id, shopName, item);
    if (res === 'other_shop') {
      Alert.alert(
        'Carrinho de outra loja',
        'Seu carrinho tem itens de outra assistência. Limpar e começar um novo com este produto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Limpar e adicionar',
            style: 'destructive',
            onPress: () => {
              replaceWith(p.shop_id, shopName, item);
              confirmAdded();
            },
          },
        ],
      );
      return;
    }
    confirmAdded();
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Produto" subtitle={p.shop?.name ?? undefined} />

      {p.photos?.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {p.photos.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={[styles.photo, { width: PHOTO_W }]} contentFit="cover" />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder, { width: PHOTO_W }]}>
          <Ionicons name="cube-outline" size={40} color={colors.gray400} />
        </View>
      )}

      <Text style={styles.title}>{p.name}</Text>
      <Text style={styles.price}>{priceBRL(p.price)}</Text>

      <View style={styles.metaRow}>
        {p.category ? <Meta icon="pricetag-outline" text={p.category} /> : null}
        {p.shop?.name ? <Meta icon="storefront-outline" text={p.shop.name} /> : null}
        <Meta icon="cube-outline" text={outOfStock ? 'Sem estoque' : `${p.stock} em estoque`} />
      </View>

      {p.description ? (
        <>
          <Text style={styles.section}>Descrição</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>{p.description}</Text>
          </View>
        </>
      ) : null}

      <Button
        label={outOfStock ? 'Indisponível' : 'Adicionar ao carrinho'}
        onPress={onBuy}
        disabled={outOfStock}
        style={{ marginTop: 24 }}
      />
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
  photo: { height: 240, borderRadius: radius['2xl'] },
  photoPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.headBlack, fontSize: 22, color: colors.ink, letterSpacing: -0.5 },
  price: { fontFamily: fonts.headBlack, fontSize: 26, color: colors.blue, letterSpacing: -1, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.gray600 },
  section: { fontFamily: fonts.headBold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  descBox: { backgroundColor: colors.gray100, borderRadius: radius.lg, padding: 14 },
  descText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 21 },
});
