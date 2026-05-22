import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useAuth, type Profile } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { priceBRL } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Shipping = 'retirada' | 'entrega';

function profileAddress(p: Profile | null): string {
  if (!p?.street) return '';
  const linha1 = [p.street, p.number].filter(Boolean).join(', ');
  const local = p.uf ? `${p.city}/${p.uf}` : p.city;
  return [linha1, p.complement, p.neighborhood, local].filter(Boolean).join(' · ');
}

export default function Checkout() {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, shopId, shopName, total, clear } = useCart();
  const [shipping, setShipping] = useState<Shipping>('retirada');
  const [address, setAddress] = useState(profileAddress(profile));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (items.length === 0 || !shopId) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Checkout" />
        <Text style={styles.muted}>Seu carrinho está vazio.</Text>
      </Screen>
    );
  }

  const onConfirm = async () => {
    setError(null);
    if (shipping === 'entrega' && address.trim().length < 5) {
      setError('Informe o endereço de entrega.');
      return;
    }
    setLoading(true);
    const { data: orderId, error: rpcErr } = await supabase.rpc('create_product_order', {
      p_shop_id: shopId,
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      p_shipping_type: shipping,
      p_address: shipping === 'entrega' ? address.trim() : null,
    });
    setLoading(false);
    if (rpcErr) {
      // Carrinho desatualizado (loja/produto não existe mais) → esvazia e manda pra Loja.
      if (/indispon|carrinho|constraint|foreign key/i.test(rpcErr.message)) {
        clear();
        Alert.alert(
          'Carrinho desatualizado',
          'Os itens não estão mais disponíveis. Esvaziamos o carrinho — escolha novamente na Loja.',
          [{ text: 'Ir para a Loja', onPress: () => router.replace('/(client)/(tabs)/loja') }],
        );
        return;
      }
      setError(rpcErr.message);
      return;
    }
    clear();
    router.replace(`/(client)/pedido-produto/${orderId as string}`);
  };

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Checkout" subtitle={shopName ?? undefined} />

      <Text style={styles.label}>Itens</Text>
      <View style={styles.box}>
        {items.map((it) => (
          <View key={it.product_id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{it.qty}x {it.name}</Text>
            <Text style={styles.itemVal}>{priceBRL(it.price * it.qty)}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 20 }]}>Como receber?</Text>
      <View style={styles.shipRow}>
        <ShipOption icon="walk-outline" label="Retirar na loja" active={shipping === 'retirada'} onPress={() => setShipping('retirada')} />
        <ShipOption icon="bicycle-outline" label="Entrega" active={shipping === 'entrega'} onPress={() => setShipping('entrega')} />
      </View>

      {shipping === 'entrega' ? (
        <>
          <Text style={[styles.label, { marginTop: 16 }]}>Endereço de entrega</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Rua, número, bairro, cidade…"
            placeholderTextColor={colors.gray400}
            multiline
            style={styles.addressInput}
          />
        </>
      ) : null}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{priceBRL(total)}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Confirmar e pagar com Pix" onPress={onConfirm} loading={loading} style={{ marginTop: 16 }} />
      <Text style={styles.note}>Você gera o Pix na próxima tela. O pedido fica reservado até o pagamento.</Text>
    </Screen>
  );
}

function ShipOption({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.shipOption, { borderColor: active ? colors.blue : colors.gray200, backgroundColor: active ? '#EEEEFF' : colors.white }]}
    >
      <Ionicons name={icon} size={22} color={active ? colors.blue : colors.gray600} />
      <Text style={[styles.shipText, { color: active ? colors.blue : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 8 },
  box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 14, gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  itemVal: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  shipRow: { flexDirection: 'row', gap: 10 },
  shipOption: { flex: 1, alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 18 },
  shipText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  addressInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  totalLabel: { fontFamily: fonts.headBold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.headBlack, fontSize: 24, color: colors.blue, letterSpacing: -0.5 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginTop: 14 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, textAlign: 'center', marginTop: 10 },
});
