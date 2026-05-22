import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

const TABS: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', label: 'Painel', icon: 'grid' },
  { name: 'orcamentos', label: 'Orçamentos', icon: 'flash' },
  { name: 'ordens', label: 'Ordens', icon: 'document-text' },
  { name: 'mensagens', label: 'Mensagens', icon: 'chatbubbles' },
  { name: 'perfil', label: 'Perfil', icon: 'storefront' },
];

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

/** Barra inferior clara da loja (mesmo estilo da do cliente, sem FAB). */
export function ShopTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  const goTo = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (activeName !== name && !event.defaultPrevented) navigation.navigate(name);
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((t) => {
        const focused = activeName === t.name;
        return (
          <Pressable key={t.name} style={styles.item} onPress={() => goTo(t.name)} hitSlop={6}>
            <Ionicons
              name={focused ? t.icon : (`${t.icon}-outline` as keyof typeof Ionicons.glyphMap)}
              size={21}
              color={focused ? colors.ink : colors.gray400}
            />
            <Text style={[styles.label, { color: focused ? colors.ink : colors.gray400 }]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    paddingTop: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 9.5 },
});
