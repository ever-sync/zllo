import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors, fonts } from '@/theme';

export default function ShopTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 10 },
        tabBarStyle: { borderTopColor: colors.gray200 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Painel', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="orcamentos"
        options={{ title: 'Orçamentos', tabBarIcon: ({ color, size }) => <Ionicons name="flash-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="ordens"
        options={{ title: 'Ordens', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="mensagens"
        options={{ title: 'Mensagens', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
