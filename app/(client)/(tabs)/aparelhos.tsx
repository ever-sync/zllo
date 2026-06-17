import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { ClientHeader } from '@/components/ui/client-header';
import { Screen } from '@/components/ui/screen';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/states';
import { useAuth } from '@/lib/auth';
import { getDeviceName } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export type Device = {
  id: string;
  nickname: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  storage: string | null;
  photo_url: string | null;
  verification_status: 'pendente' | 'aprovado' | 'recusado';
};

export default function Aparelhos() {
  const router = useRouter();
  const { session } = useAuth();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('devices')
      .select('id, nickname, brand, model, color, storage, photo_url, verification_status')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setDevices((data as Device[]) ?? []);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen background={colors.canvas}>
      <ClientHeader title="Meus aparelhos" subtitle="Cadastre seus celulares para pedir reparo mais rápido." />

      {loadError ? (
        <ErrorState onRetry={load} />
      ) : devices === null ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : devices.length === 0 ? (
        <EmptyState
          icon="phone-portrait-outline"
          title="Nenhum aparelho cadastrado"
          description="Cadastre seu celular para pedir reparo mais rápido, com fotos e dados já salvos."
          actionLabel="Cadastrar aparelho"
          onAction={() => router.push('/aparelho-novo')}
          style={{ marginTop: 16 }}
        />
      ) : (
        <View style={{ gap: 10, marginTop: 16 }}>
          {devices.map((d) => (
            <View key={d.id} style={styles.card}>
              {d.photo_url ? (
                <Image source={{ uri: d.photo_url }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Ionicons name="phone-portrait-outline" size={22} color={colors.gray400} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{getDeviceName(d)}</Text>
                <Text style={styles.cardSub}>
                  {[d.brand, d.model, d.storage, d.color].filter(Boolean).join(' · ') || 'Sem detalhes'}
                </Text>
                <ImeiBadge status={d.verification_status} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Button
        label="Cadastrar aparelho"
        onPress={() => router.push('/aparelho-novo')}
        style={{ marginTop: devices?.length ? 20 : 0 }}
      />
    </Screen>
  );
}

function ImeiBadge({ status }: { status: Device['verification_status'] }) {
  const map = {
    aprovado: { bg: colors.greenBg, fg: colors.greenText, icon: 'shield-checkmark' as const, label: 'IMEI verificado' },
    recusado: { bg: colors.redBg, fg: colors.redText, icon: 'warning' as const, label: 'IMEI bloqueado (roubo)' },
    pendente: { bg: colors.amberBg, fg: colors.amberText, icon: 'time-outline' as const, label: 'IMEI pendente' },
  }[status];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Ionicons name={map.icon} size={12} color={map.fg} />
      <Text style={[styles.badgeText, { color: map.fg }]}>{map.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.md },
  badgeText: { fontFamily: fonts.headBold, fontSize: 10.5 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 12,
  },
  photo: { width: 52, height: 52, borderRadius: radius.lg },
  photoPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  cardSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2 },
});
