import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { MessageBanner } from '@/components/ui/states';
import { SegmentedOption, SegmentedOptionRow } from '@/components/ui/segmented-chips';
import { useAuth, type Profile } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { notify } from '@/lib/confirm';
import {
  deliveryAddressFromProfile,
  formatDeliveryAddress,
  isDeliveryAddressComplete,
  type DeliveryAddress,
} from '@/lib/delivery-address';
import { priceBRL } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { fetchUberDeliveryQuote, type UberQuoteResult } from '@/lib/uber-quote';
import { colors, fonts, radius } from '@/theme';

type Shipping = 'retirada' | 'entrega';

function profileAddress(p: Profile | null): string {
  return formatDeliveryAddress(deliveryAddressFromProfile(p));
}

export default function Checkout() {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, shopId, shopName, total, clear } = useCart();
  const [shipping, setShipping] = useState<Shipping>('retirada');
  const [dropoff, setDropoff] = useState<DeliveryAddress>(() => deliveryAddressFromProfile(profile));
  const [addressText, setAddressText] = useState(profileAddress(profile));
  const [uber, setUber] = useState<UberQuoteResult>({ enabled: false });
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshQuote = useCallback(async () => {
    if (!shopId || shipping !== 'entrega') {
      setUber({ enabled: false });
      return;
    }
    if (!isDeliveryAddressComplete(dropoff)) {
      setUber({ enabled: false });
      return;
    }
    setQuoting(true);
    const q = await fetchUberDeliveryQuote(shopId, dropoff);
    setUber(q);
    setQuoting(false);
  }, [shopId, shipping, dropoff]);

  useEffect(() => {
    void refreshQuote();
  }, [refreshQuote]);

  if (items.length === 0 || !shopId) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Checkout" />
        <Text style={styles.muted}>Seu carrinho está vazio.</Text>
      </Screen>
    );
  }

  const deliveryFee = uber.enabled && uber.quote_id ? (uber.fee ?? 0) : 0;
  const grandTotal = total + deliveryFee;
  const useUber = uber.enabled && Boolean(uber.quote_id);

  const onConfirm = async () => {
    setError(null);
    if (shipping === 'entrega') {
      if (useUber) {
        if (!isDeliveryAddressComplete(dropoff)) {
          setError('Complete rua, número, cidade, UF e CEP.');
          return;
        }
        if (!uber.quote_id) {
          setError(uber.error ?? 'Não foi possível cotar a entrega.');
          return;
        }
      } else if (addressText.trim().length < 5) {
        setError('Informe o endereço de entrega.');
        return;
      }
    }
    setLoading(true);
    const { data: orderId, error: rpcErr } = await supabase.rpc('create_product_order', {
      p_shop_id: shopId,
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      p_shipping_type: shipping,
      p_address: shipping === 'entrega'
        ? (useUber ? formatDeliveryAddress(dropoff) : addressText.trim())
        : undefined,
      p_delivery_fee: useUber ? deliveryFee : 0,
      p_uber_quote_id: useUber ? uber.quote_id : undefined,
      p_dropoff_json: useUber ? dropoff : undefined,
      p_delivery_provider: useUber ? 'uber_direct' : undefined,
    });
    setLoading(false);
    if (rpcErr) {
      if (/indispon|carrinho|constraint|foreign key/i.test(rpcErr.message)) {
        clear();
        notify('Carrinho desatualizado', 'Os itens não estão mais disponíveis. Esvaziamos o carrinho — escolha novamente na Loja.');
        router.replace('/loja');
        return;
      }
      setError(rpcErr.message);
      return;
    }
    clear();
    router.replace(`/pedido-produto/${orderId as string}`);
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
      <SegmentedOptionRow>
        <SegmentedOption icon="walk-outline" label="Retirar na loja" active={shipping === 'retirada'} onPress={() => setShipping('retirada')} />
        <SegmentedOption icon="bicycle-outline" label="Entrega" active={shipping === 'entrega'} onPress={() => setShipping('entrega')} />
      </SegmentedOptionRow>

      {shipping === 'entrega' ? (
        <>
          {useUber || isDeliveryAddressComplete(dropoff) ? (
            <View style={styles.box}>
              <Field label="Rua" value={dropoff.street ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, street: v }))} />
              <Field label="Número" value={dropoff.number ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, number: v }))} />
              <Field label="CEP" value={dropoff.cep ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, cep: v }))} />
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Cidade" value={dropoff.city ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, city: v }))} />
                </View>
                <View style={{ width: 72 }}>
                  <Field label="UF" value={dropoff.uf ?? ''} onChange={(v) => setDropoff((d) => ({ ...d, uf: v.toUpperCase().slice(0, 2) }))} />
                </View>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Endereço de entrega</Text>
              <TextInput
                value={addressText}
                onChangeText={setAddressText}
                placeholder="Rua, número, bairro, cidade…"
                placeholderTextColor={colors.gray400}
                multiline
                style={styles.addressInput}
              />
            </>
          )}
          {quoting ? (
            <View style={styles.quoteRow}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.quoteHint}>Calculando frete…</Text>
            </View>
          ) : uber.enabled && uber.fee_label ? (
            <Text style={styles.quoteOk}>Frete Uber: {uber.fee_label}{uber.duration_minutes ? ` · ~${uber.duration_minutes} min` : ''}</Text>
          ) : uber.error ? (
            <Text style={styles.quoteErr}>{uber.error}</Text>
          ) : null}
        </>
      ) : null}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.totalValue}>{priceBRL(total)}</Text>
      </View>
      {deliveryFee > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Frete</Text>
          <Text style={styles.totalValue}>{priceBRL(deliveryFee)}</Text>
        </View>
      ) : null}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={[styles.totalValue, { fontSize: 24 }]}>{priceBRL(grandTotal)}</Text>
      </View>

      {error ? <MessageBanner variant="error">{error}</MessageBanner> : null}

      <Button label="Confirmar e pagar com Pix" onPress={onConfirm} loading={loading} style={{ marginTop: 16 }} />
      <Text style={styles.note}>Você gera o Pix na próxima tela. O pedido fica reservado até o pagamento.</Text>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.gray400}
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, marginBottom: 8 },
  box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 14, gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  itemVal: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
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
  row2: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.gray600, marginBottom: 4 },
  fieldInput: {
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  quoteHint: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600 },
  quoteOk: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.blue, marginTop: 10 },
  quoteErr: { fontFamily: fonts.body, fontSize: 13, color: colors.redText, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  totalLabel: { fontFamily: fonts.headBold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.blue, letterSpacing: -0.5 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, textAlign: 'center', marginTop: 10 },
});
