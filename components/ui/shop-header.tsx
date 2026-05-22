import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShop } from '@/lib/shop';
import { colors, fonts, radius } from '@/theme';

/**
 * Header padrão das telas da loja: saudação OU título à esquerda; pílula de
 * status online (alterna ao tocar) + avatar à direita. Ação extra opcional.
 */
export function ShopHeader({
  title,
  subtitle,
  greeting,
  right,
}: {
  title?: string;
  subtitle?: string;
  greeting?: boolean;
  right?: ReactNode;
}) {
  const { shop, setOnline } = useShop();
  const name = shop?.name ?? 'Loja';
  const firstName = name.split(' ')[0];
  const initial = name.trim()[0]?.toUpperCase() ?? 'L';
  const online = shop?.is_online ?? false;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        {greeting ? (
          <Text style={styles.greeting}>
            Olá, <Text style={styles.name}>{firstName}</Text> 👋
          </Text>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>
        {right}
        <Pressable
          style={[styles.toggle, { backgroundColor: online ? colors.lime : colors.gray200 }]}
          onPress={() => setOnline(!online)}
          hitSlop={6}
        >
          <View style={[styles.dot, { backgroundColor: online ? colors.green : colors.gray400 }]} />
          <Text style={[styles.toggleText, { color: online ? colors.ink : colors.gray600 }]}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4, marginBottom: 4 },
  greeting: { fontFamily: fonts.head, fontSize: 20, color: colors.ink },
  name: { fontFamily: fonts.headBlack, color: colors.ink },
  title: { fontFamily: fonts.headBlack, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.gray600, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.full },
  dot: { width: 8, height: 8, borderRadius: 4 },
  toggleText: { fontFamily: fonts.headBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headBlack, fontSize: 16, color: colors.ink },
});
