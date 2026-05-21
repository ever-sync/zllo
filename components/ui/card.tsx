import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardHeader({
  title,
  count,
  actionLabel,
  onAction,
  light,
}: {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
  light?: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={[styles.headerTitle, light && { color: colors.white }]}>{title}</Text>
        {count !== undefined ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius['2xl'],
    padding: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle: { fontFamily: fonts.head, fontSize: 15, color: colors.ink },
  badge: { backgroundColor: colors.blue, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.headBold, fontSize: 11, color: colors.white },
  action: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.blue },
});
