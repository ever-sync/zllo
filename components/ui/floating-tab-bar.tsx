import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';

/** Ícone base por rota (focado = preenchido; senão "-outline"). */
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  loja: 'storefront',
  aparelhos: 'phone-portrait',
  pedidos: 'receipt',
  perfil: 'person',
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

/** Barra inferior flutuante (pílula escura), com a aba ativa em lima. */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const onHome = state.routes[state.index]?.name === 'index';

  return (
    <View style={[styles.outer, { backgroundColor: onHome ? colors.ink : colors.paper, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.pill}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const base = ICONS[route.name] ?? 'ellipse';
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable key={route.key} style={styles.item} onPress={onPress} hitSlop={8}>
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={focused ? base : (`${base}-outline` as keyof typeof Ionicons.glyphMap)}
                  size={22}
                  color={focused ? colors.ink : 'rgba(255,255,255,0.55)'}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, paddingTop: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1A1A1A',
    borderRadius: radius.full,
    height: 64,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.lime },
});
