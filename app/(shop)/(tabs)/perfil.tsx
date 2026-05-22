import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/lib/auth';
import { useShop } from '@/lib/shop';
import { colors, fonts, radius } from '@/theme';

export default function ShopProfile() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { shop, setOnline } = useShop();
  const initials =
    (shop?.name ?? profile?.full_name)?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <Screen>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{shop?.name ?? profile?.full_name ?? 'Assistência'}</Text>
        <Text style={styles.role}>Assistência técnica · ✓ Verificada</Text>
      </View>

      {shop ? (
        <>
          <View style={styles.statsRow}>
            <Stat label="Nota" value={`★ ${shop.rating?.toFixed(1) ?? '—'}`} />
            <Stat label="Reparos" value={String(shop.reviews_count ?? 0)} />
          </View>

          <View style={styles.onlineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.onlineTitle}>Disponível para solicitações</Text>
              <Text style={styles.onlineSub}>{shop.is_online ? 'Você está online' : 'Você está offline'}</Text>
            </View>
            <Switch value={shop.is_online} onValueChange={setOnline} trackColor={{ true: colors.lime, false: colors.gray200 }} thumbColor={colors.white} />
          </View>

          <View style={styles.menu}>
            <MenuRow icon="cash-outline" label="Financeiro" onPress={() => router.push('/(shop)/financeiro')} />
            <MenuRow icon="star-outline" label="Reputação" onPress={() => router.push('/(shop)/reputacao')} />
            <MenuRow icon="create-outline" label="Editar dados da loja" onPress={() => router.push('/(shop)/setup')} />
            <MenuRow icon="settings-outline" label="Configurações" onPress={() => router.push('/(shop)/configuracoes')} last />
          </View>
        </>
      ) : (
        <Button label="Configurar minha loja" onPress={() => router.push('/(shop)/setup')} />
      )}

      <Button label="Sair da conta" variant="secondary" onPress={signOut} style={{ marginTop: 16 }} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={[styles.menuRow, !last && styles.menuBorder]} onPress={onPress}>
      <Ionicons name={icon} size={19} color={colors.blue} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headBlack, fontSize: 30, color: colors.lime },
  name: { fontFamily: fonts.head, fontSize: 20, color: colors.ink, marginTop: 12 },
  role: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], paddingVertical: 16, alignItems: 'center' },
  statValue: { fontFamily: fonts.headBlack, fontSize: 20, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.gray600, marginTop: 2 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], padding: 16, marginBottom: 12 },
  onlineTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  onlineSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.gray600, marginTop: 2 },
  menu: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius['2xl'], paddingHorizontal: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  menuLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
});
