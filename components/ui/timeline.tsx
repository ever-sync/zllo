import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { ORDER_STEPS, stepIndex } from '@/lib/order-status';
import { colors, fonts } from '@/theme';

/**
 * Linha do tempo da OS. `events` mapeia a chave do status → horário formatado.
 */
export function Timeline({ status, events }: { status: string; events: Record<string, string> }) {
  const current = stepIndex(status);

  return (
    <View>
      {ORDER_STEPS.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const last = i === ORDER_STEPS.length - 1;
        const time = events[step.key];
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.left}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isCurrent ? colors.blue : done ? colors.green : colors.gray200,
                    borderColor: isCurrent ? colors.lime : 'transparent',
                    borderWidth: isCurrent ? 3 : 0,
                  },
                ]}
              >
                {done && !isCurrent ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
              </View>
              {!last ? <View style={[styles.line, { backgroundColor: done ? colors.green : colors.gray200 }]} /> : null}
            </View>
            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  {
                    color: done || isCurrent ? colors.ink : colors.gray400,
                    fontFamily: isCurrent ? fonts.bodyBold : fonts.bodyMedium,
                  },
                ]}
              >
                {step.label}
              </Text>
              <Text style={styles.time}>{time ?? (isCurrent ? 'Em andamento' : '—')}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  left: { width: 24, alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 2 },
  content: { flex: 1, paddingBottom: 18 },
  label: { fontSize: 14 },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.gray600, marginTop: 2 },
});
