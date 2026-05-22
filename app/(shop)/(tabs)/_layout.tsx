import { Tabs } from 'expo-router';
import { ShopTabBar } from '@/components/ui/shop-tab-bar';

export default function ShopTabs() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ShopTabBar state={props.state} navigation={props.navigation} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Painel' }} />
      <Tabs.Screen name="orcamentos" options={{ title: 'Orçamentos' }} />
      <Tabs.Screen name="ordens" options={{ title: 'Ordens' }} />
      <Tabs.Screen name="mensagens" options={{ title: 'Mensagens' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
