import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';

/** Estado de erro de carregamento, com botão opcional de "tentar de novo". */
export function ErrorState({
  message = 'Não foi possível carregar. Verifique sua conexão e tente de novo.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.gray400} />
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.btn} hitSlop={6}>
          <Text style={styles.btnText}>Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  text: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.gray600,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  btn: { backgroundColor: colors.ink, borderRadius: radius.full, paddingHorizontal: 18, paddingVertical: 9 },
  btnText: {
    fontFamily: fonts.headBold,
    fontSize: 12,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
