import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { EmptyState, Skeleton, SkeletonCard } from '@/components/ui/states';
import { SegmentedChip, SegmentedChipRow } from '@/components/ui/segmented-chips';
import { filterByPeriod, PERIOD_LABELS, txsToCsv, type FinancePeriod } from '@/lib/finance';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Tx = {
  id: string;
  kind: 'reparo' | 'produto';
  label: string;
  shop_amount: number;
  commission: number;
  status: string;
  created_at: string;
};

const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<string, string> = {
  pago: 'pago',
  pendente: 'pendente',
  cancelado: 'cancelado',
  estornado: 'estornado',
};

export default function Financeiro() {
  const { shop } = useShop();
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [period, setPeriod] = useState<FinancePeriod>('30d');

  const load = useCallback(async () => {
    if (!shop) {
      setTxs([]);
      return;
    }

    const [{ data: pays }, { data: pords }] = await Promise.all([
      supabase
        .from('payments')
        .select('id, amount, commission, shop_amount, status, created_at, order:service_orders(device:devices(brand, model))')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('product_orders')
        .select('id, total, commission, shop_amount, status, created_at')
        .eq('shop_id', shop.id)
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false }),
    ]);

    const repairTxs: Tx[] = ((pays ?? []) as {
      id: string;
      amount: number;
      commission: number;
      shop_amount: number;
      status: string;
      created_at: string;
      order: { device: { brand: string | null; model: string | null } | null } | null;
    }[]).map((p) => {
      const dev = p.order?.device;
      const name = `${dev?.brand ?? ''} ${dev?.model ?? ''}`.trim() || 'Reparo';
      return {
        id: p.id,
        kind: 'reparo',
        label: name,
        shop_amount: Number(p.shop_amount),
        commission: Number(p.commission),
        status: p.status,
        created_at: p.created_at,
      };
    });

    const productTxs: Tx[] = ((pords ?? []) as {
      id: string;
      total: number;
      commission: number | null;
      shop_amount: number | null;
      status: string;
      created_at: string;
    }[]).map((o) => ({
      id: o.id,
      kind: 'produto',
      label: 'Pedido marketplace',
      shop_amount: Number(o.shop_amount ?? Number(o.total) * 0.97),
      commission: Number(o.commission ?? Number(o.total) * 0.03),
      status: o.status === 'aguardando_pagamento' ? 'pendente' : 'pago',
      created_at: o.created_at,
    }));

    setTxs(
      [...repairTxs, ...productTxs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    );
  }, [shop]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filteredTxs = useMemo(() => filterByPeriod(txs ?? [], period), [txs, period]);

  const stats = useMemo(() => {
    const all = filteredTxs;
    const paid = all.filter((t) => t.status === 'pago');
    const pending = all.filter((t) => t.status === 'pendente');
    return {
      available: paid.reduce((s, t) => s + t.shop_amount, 0),
      pending: pending.reduce((s, t) => s + t.shop_amount, 0),
      gross: paid.reduce((s, t) => s + t.shop_amount + t.commission, 0),
    };
  }, [filteredTxs]);

  const exportCsv = async () => {
    if (!filteredTxs.length) return;
    const csv = txsToCsv(filteredTxs);
    await Share.share({ message: csv, title: 'zllo-financeiro.csv' });
  };

  if (!shop) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Financeiro" subtitle="Saldo e histórico" />
        <EmptyState
          icon="storefront-outline"
          title="Configure sua loja"
          description="Complete o cadastro para ver recebíveis e histórico de pagamentos."
        />
      </Screen>
    );
  }

  if (txs === null) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Financeiro" subtitle="Saldo e histórico" />
        <View style={{ gap: 12, marginTop: 8 }}>
          <SkeletonCard />
          <Skeleton height={80} style={{ borderRadius: radius['2xl'] }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.canvas}>
      <AppHeader title="Financeiro" subtitle="Saldo e histórico" />

      <Card style={{ backgroundColor: colors.lime, marginBottom: 12 }}>
        <Text style={styles.capLabel}>Total recebido (líquido)</Text>
        <Text style={styles.capValue}>{brl(stats.available)}</Text>
        <Text style={styles.asaasNote}>
          Repasse via Pix split (97%) direto na sua conta Asaas. Saques são feitos no app Asaas.
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={[styles.capLabel, { color: colors.gray600 }]}>A liberar</Text>
          <Text style={[styles.capValue, { fontSize: 22 }]}>{brl(stats.pending)}</Text>
        </Card>
        <Card style={{ flex: 1, backgroundColor: colors.ink }}>
          <Text style={[styles.capLabel, { color: '#A1A1A1' }]}>Bruto no período</Text>
          <Text style={[styles.capValue, { fontSize: 22, color: colors.white }]}>{brl(stats.gross)}</Text>
        </Card>
      </View>

      <SegmentedChipRow style={{ marginBottom: 12 }}>
        {(Object.keys(PERIOD_LABELS) as FinancePeriod[]).map((p) => (
          <SegmentedChip key={p} label={PERIOD_LABELS[p]} active={period === p} onPress={() => setPeriod(p)} />
        ))}
      </SegmentedChipRow>

      <Button
        label="Exportar CSV"
        variant="secondary"
        onPress={() => void exportCsv()}
        disabled={filteredTxs.length === 0}
        style={{ marginBottom: 12 }}
      />

      <Card>
        <Text style={styles.section}>Histórico de transações</Text>
        {filteredTxs.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Nenhuma transação"
            description="Os pagamentos aparecem aqui quando o cliente paga via Pix."
            style={{ paddingVertical: 8, borderWidth: 0, backgroundColor: 'transparent' }}
          />
        ) : (
          filteredTxs.map((p) => {
            const paid = p.status === 'pago';
            const tone = paid
              ? { bg: colors.greenBg, fg: colors.greenText }
              : p.status === 'pendente'
                ? { bg: colors.amberBg, fg: colors.amberText }
                : { bg: colors.gray100, fg: colors.gray600 };
            return (
              <View key={p.kind + p.id} style={styles.tx}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txName}>
                    {p.kind === 'produto' ? '🛒 ' : '🔧 '}
                    {p.label}
                  </Text>
                  <Text style={styles.txSub}>Comissão {brl(p.commission)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txValue}>{brl(p.shop_amount)}</Text>
                  <View style={[styles.txBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.txBadgeText, { color: tone.fg }]}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Text>
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
  asaasNote: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(30,30,30,0.75)', marginTop: 12, lineHeight: 17 },
  section: { fontFamily: fonts.head, fontSize: 15, color: colors.ink, marginBottom: 12 },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  txName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  txSub: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 2 },
  txValue: { fontFamily: fonts.headBold, fontSize: 14, color: colors.ink },
  txBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: 4 },
  txBadgeText: { fontFamily: fonts.headBold, fontSize: 9, textTransform: 'uppercase' },
});
