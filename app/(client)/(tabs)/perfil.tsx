import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { formatCPF, formatPhone } from '@/lib/cpf';
import { useAuth } from '@/lib/auth';
import { colors, fonts, radius } from '@/theme';

export default function ClientProfile() {
  const { profile, signOut } = useAuth();
  const initials =
    profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <Screen>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? 'Cliente'}</Text>
        <Text style={styles.role}>Conta de cliente</Text>
      </View>

      <View style={styles.info}>
        <Row label="E-mail" value={profile?.email ?? '—'} />
        <Row label="Telefone" value={profile?.phone ? formatPhone(profile.phone) : '—'} />
        <Row label="CPF" value={profile?.cpf ? formatCPF(profile.cpf) : '—'} last />
      </View>

      <Button label="Sair da conta" variant="secondary" onPress={signOut} style={{ marginTop: 20 }} />
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.headBlack, fontSize: 30, color: colors.ink },
  name: { fontFamily: fonts.head, fontSize: 20, color: colors.ink, marginTop: 12 },
  role: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 2 },
  info: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600 },
  rowValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
});
