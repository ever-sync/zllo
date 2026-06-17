import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

export default function ShopOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
        <Text style={styles.value}>R$ {order.value.toLocaleString('pt-BR')}</Text>
      </View>

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
  section: { fontFamily: fonts.head, fontSize: 16, color: colors.ink, marginTop: 20, marginBottom: 12 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 18 },
  done: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.greenBg, borderRadius: radius.lg, padding: 16, marginTop: 20 },
  doneText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.greenText },
});
