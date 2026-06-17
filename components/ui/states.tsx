import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Button } from './button';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { colors, fonts, radius } from '@/theme';

/** Estado de erro de carregamento, com botão opcional de "tentar de novo". */
export function ErrorState({
  message = 'Não foi possível carregar. Verifique sua conexão e tente de novo.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const themeColors = useThemeColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: themeColors.gray100 }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={themeColors.gray600} />
      </View>
      <Text style={[styles.text, { color: themeColors.gray600 }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={[styles.btn, { backgroundColor: themeColors.ink }]} hitSlop={6}>
          <Text style={[styles.btnText, { color: themeColors.white }]}>Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Lista ou seção vazia com ícone e CTA opcional. */
export function EmptyState({
  icon = 'folder-open-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const themeColors = useThemeColors();
  return (
    <View style={[styles.emptyCard, { backgroundColor: themeColors.white, borderColor: themeColors.gray200 }, style]}>
      <View style={[styles.iconCircle, { backgroundColor: themeColors.gray100 }]}>
        <Ionicons name={icon} size={26} color={themeColors.gray600} />
      </View>
      <Text style={[styles.emptyTitle, { color: themeColors.ink }]}>{title}</Text>
      {description ? <Text style={[styles.emptyDesc, { color: themeColors.gray600 }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="dark" size="md" onPress={onAction} style={{ marginTop: 4, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}

/** Banner inline para feedback de formulário. */
export function MessageBanner({
  variant,
  children,
}: {
  variant: 'error' | 'success' | 'info';
  children: string;
}) {
  const themeColors = useThemeColors();
  const palette = {
    error: { bg: themeColors.redBg, border: 'rgba(220,38,38,0.15)', text: themeColors.redText },
    success: { bg: themeColors.greenBg, border: 'rgba(22,163,74,0.15)', text: themeColors.greenText },
    info: { bg: themeColors.blue === '#1E1BE0' ? '#EEEEFF' : 'rgba(30, 27, 224, 0.12)', border: 'rgba(30,27,224,0.12)', text: themeColors.blue },
  }[variant];

  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.bannerText, { color: palette.text }]}>{children}</Text>
    </View>
  );
}

/** Spinner centralizado para telas ou seções. */
export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  const themeColors = useThemeColors();
  return (
    <View style={styles.wrap}>
      <View style={styles.loadingDots}>
        <View style={[styles.dot, styles.dotA, { backgroundColor: themeColors.blue }]} />
        <View style={[styles.dot, styles.dotB, { backgroundColor: themeColors.blue }]} />
        <View style={[styles.dot, styles.dotC, { backgroundColor: themeColors.blue }]} />
      </View>
      <Text style={[styles.loadingLabel, { color: themeColors.gray600 }]}>{label}</Text>
    </View>
  );
}

/** Placeholder animado (bloco único). */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const themeColors = useThemeColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1.0, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[{ backgroundColor: themeColors.gray200, borderRadius: radius.sm }, { height, width }, animStyle, style]} />;
}

/** Card skeleton para listas. */
export function SkeletonCard() {
  const themeColors = useThemeColors();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: themeColors.white, borderColor: themeColors.gray200 }]}>
      <Skeleton height={40} width={40} style={{ borderRadius: radius.md }} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={12} width="90%" />
        <Skeleton height={11} width="45%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontFamily: fonts.headBold, fontSize: 16, color: colors.ink, textAlign: 'center' },
  emptyDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  loadingLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.gray600 },
  loadingDots: { flexDirection: 'row', gap: 6, alignItems: 'center', height: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue, opacity: 0.35 },
  dotA: { opacity: 1 },
  dotB: { opacity: 0.65 },
  dotC: { opacity: 0.35 },
  skeleton: { backgroundColor: colors.gray200, borderRadius: radius.sm },
  skeletonCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 14,
  },
  banner: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
});
