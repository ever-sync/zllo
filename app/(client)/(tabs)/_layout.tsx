import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors, fonts } from '@/theme';

export default function ClientTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.gray200 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="loja"
        options={{
          title: 'Loja',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="aparelhos"
        options={{
          title: 'Aparelhos',
          tabBarIcon: ({ color, size }) => <Ionicons name="phone-portrait-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
