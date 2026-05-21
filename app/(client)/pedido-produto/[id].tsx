import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { priceBRL } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type OrderItem = { id: string; name: string; qty: number; unit_price: number; subtotal: number };
type Order = {
  id: string;
  total: number;
  status: string;
  shipping_type: 'retirada' | 'entrega';
  address: string | null;
  created_at: string;
  paid_at: string | null;
  shop: { name: string } | null;
  items: OrderItem[];
};

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', color: colors.amberText, bg: colors.amberBg },
  pago: { label: 'Pago', color: colors.greenText, bg: colors.greenBg },
  separando: { label: 'Separando', color: colors.blue, bg: '#EEEEFF' },
  pronto: { label: 'Pronto', color: colors.greenText, bg: colors.greenBg },
  concluido: { label: 'Concluído', color: colors.greenText, bg: colors.greenBg },
  cancelado: { label: 'Cancelado', color: colors.redText, bg: colors.redBg },
};

export default function PedidoProduto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('product_orders')
      .select(
        'id, total, status, shipping_type, address, created_at, paid_at, shop:shops(name), items:product_order_items(id, name, qty, unit_price, subtotal)',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setOrder((data as unknown as Order) ?? null);
  }, [id]);

  useEffect(() => {
    load();
    if (!id) return;
    // Atualiza o status ao vivo (ex.: quando o pagamento for confirmado).
    const ch = supabase
      .channel(`porder-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'product_orders', filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  if (loadError) {
    return (
      <Screen>
        <AppHeader title="Pedido" />
        <ErrorState onRetry={load} />
      </Screen>
    );
  }
  if (order === undefined) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.blue} style={{ marginTop: 60 }} />
      </Screen>
    );
  }
  if (order === null) {
    return (
      <Screen>
        <AppHeader title="Pedido" />
        <Text style={styles.muted}>Pedido não encontrado.</Text>
      </Screen>
    );
  }

  const st = STATUS[order.status] ?? { label: order.status, color: colors.gray600, bg: colors.gray100 };
  const isPending = order.status === 'aguardando_pagamento';

  const onPay = () => {
    // M3c: gera o Pix via Edge Function (create-product-payment) e mostra o QR.
    Alert.alert('Pagamento Pix', 'A geração do Pix entra na próxima etapa (M3c).');
  };

  const onCancel = () => {
    Alert.alert('Cancelar pedido?', 'Esta ação não pode ser desfeita.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar pedido',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase.rpc('cancel_product_order', { p_order_id: id });
          setBusy(false);
          if (error) {
            Alert.alert('Ops', error.message);
            return;
          }
          load();
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Pedido" subtitle={order.shop?.name ?? undefined} />

      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
      </View>

      <Text style={styles.section}>Itens</Text>
      <View style={styles.box}>
        {order.items?.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{it.qty}x {it.name}</Text>
            <Text style={styles.itemVal}>{priceBRL(it.subtotal)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.itemRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{priceBRL(order.total)}</Text>
        </View>
      </View>

      <Text style={styles.section}>Entrega</Text>
      <View style={styles.box}>
        <Text style={styles.deliveryText}>
          {order.shipping_type === 'entrega' ? `Entrega: ${order.address ?? '—'}` : 'Retirar na loja'}
        </Text>
      </View>

      {isPending ? (
        <>
          <Button label="Pagar com Pix" onPress={onPay} style={{ marginTop: 22 }} />
          <Button label="Cancelar pedido" variant="secondary" loading={busy} onPress={onCancel} style={{ marginTop: 10 }} />
        </>
      ) : (
        <Button label="Voltar para a Loja" variant="secondary" onPress={() => router.replace('/(client)/(tabs)/loja')} style={{ marginTop: 22 }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  statusText: { fontFamily: fonts.headBold, fontSize: 13 },
  section: { fontFamily: fonts.headBold, fontSize: 11, color: colors.gray600, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 8 },
  box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 14, gap: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  itemVal: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: 2 },
  totalLabel: { fontFamily: fonts.headBold, fontSize: 15, color: colors.ink },
  totalValue: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.blue, letterSpacing: -0.5 },
  deliveryText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
});
