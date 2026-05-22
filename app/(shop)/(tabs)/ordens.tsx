import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ShopHeader } from '@/components/ui/shop-header';
import { ErrorState } from '@/components/ui/states';
import { getDeviceName } from '@/lib/format';
import { statusLabel, stepIndex } from '@/lib/order-status';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type OrderRow = {
  id: string;
  status: string;
  value: number;
  device: { brand: string | null; model: string | null; nickname: string | null } | null;
  client: { full_name: string | null } | null;
};

export default function Ordens() {
  const router = useRouter();
  const { shop } = useShop();
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<'andamento' | 'finalizadas'>('andamento');

  const load = useCallback(async () => {
    if (!shop) return;
    const { data, error } = await supabase
      .from('service_orders')
      .select('id, status, value, device:devices(brand, model, nickname), client:profiles(full_name)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setRows((data as unknown as OrderRow[]) ?? []);
  }, [shop]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!shop) return;
    const ch = supabase
      .channel(`shop-${shop.id}-orders`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders', filter: `shop_id=eq.${shop.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop, load]);

  const all = rows ?? [];
  const filtered = all.filter((o) => (tab === 'finalizadas' ? o.status === 'concluida' : o.status !== 'concluida' && o.status !== 'cancelada'));
  const andamentoCount = all.filter((o) => o.status !== 'concluida' && o.status !== 'cancelada').length;
  const finalizadasCount = all.filter((o) => o.status === 'concluida').length;

  return (
    <Screen background={colors.canvas}>
      <ShopHeader title="Ordens de serviço" subtitle="Reparos em andamento e histórico" />

      <View style={styles.chips}>
        <Chip label={`Em andamento (${andamentoCount})`} active={tab === 'andamento'} onPress={() => setTab('andamento')} />
        <Chip label={`Finalizadas (${finalizadasCount})`} active={tab === 'finalizadas'} onPress={() => setTab('finalizadas')} />
      </View>

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : rows === null ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={32} color={colors.gray400} />
          <Text style={styles.emptyText}>Nada por aqui ainda.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((o) => {
            const deviceName = getDeviceName(o.device);
            const finished = o.status === 'concluida';
            const total = 7;
            const idx = stepIndex(o.status);
            const progress = finished ? 100 : Math.max(8, Math.round(((idx + 1) / total) * 100));
            return (
              <Pressable key={o.id} style={styles.card} onPress={() => router.push(`/(shop)/os/${o.id}`)}>
                <View style={styles.rowTop}>
                  <View style={[styles.dot, { backgroundColor: finished ? colors.green : colors.blue }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.device}>{deviceName}</Text>
                    <Text style={styles.meta}>{o.client?.full_name?.split(' ')[0] ?? 'Cliente'} · {statusLabel(o.status)}</Text>
                  </View>
                  <Text style={styles.value}>R$ {o.value.toLocaleString('pt-BR')}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${progress}%`, backgroundColor: finished ? colors.green : colors.blue }]} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? colors.ink : colors.white, borderColor: active ? colors.ink : colors.gray200 }]}>
      <Text style={[styles.chipText, { color: active ? colors.white : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.headBold, fontSize: 12 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 14, gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  device: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2 },
  value: { fontFamily: fonts.headBold, fontSize: 15, color: colors.ink },
  track: { height: 6, backgroundColor: colors.gray100, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
