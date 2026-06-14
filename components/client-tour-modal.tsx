import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { colors, fonts, radius } from '@/theme';

const STEPS = [
  {
    icon: 'phone-portrait-outline' as const,
    title: '1. Cadastre seu aparelho',
    text: 'Em Meus aparelhos, adicione marca e modelo do celular que precisa de reparo.',
  },
  {
    icon: 'construct-outline' as const,
    title: '2. Peça assistência',
    text: 'Descreva o problema, envie fotos e escolha se leva no local ou paga frete.',
  },
  {
    icon: 'chatbubbles-outline' as const,
    title: '3. Escolha e pague',
    text: 'Compare orçamentos das assistências próximas, converse no chat e pague com Pix.',
  },
];

export function ClientTourModal({
  visible,
  step,
  onNext,
  onSkip,
  onGoDevices,
}: {
  visible: boolean;
  step: number;
  onNext: () => void;
  onSkip: () => void;
  onGoDevices: () => void;
}) {
  const s = STEPS[step] ?? STEPS[0];
  const last = step >= STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={28} color={colors.blue} />
          </View>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.text}>{s.text}</Text>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          {step === 0 ? (
            <Button label="Cadastrar aparelho" onPress={onGoDevices} style={{ marginTop: 8 }} />
          ) : null}
          <Button label={last ? 'Entendi' : 'Próximo'} onPress={onNext} variant={step === 0 ? 'secondary' : 'dark'} style={{ marginTop: 8 }} />
          <Pressable onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>Pular tour</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius['2xl'],
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEEEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontFamily: fonts.head, fontSize: 18, color: colors.ink, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.gray600, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 18 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gray200 },
  dotActive: { backgroundColor: colors.blue, width: 18 },
  skip: { marginTop: 12, padding: 8 },
  skipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.gray600 },
});
