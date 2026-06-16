import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { ShopProvider } from '@/lib/shop';
import { colors } from '@/theme';

export default function ShopLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/welcome" />;
  if (profile?.role !== 'assistencia') return <Redirect href="/(client)/(tabs)" />;

  return (
    <ShopProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="solicitacao/[id]" />
        <Stack.Screen name="os/[id]" />
        <Stack.Screen name="conversa/[id]" />
        <Stack.Screen name="vendas" />
        <Stack.Screen name="financeiro" />
        <Stack.Screen name="reputacao" />
        <Stack.Screen name="produtos" />
        <Stack.Screen name="configuracoes" />
        <Stack.Screen name="notificacoes" />
      </Stack>
    </ShopProvider>
  );
}
