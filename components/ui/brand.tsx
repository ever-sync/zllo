import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme';

/** Wordmark do zllo: "z" lima num quadrado + "llo". */
export function Brand({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  const box = Math.round(size * 1.25);
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.box,
          { width: box, height: box, borderRadius: Math.round(box * 0.24) },
        ]}
      >
        <Text style={[styles.z, { fontSize: size }]}>z</Text>
      </View>
      <Text
        style={[
          styles.word,
          { fontSize: size, color: onDark ? colors.white : colors.ink },
        ]}
      >
        llo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  box: {
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  z: { fontFamily: fonts.headBlack, color: colors.blue, lineHeight: undefined },
  word: { fontFamily: fonts.head, letterSpacing: -1 },
});
