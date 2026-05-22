import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/lib/auth';
import { getDeviceName } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

const CARD_DARK = '#262626';
const MUTED = 'rgba(255,255,255,0.55)';

type RecentRequest = {
  id: string;
  description: string;
  status: 'aberta' | 'fechada' | 'cancelada' | 'expirada';
  device: { brand: string | null; model: string | null; nickname: string | null } | null;
};

const STATUS: Record<RecentRequest['status'], { label: string; color: string }> = {
  aberta: { label: 'Recebendo orçamentos', color: colors.lime },
  fechada: { label: 'Em andamento', color: '#7CE0A0' },
  cancelada: { label: 'Cancelada', color: MUTED },
  expirada: { label: 'Expirada', color: MUTED },
};

export default function ClientHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'tudo bem';
  const initial = (profile?.full_name?.trim()?.[0] ?? 'Z').toUpperCase();
  const [recent, setRecent] = useState<RecentRequest[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('repair_requests')
      .select('id, description, status, created_at, device:devices(brand, model, nickname)')
      .order('created_at', { ascending: false })
      .limit(3);
    setRecent((data as unknown as RecentRequest[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen background={colors.ink}>
      <StatusBar style="light" />

      {/* Header: avatar + ação */}
      <View style={styles.header}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <Pressable style={styles.iconBtn} onPress={() => router.push('/(client)/(tabs)/pedidos')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      {/* Saudação */}
      <Text style={styles.hello}>Olá,</Text>
      <Text style={styles.name}>{firstName}</Text>

      <View style={styles.chips}>
        {profile?.city ? <Chip label={profile.city} /> : null}
        <Chip label="Cliente zllo" />
      </View>

      {/* Card stack */}
      <View style={styles.stack}>
        {/* Card secundário (peek) */}
        <Pressable style={styles.darkCard} onPress={() => router.push('/(client)/(tabs)/loja')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.darkLabel}>LOJA</Text>
            <Text style={styles.darkValue}>Produtos das assistências</Text>
          </View>
          <Ionicons name="storefront-outline" size={22} color={colors.lime} />
        </Pressable>

        {/* Card principal (lima) */}
        <Pressable style={styles.limeCard} onPress={() => router.push('/(client)/solicitar')}>
          <View style={styles.limeTop}>
            <Text style={styles.limeLabel}>CONSERTO</Text>
            <View style={styles.limeTag}>
              <Text style={styles.limeTagText}>resposta rápida</Text>
            </View>
          </View>
          <Text style={styles.limeTitle}>Precisa consertar{'\n'}seu celular?</Text>
          <View style={styles.limeCta}>
            <Text style={styles.limeCtaText}>Pedir assistência</Text>
            <View style={styles.limeCtaIcon}>
              <Ionicons name="arrow-forward" size={18} color={colors.lime} />
            </View>
          </View>
        </Pressable>
      </View>

      <Pressable style={styles.addDevice} onPress={() => router.push('/(client)/(tabs)/aparelhos')}>
        <Ionicons name="add-circle-outline" size={18} color={colors.lime} />
        <Text style={styles.addDeviceText}>Cadastrar um aparelho</Text>
      </Pressable>

      {/* Atividade recente */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Meus pedidos</Text>
        <Pressable onPress={() => router.push('/(client)/(tabs)/pedidos')} hitSlop={6}>
          <Text style={styles.seeAll}>Ver todos →</Text>
        </Pressable>
      </View>

      {recent === null ? null : recent.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum pedido ainda. Comece pedindo uma assistência.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {recent.map((r) => {
            const st = STATUS[r.status];
            return (
              <Pressable key={r.id} style={styles.taskRow} onPress={() => router.push(`/(client)/pedido/${r.id}`)}>
                <View style={styles.taskIcon}>
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{getDeviceName(r.device)}</Text>
                  <Text style={[styles.taskStatus, { color: st.color }]}>{st.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={MUTED} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headBlack, fontSize: 18, color: colors.ink },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD_DARK, alignItems: 'center', justifyContent: 'center' },
  hello: { fontFamily: fonts.headBlack, fontSize: 30, color: colors.white, letterSpacing: -0.5, marginTop: 18 },
  name: { fontFamily: fonts.headBlack, fontSize: 30, color: colors.lime, letterSpacing: -0.5, marginTop: -4 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontFamily: fonts.headBold, fontSize: 10.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },

  stack: { marginTop: 22 },
  darkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_DARK,
    borderRadius: radius['3xl'],
    padding: 18,
    paddingBottom: 30,
    marginBottom: -18,
  },
  darkLabel: { fontFamily: fonts.headBold, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },
  darkValue: { fontFamily: fonts.head, fontSize: 15, color: colors.white, marginTop: 3 },
  limeCard: { backgroundColor: colors.lime, borderRadius: radius['3xl'], padding: 20 },
  limeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  limeLabel: { fontFamily: fonts.headBold, fontSize: 10, color: colors.ink, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 },
  limeTag: { backgroundColor: colors.ink, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  limeTagText: { fontFamily: fonts.headBold, fontSize: 9.5, color: colors.lime, textTransform: 'uppercase', letterSpacing: 0.4 },
  limeTitle: { fontFamily: fonts.headBlack, fontSize: 24, color: colors.ink, letterSpacing: -0.5, marginTop: 14, lineHeight: 27 },
  limeCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  limeCtaText: { fontFamily: fonts.headBold, fontSize: 15, color: colors.ink },
  limeCtaIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },

  addDevice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  addDeviceText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  section: { fontFamily: fonts.head, fontSize: 16, color: colors.white },
  seeAll: { fontFamily: fonts.bodyBold, fontSize: 13, color: MUTED },
  empty: { backgroundColor: CARD_DARK, borderRadius: radius['2xl'], padding: 20 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: MUTED, lineHeight: 19 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_DARK, borderRadius: radius['2xl'], padding: 14 },
  taskIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
  taskStatus: { fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
});
