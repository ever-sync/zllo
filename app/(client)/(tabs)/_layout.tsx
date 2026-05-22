import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/ui/floating-tab-bar';

export default function ClientTabs() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar state={props.state} navigation={props.navigation} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="loja" options={{ title: 'Loja' }} />
      <Tabs.Screen name="aparelhos" options={{ title: 'Aparelhos' }} />
      <Tabs.Screen name="pedidos" options={{ title: 'Pedidos' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
