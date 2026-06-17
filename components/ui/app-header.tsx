import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { colors as staticColors, fonts } from '@/theme';

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.head, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 1 },
});
