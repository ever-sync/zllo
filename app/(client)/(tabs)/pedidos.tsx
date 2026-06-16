import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClientHeader } from '@/components/ui/client-header';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { getDeviceName } from '@/lib/format';
import { priceBRL } from '@/lib/products';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type RequestRow = {
  id: string;
  description: string;
  status: 'aberta' | 'fechada' | 'cancelada' | 'expirada';
  created_at: string;
  device: { brand: string | null; model: string | null; nickname: string | null } | null;
  quotes: { count: number }[];
};

type ProductOrderRow = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  shop: { name: string } | null;
  items: { name: string; qty: number }[];
};

const REQ_STATUS: Record<RequestRow['status'], { label: string; bg: string; fg: string }> = {
  aberta: { label: 'Recebendo orçamentos', bg: colors.amberBg, fg: colors.amberText },
  fechada: { label: 'Em andamento', bg: colors.greenBg, fg: colors.greenText },
  cancelada: { label: 'Cancelada', bg: colors.gray100, fg: colors.gray600 },
  expirada: { label: 'Expirada', bg: colors.gray100, fg: colors.gray600 },
};

const PORDER_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', bg: colors.amberBg, fg: colors.amberText },
  pago: { label: 'Pago', bg: colors.greenBg, fg: colors.greenText },
  separando: { label: 'Separando', bg: '#EEEEFF', fg: colors.blue },
  pronto: { label: 'Pronto', bg: colors.greenBg, fg: colors.greenText },
  concluido: { label: 'Concluído', bg: colors.gray100, fg: colors.gray600 },
  cancelado: { label: 'Cancelado', bg: colors.gray100, fg: colors.gray600 },
};

export default function Pedidos() {
  const router = useRouter();
  const { session } = useAuth();
  const [tab, setTab] = useState<'reparos' | 'compras'>('reparos');
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [porders, setPorders] = useState<ProductOrderRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('repair_requests')
      .select('id, description, status, created_at, device:devices(brand, model, nickname), quotes!quotes_request_id_fkey(count)')
      .order('created_at', { ascending: false });
    const { data: po, error: poErr } = await supabase
      .from('product_orders')
      .select('id, total, status, created_at, shop:shops(name), items:product_order_items(name, qty)')
      .order('created_at', { ascending: false });
    if (error || poErr) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setRows((data as unknown as RequestRow[]) ?? []);
    setPorders((po as unknown as ProductOrderRow[]) ?? []);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const list = tab === 'reparos' ? rows : porders;

  return (
    <Screen background={colors.canvas}>
      <ClientHeader title="Meus pedidos" subtitle="Acompanhe seus reparos e compras." />

      <View style={styles.seg}>
        <SegBtn label="Reparos" active={tab === 'reparos'} onPress={() => setTab('reparos')} />
        <SegBtn label="Compras" active={tab === 'compras'} onPress={() => setTab('compras')} />
      </View>

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : list === null ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === 'reparos' ? 'receipt-outline' : 'bag-outline'}
          title={tab === 'reparos' ? 'Nenhum reparo ainda' : 'Nenhuma compra ainda'}
          description={
            tab === 'reparos'
              ? 'Solicite assistência e compare orçamentos de lojas perto de você.'
              : 'Explore produtos das assistências na aba Loja.'
          }
          actionLabel={tab === 'reparos' ? 'Pedir assistência' : 'Ir para a loja'}
          onAction={() =>
            router.push(tab === 'reparos' ? '/solicitar' : '/loja')
          }
          style={{ marginTop: 16 }}
        />
      ) : tab === 'reparos' ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          {(rows ?? []).map((r) => {
            const st = REQ_STATUS[r.status];
            const count = r.quotes?.[0]?.count ?? 0;
            return (
              <Pressable key={r.id} style={styles.card} onPress={() => router.push(`/pedido/${r.id}`)}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{getDeviceName(r.device)}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{r.description}</Text>
                <View style={styles.cardBottom}>
                  <Ionicons name="pricetag-outline" size={14} color={colors.blue} />
                  <Text style={styles.count}>
                    {count === 0 ? 'Aguardando orçamentos…' : `${count} orçamento${count > 1 ? 's' : ''} recebido${count > 1 ? 's' : ''}`}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray400} style={{ marginLeft: 'auto' }} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 16 }}>
          {(porders ?? []).map((o) => {
            const st = PORDER_STATUS[o.status] ?? { label: o.status, bg: colors.gray100, fg: colors.gray600 };
            const items = (o.items ?? []).map((i) => `${i.qty}x ${i.name}`).join(', ');
            return (
              <Pressable key={o.id} style={styles.card} onPress={() => router.push(`/pedido-produto/${o.id}`)}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{o.shop?.name ?? 'Loja'}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{items || 'Pedido'}</Text>
                <View style={styles.cardBottom}>
                  <Ionicons name="bag-outline" size={14} color={colors.blue} />
                  <Text style={styles.count}>{priceBRL(o.total)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray400} style={{ marginLeft: 'auto' }} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <Text style={[styles.segText, { color: active ? colors.white : colors.gray600 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 6, backgroundColor: colors.gray100, borderRadius: radius.full, padding: 4, marginTop: 16 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.full },
  segBtnActive: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.headBold, fontSize: 13 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontFamily: fonts.headBold, fontSize: 10 },
  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.blue },
});
