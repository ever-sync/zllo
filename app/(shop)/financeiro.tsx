import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Payment = {
  id: string;
  amount: number;
  commission: number;
  shop_amount: number;
  status: 'pendente' | 'pago' | 'cancelado' | 'estornado';
  created_at: string;
  order: { device: { brand: string | null; model: string | null } | null } | null;
};
const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Financeiro() {
  const { shop } = useShop();
  const [payments, setPayments] = useState<Payment[] | null>(null);

  const load = useCallback(async () => {
    if (!shop) return;
    const { data } = await supabase
      .from('payments')
      .select('id, amount, commission, shop_amount, status, created_at, order:service_orders(device:devices(brand, model))')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    setPayments((data as unknown as Payment[]) ?? []);
  }, [shop]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const all = payments ?? [];
  const available = all.filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.shop_amount), 0);
  const pending = all.filter((p) => p.status === 'pendente').reduce((s, p) => s + Number(p.shop_amount), 0);
  const month = all.filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Screen>
      <AppHeader title="Financeiro" subtitle="Saldo e histórico" />

      <Card style={{ backgroundColor: colors.lime, marginBottom: 12 }}>
        <Text style={styles.capLabel}>Disponível para saque</Text>
        <Text style={styles.capValue}>{brl(available)}</Text>
        <View style={styles.sacar}><Text style={styles.sacarText}>Sacar agora →</Text></View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={[styles.capLabel, { color: colors.gray600 }]}>A liberar</Text>
          <Text style={[styles.capValue, { fontSize: 22 }]}>{brl(pending)}</Text>
        </Card>
        <Card style={{ flex: 1, backgroundColor: colors.ink }}>
          <Text style={[styles.capLabel, { color: '#A1A1A1' }]}>Faturado</Text>
          <Text style={[styles.capValue, { fontSize: 22, color: colors.white }]}>{brl(month)}</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.section}>Histórico de transações</Text>
        {payments === null ? (
          <ActivityIndicator color={colors.blue} style={{ marginVertical: 20 }} />
        ) : all.length === 0 ? (
          <Text style={styles.muted}>Nenhuma transação ainda. Os pagamentos aparecem aqui quando o cliente paga.</Text>
        ) : (
          all.map((p) => {
            const dev = p.order?.device;
            const name = `${dev?.brand ?? ''} ${dev?.model ?? ''}`.trim() || 'Reparo';
            const paid = p.status === 'pago';
            const tone = paid ? { bg: colors.greenBg, fg: colors.greenText } : p.status === 'pendente' ? { bg: colors.amberBg, fg: colors.amberText } : { bg: colors.gray100, fg: colors.gray600 };
            return (
              <View key={p.id} style={styles.tx}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txName}>{name}</Text>
                  <Text style={styles.txSub}>Comissão {brl(Number(p.commission))}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txValue}>{brl(Number(p.shop_amount))}</Text>
                  <View style={[styles.txBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.txBadgeText, { color: tone.fg }]}>{p.status}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  capLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(30,30,30,0.7)' },
  capValue: { fontFamily: fonts.headBlack, fontSize: 28, color: colors.ink, letterSpacing: -1, marginTop: 8 },
  sacar: { alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 9, marginTop: 12 },
  sacarText: { fontFamily: fonts.headBold, fontSize: 12, color: colors.lime, textTransform: 'uppercase' },
  section: { fontFamily: fonts.head, fontSize: 15, color: colors.ink, marginBottom: 12 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, paddingVertical: 6 },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  txName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  txSub: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 2 },
  txValue: { fontFamily: fonts.headBold, fontSize: 14, color: colors.ink },
  txBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: 4 },
  txBadgeText: { fontFamily: fonts.headBold, fontSize: 9, textTransform: 'uppercase' },
});
