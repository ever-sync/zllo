import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { colors, fonts, radius } from '@/theme';

type Variant = 'primary' | 'accent' | 'dark' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const themeColors = useThemeColors();

  const bg: Record<Variant, string> = {
    primary: themeColors.blue,
    accent: themeColors.lime,
    dark: themeColors.ink,
    secondary: themeColors.white,
    ghost: 'transparent',
  };

  const fg: Record<Variant, string> = {
    primary: themeColors.white,
    accent: themeColors.ink,
    dark: themeColors.white,
    secondary: themeColors.ink,
    ghost: themeColors.blue,
  };

  const isDisabled = disabled || loading;
  const onPressWithFeedback = () => {
    if (isDisabled || !onPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  return (
    <Pressable
      onPress={onPressWithFeedback}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        {
          backgroundColor: isDisabled ? themeColors.gray200 : bg[variant],
          borderColor: variant === 'secondary' ? themeColors.gray200 : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isDisabled ? themeColors.gray600 : fg[variant]} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.label, { color: isDisabled ? themeColors.gray600 : fg[variant] }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingVertical: 11, paddingHorizontal: 16 },
  lg: { paddingVertical: 15, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    fontFamily: fonts.head,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
