import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ShopHeader } from '@/components/ui/shop-header';
import { EmptyState, ErrorState, LoadingState, SkeletonCard } from '@/components/ui/states';
import { getDeviceName } from '@/lib/format';
import { useShop } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

type Conversa = {
  request_id: string;
  request: {
    id: string;
    description: string;
    client: { full_name: string | null } | null;
    device: { brand: string | null; model: string | null; nickname: string | null } | null;
  } | null;
};

export default function Mensagens() {
  const router = useRouter();
  const { shop, loading } = useShop();
  const [items, setItems] = useState<Conversa[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    const { data, error } = await supabase
      .from('quotes')
      .select('request_id, request:repair_requests(id, description, client:profiles(full_name), device:devices(brand, model, nickname))')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setItems((data as unknown as Conversa[]) ?? []);
  }, [shop]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <Screen scroll={false} background={colors.canvas}>
        <LoadingState />
      </Screen>
    );
  }
  if (!shop) return <Redirect href="/setup" />;

  const convos = (items ?? []).filter((c) => c.request);

  return (
    <Screen background={colors.canvas}>
      <ShopHeader title="Mensagens" subtitle="Converse com seus clientes" />

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : items === null ? (
        <View style={{ gap: 8, marginTop: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : convos.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Nenhuma conversa ainda"
          description="Depois de enviar um orçamento, você pode conversar com o cliente por aqui."
          actionLabel="Ver orçamentos"
          onAction={() => router.push('/orcamentos')}
          style={{ marginTop: 14 }}
        />
      ) : (
        <View style={{ gap: 8, marginTop: 14 }}>
          {convos.map((c) => {
            const name = c.request!.client?.full_name ?? 'Cliente';
            const deviceName = getDeviceName(c.request!.device);
            const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
            return (
              <Pressable key={c.request_id} style={styles.row} onPress={() => router.push(`/conversa/${c.request_id}`)}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.device}>{deviceName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headBold, fontSize: 14, color: colors.white },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  device: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2 },
});
