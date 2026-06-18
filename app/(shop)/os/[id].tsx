import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '@/components/ui/app-header';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Timeline } from '@/components/ui/timeline';
import { EmptyState, Skeleton, SkeletonCard } from '@/components/ui/states';
import { notify } from '@/lib/confirm';
import { nextStep, statusLabel } from '@/lib/order-status';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Order = {
  id: string;
  status: string;
  value: number;
  device: { brand: string | null; model: string | null; nickname: string | null; color: string | null; storage: string | null } | null;
  client: { full_name: string | null } | null;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Máscara de moeda: dígitos → "1.234,56" (centavos). */
function maskBRL(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  return (Number(digits) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ShopOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState('');
  const [valueSaving, setValueSaving] = useState(false);
  const [valueError, setValueError] = useState<string | null>(null);

  const saveValue = async () => {
    if (!id) return;
    setValueError(null);
    const v = Number(valueInput.replace(/\./g, '').replace(',', '.'));
    if (!v || v <= 0) {
      setValueError('Informe um valor válido.');
      return;
    }
    setValueSaving(true);
    const { error } = await supabase.rpc('set_order_value', { p_order_id: id, p_value: v });
    setValueSaving(false);
    if (error) {
      setValueError(error.message);
      return;
    }
    setEditingValue(false);
    setValueInput('');
    notify('Valor definido', 'O cliente já pode pagar o reparo.');
    load();
  };

  const load = useCallback(async () => {
    if (!id) return;
    const { data: o } = await supabase
      .from('service_orders')
      .select('id, status, value, device:devices(brand, model, nickname, color, storage), client:profiles(full_name)')
      .eq('id', id)
      .maybeSingle();
    setOrder((o as unknown as Order) ?? null);

    const { data: ev } = await supabase
      .from('service_order_events')
      .select('status, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: true });
    const map: Record<string, string> = {};
    (ev ?? []).forEach((e: { status: string; created_at: string }) => {
      map[e.status] = fmt(e.created_at);
    });
    setEvents(map);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async () => {
    if (!order || !id) return;
    const next = nextStep(order.status);
    if (!next) return;
    setSaving(true);
    const { error } = await supabase.rpc('advance_service_order', { p_order_id: id, p_status: next.key as any, p_note: undefined });
    setSaving(false);
    if (error) {
      notify('Ops', error.message);
      return;
    }
    load();
  };

  if (order === undefined) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Ordem de serviço" />
        <View style={{ gap: 12, marginTop: 8 }}>
          <SkeletonCard />
          <Skeleton height={180} style={{ borderRadius: radius['2xl'] }} />
        </View>
      </Screen>
    );
  }
  if (order === null) {
    return (
      <Screen background={colors.canvas}>
        <AppHeader title="Ordem de serviço" />
        <EmptyState
          icon="document-text-outline"
          title="OS não encontrada"
          description="Esta ordem pode ter sido removida ou você não tem acesso."
        />
      </Screen>
    );
  }

  const dev = order.device;
  const deviceName = dev?.nickname || `${dev?.brand ?? ''} ${dev?.model ?? ''}`.trim() || 'Aparelho';
  const next = nextStep(order.status);

  return (
    <Screen background={colors.canvas}>
      <AppHeader title={deviceName} subtitle={order.client?.full_name ?? 'Cliente'} />

      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.status}>{statusLabel(order.status)}</Text>
          <Text style={styles.devSub}>{[dev?.storage, dev?.color].filter(Boolean).join(' · ') || '—'}</Text>
        </View>
        <Text style={styles.value}>{order.value > 0 ? `R$ ${order.value.toLocaleString('pt-BR')}` : 'A definir'}</Text>
      </View>

      {/* Valor final do reparo (definido no diagnóstico) */}
      {editingValue || order.value <= 0 ? (
        <View style={styles.valueCard}>
          <Text style={styles.valueCardTitle}>
            {order.value > 0 ? 'Ajustar valor final' : 'Definir valor final do reparo'}
          </Text>
          <Text style={styles.valueCardSub}>O cliente só consegue pagar depois que você fechar o valor.</Text>
          <View style={styles.valueField}>
            <Text style={styles.valuePrefix}>R$</Text>
            <TextInput
              value={valueInput}
              onChangeText={(t) => setValueInput(maskBRL(t))}
              placeholder="0,00"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              style={styles.valueInput}
            />
          </View>
          {valueError ? <Text style={styles.valueError}>{valueError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {order.value > 0 ? (
              <Button label="Cancelar" variant="secondary" onPress={() => setEditingValue(false)} style={{ flex: 1 }} />
            ) : null}
            <Button label="Salvar valor" onPress={saveValue} loading={valueSaving} style={{ flex: 2 }} />
          </View>
        </View>
      ) : (
        <Button
          label="Ajustar valor do reparo"
          variant="secondary"
          onPress={() => { setValueInput(''); setEditingValue(true); }}
          style={{ marginTop: 12 }}
        />
      )}

      <Text style={styles.section}>Linha do tempo</Text>
      <View style={styles.card}>
        <Timeline status={order.status} events={events} />
      </View>

      {next ? (
        <Button label={`Avançar: ${next.label}`} onPress={advance} loading={saving} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.done}>
          <Ionicons name="checkmark-circle" size={18} color={colors.greenText} />
          <Text style={styles.doneText}>Ordem concluída 🎉</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 16 },
  status: { fontFamily: fonts.head, fontSize: 17, color: colors.ink },
  devSub: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 2 },
  value: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.ink },
  valueCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 16, marginTop: 12 },
  valueCardTitle: { fontFamily: fonts.head, fontSize: 15, color: colors.ink },
  valueCardSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2, marginBottom: 12, lineHeight: 17 },
  valueField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, paddingHorizontal: 14 },
  valuePrefix: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.gray400, marginRight: 8 },
  valueInput: { flex: 1, paddingVertical: 14, fontFamily: fonts.head, fontSize: 20, color: colors.ink },
  valueError: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.red, marginTop: 8 },
  section: { fontFamily: fonts.head, fontSize: 16, color: colors.ink, marginTop: 20, marginBottom: 12 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 18 },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.greenBg, borderRadius: radius.lg, padding: 16, marginTop: 20 },
  doneText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.greenText },
});
