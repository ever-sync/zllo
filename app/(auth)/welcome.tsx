import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { colors, fonts } from '@/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen background={colors.blue} scroll={false}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Brand size={40} onDark />
        </View>

        <View style={styles.middle}>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Orçamentos em minutos</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Pagamento Pix seguro</Text>
            </View>
          </View>
          <Text style={styles.title}>Conserto de celular{'\n'}sem complicação.</Text>
          <Text style={styles.subtitle}>
            Descreva o problema e receba orçamentos de assistências perto de você. Você escolhe a
            melhor — a gente cuida do resto.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Criar conta grátis" variant="accent" onPress={() => router.push('/register')} />
          <Button label="Já tenho conta" variant="secondary" onPress={() => router.push('/login')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'space-between' },
  top: { paddingTop: 24 },
  middle: { gap: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill: {
    backgroundColor: 'rgba(211,254,24,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(211,254,24,0.35)',
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.lime },
  title: { fontFamily: fonts.headBlack, fontSize: 34, lineHeight: 38, color: colors.white, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.85)' },
  actions: { gap: 12, paddingBottom: 12 },
});
