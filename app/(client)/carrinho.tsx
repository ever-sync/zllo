import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useCart } from '@/lib/cart';
import { priceBRL } from '@/lib/products';
import { colors, fonts, radius } from '@/theme';

export default function Carrinho() {
  const router = useRouter();
  const { items, shopName, total, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Carrinho" />
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={36} color={colors.gray400} />
          <Text style={styles.emptyText}>Seu carrinho está vazio.</Text>
          <Button label="Ver produtos" variant="secondary" onPress={() => router.replace('/(client)/(tabs)/loja')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Carrinho" subtitle={shopName ?? undefined} />

      <View style={{ gap: 12 }}>
        {items.map((it) => (
          <View key={it.product_id} style={styles.card}>
            {it.photo ? (
              <Image source={{ uri: it.photo }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Ionicons name="cube-outline" size={24} color={colors.gray400} />
              </View>
            )}
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={2}>{it.name}</Text>
              <Text style={styles.price}>{priceBRL(it.price)}</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => (it.qty <= 1 ? remove(it.product_id) : setQty(it.product_id, it.qty - 1))} hitSlop={6}>
                  <Ionicons name={it.qty <= 1 ? 'trash-outline' : 'remove'} size={16} color={colors.ink} />
                </Pressable>
                <Text style={styles.qty}>{it.qty}</Text>
                <Pressable style={styles.stepBtn} onPress={() => setQty(it.product_id, it.qty + 1)} hitSlop={6}>
                  <Ionicons name="add" size={16} color={colors.ink} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.subtotal}>{priceBRL(it.price * it.qty)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{priceBRL(total)}</Text>
      </View>

      <Button label="Finalizar pedido" onPress={() => router.push('/(client)/checkout')} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 14, paddingVertical: 56 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 12,
  },
  photo: { width: 64, height: 64, borderRadius: radius.lg },
  photoPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  price: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontFamily: fonts.headBold, fontSize: 15, color: colors.ink, minWidth: 18, textAlign: 'center' },
  subtotal: { fontFamily: fonts.headBold, fontSize: 14, color: colors.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  totalLabel: { fontFamily: fonts.headBold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.headBlack, fontSize: 24, color: colors.blue, letterSpacing: -0.5 },
});
