import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/states';
import { useDebouncedReload } from '@/hooks/use-debounced-reload';
import { confirmAsync, notify } from '@/lib/confirm';
import { priceBRL } from '@/lib/products';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Item = { id: string; name: string; qty: number; subtotal: number };
type Order = {
  id: string;
  total: number;
  status: string;
  shipping_type: 'retirada' | 'entrega';
  address: string | null;
  created_at: string;
  client: { full_name: string | null } | null;
  items: Item[];
};

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', color: colors.amberText, bg: colors.amberBg },
  pago: { label: 'Pago · a separar', color: colors.greenText, bg: colors.greenBg },
  separando: { label: 'Separando', color: colors.blue, bg: '#EEEEFF' },
  pronto: { label: 'Pronto', color: colors.greenText, bg: colors.greenBg },
  concluido: { label: 'Concluído', color: colors.gray600, bg: colors.gray100 },
  cancelado: { label: 'Cancelado', color: colors.redText, bg: colors.redBg },
};

const NEXT: Record<string, { label: string; status: string }> = {
  pago: { label: 'Iniciar separação', status: 'separando' },
  separando: { label: 'Marcar pronto', status: 'pronto' },
  pronto: { label: 'Concluir pedido', status: 'concluido' },
};

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'ativos', label: 'Ativos', match: (s) => ['pago', 'separando', 'pronto'].includes(s) },
  { key: 'pago', label: 'A separar', match: (s) => s === 'pago' },
  { key: 'separando', label: 'Separando', match: (s) => s === 'separando' },
  { key: 'pronto', label: 'Prontos', match: (s) => s === 'pronto' },
  { key: 'todos', label: 'Todos', match: () => true },
];

export default function Vendas() {
  const { shop } = useShop();
  const [rows, setRows] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('ativos');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop) return;
    const { data, error } = await supabase
      .from('product_orders')
      .select('id, total, status, shipping_type, address, created_at, client:profiles(full_name), items:product_order_items(id, name, qty, subtotal)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setRows((data as unknown as Order[]) ?? []);
  }, [shop]);

  const scheduleLoad = useDebouncedReload(load);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!shop) return;
    const ch = supabase
      .channel(`shop-${shop.id}-porders`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_orders', filter: `shop_id=eq.${shop.id}` }, scheduleLoad)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [shop, scheduleLoad]);

  const advance = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.rpc('advance_product_order', { p_order_id: id, p_status: status as any });
    setBusy(null);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    load();
  };

  const cancel = async (id: string) => {
    if (await confirmAsync('Cancelar pedido?', 'Esta ação não pode ser desfeita.', 'Cancelar', true)) {
      advance(id, 'cancelado');
    }
  };

  const active = FILTERS.find((f) => f.key === filter)!;
  const list = useMemo(() => (rows ?? []).filter((o) => active.match(o.status)), [rows, active]);

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Vendas" subtitle="Pedidos do marketplace" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => {
          const n = (rows ?? []).filter((o) => f.match(o.status)).length;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, { backgroundColor: filter === f.key ? colors.ink : colors.white, borderColor: filter === f.key ? colors.ink : colors.gray200 }]}
            >
              <Text style={[styles.chipText, { color: filter === f.key ? colors.white : colors.ink }]}>
                {f.label}{n > 0 ? ` · ${n}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : rows === null ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : list.length === 0 ? (
        <EmptyState
          icon="bag-outline"
          title="Nenhum pedido neste filtro"
          description={
            filter === 'ativos'
              ? 'Pedidos pagos aparecem aqui para você separar e entregar.'
              : 'Tente outro filtro ou aguarde novas vendas na loja.'
          }
          actionLabel={filter !== 'todos' ? 'Ver todos' : undefined}
          onAction={filter !== 'todos' ? () => setFilter('todos') : undefined}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {list.map((o) => {
            const st = STATUS[o.status] ?? { label: o.status, color: colors.gray600, bg: colors.gray100 };
            const next = NEXT[o.status];
            const canCancel = ['pago', 'separando', 'pronto'].includes(o.status);
            return (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.client}>
                      {o.client?.full_name?.split(' ')[0] ?? 'Cliente'} · #{o.id.slice(0, 8)}
                    </Text>
                    <Text style={styles.delivery} numberOfLines={1}>
                      {o.shipping_type === 'entrega' ? `🛵 ${o.address ?? 'Entrega'}` : '🏪 Retirar na loja'}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.items}>
                  {o.items?.map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>{it.qty}x {it.name}</Text>
                      <Text style={styles.itemVal}>{priceBRL(it.subtotal)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{priceBRL(o.total)}</Text>
                </View>

                {(next || canCancel) && (
                  <View style={styles.actions}>
                    {next ? (
                      <Pressable style={styles.advanceBtn} onPress={() => advance(o.id, next.status)} disabled={busy === o.id}>
                        <Text style={styles.advanceText}>{busy === o.id ? '…' : next.label}</Text>
                      </Pressable>
                    ) : null}
                    {canCancel ? (
                      <Pressable style={styles.cancelBtn} onPress={() => cancel(o.id)} disabled={busy === o.id}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingBottom: 14, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.headBold, fontSize: 12 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  client: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  delivery: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 2 },
  badge: { borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.headBold, fontSize: 11 },
  items: { gap: 6, borderTopWidth: 1, borderTopColor: colors.gray100, marginTop: 12, paddingTop: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
  itemVal: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.gray100, marginTop: 12, paddingTop: 12 },
  totalLabel: { fontFamily: fonts.headBold, fontSize: 14, color: colors.ink },
  totalValue: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.blue, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  advanceBtn: { flex: 1, backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  advanceText: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  cancelBtn: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  cancelText: { fontFamily: fonts.headBold, fontSize: 12.5, color: colors.red },
});
