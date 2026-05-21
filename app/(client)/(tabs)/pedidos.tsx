import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ErrorState } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { getDeviceName } from '@/lib/format';
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

const STATUS: Record<RequestRow['status'], { label: string; bg: string; fg: string }> = {
  aberta: { label: 'Recebendo orçamentos', bg: colors.amberBg, fg: colors.amberText },
  fechada: { label: 'Em andamento', bg: colors.greenBg, fg: colors.greenText },
  cancelada: { label: 'Cancelada', bg: colors.gray100, fg: colors.gray600 },
  expirada: { label: 'Expirada', bg: colors.gray100, fg: colors.gray600 },
};

export default function Pedidos() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('repair_requests')
      .select('id, description, status, created_at, device:devices(brand, model, nickname), quotes!quotes_request_id_fkey(count)')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setRows((data as unknown as RequestRow[]) ?? []);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <Text style={styles.title}>Meus pedidos</Text>
      <Text style={styles.sub}>Acompanhe suas solicitações e orçamentos.</Text>

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : rows === null ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={32} color={colors.gray400} />
          <Text style={styles.emptyText}>Você ainda não fez nenhum pedido.</Text>
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 16 }}>
          {rows.map((r) => {
            const st = STATUS[r.status];
            const count = r.quotes?.[0]?.count ?? 0;
            const device = getDeviceName(r.device);
            return (
              <Pressable key={r.id} style={styles.card} onPress={() => router.push(`/(client)/pedido/${r.id}`)}>
                <View style={styles.cardTop}>
                  <Text style={styles.device}>{device}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{r.description}</Text>
                <View style={styles.cardBottom}>
                  <Ionicons name="pricetag-outline" size={14} color={colors.blue} />
                  <Text style={styles.count}>
                    {count === 0
                      ? 'Aguardando orçamentos…'
                      : `${count} orçamento${count > 1 ? 's' : ''} recebido${count > 1 ? 's' : ''}`}
                  </Text>
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

const styles = StyleSheet.create({
  title: { fontFamily: fonts.headBlack, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, marginTop: 2 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 14,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  device: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontFamily: fonts.headBold, fontSize: 10 },
  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.blue },
});
