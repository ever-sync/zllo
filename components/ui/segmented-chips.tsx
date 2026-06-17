import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius } from '@/theme';

/** Pill chip para filtros (loja, vitrine, ordens). */
export function SegmentedChip({
  label,
  active,
  onPress,
  style,
  textStyle,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.ink : colors.white, borderColor: active ? colors.ink : colors.gray200 },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: active ? colors.white : colors.ink }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function SegmentedChipRow({
  children,
  scroll,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsScroll, style]}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.row, style]}>{children}</View>;
}

/** Opção com ícone (frete, entrega, localização). */
export function SegmentedOption({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.option,
        { borderColor: active ? colors.blue : colors.gray200, backgroundColor: active ? '#EEEEFF' : colors.white },
      ]}
    >
      <Ionicons name={icon} size={22} color={active ? colors.blue : colors.gray600} />
      <Text style={[styles.optionText, { color: active ? colors.blue : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function SegmentedOptionRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.optionRow, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsScroll: { gap: 8, paddingVertical: 14, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.headBold, fontSize: 12.5 },
  optionRow: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.lg, paddingVertical: 18 },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
