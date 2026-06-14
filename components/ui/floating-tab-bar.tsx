import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

/** Abas visíveis na barra (aparelhos fica fora — acessível pela home). */
const TABS: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', label: 'Início', icon: 'home' },
  { name: 'loja', label: 'Loja', icon: 'storefront' },
  { name: 'pedidos', label: 'Pedidos', icon: 'receipt' },
  { name: 'perfil', label: 'Perfil', icon: 'person' },
];

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

/** Barra inferior clara com FAB central (Pedir assistência). */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeName = state.routes[state.index]?.name;

  const goTo = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (activeName !== name && !event.defaultPrevented) navigation.navigate(name);
  };

  const Tab = ({ name, label, icon }: (typeof TABS)[number]) => {
    const focused = activeName === name;
    return (
      <Pressable style={styles.item} onPress={() => goTo(name)} hitSlop={8}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
            size={22}
            color={focused ? colors.ink : colors.gray400}
          />
          {focused ? <View style={styles.activeDot} /> : null}
        </View>
        <Text style={[styles.label, { color: focused ? colors.ink : colors.gray400, fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Tab {...TABS[0]} />
      <Tab {...TABS[1]} />

      {/* FAB central: ação principal */}
      <View style={styles.fabSlot}>
        <Pressable style={styles.fab} onPress={() => router.push('/(client)/solicitar')} hitSlop={8}>
          <Ionicons name="construct" size={24} color={colors.lime} />
        </Pressable>
      </View>

      <Tab {...TABS[2]} />
      <Tab {...TABS[3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    paddingTop: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  iconWrap: { height: 26, alignItems: 'center', justifyContent: 'center' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lime, marginTop: 4 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5 },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    boxShadow: '0px 6px 10px rgba(0,0,0,0.2)',
    elevation: 10,
  },
});
