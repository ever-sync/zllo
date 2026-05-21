import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

/** Caixa de seleção com rótulo livre (usada no aceite LGPD do cadastro). */
export function Checkbox({
  checked,
  onToggle,
  children,
  style,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onToggle} style={[styles.row, style]} hitSlop={6}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.blue : colors.white,
            borderColor: checked ? colors.blue : colors.gray400,
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
      <View style={styles.label}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  label: { flex: 1 },
});
