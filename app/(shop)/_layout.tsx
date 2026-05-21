import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { ShopProvider } from '@/lib/shop';
import { colors } from '@/theme';

export default function ShopLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/welcome" />;

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
        <Stack.Screen name="configuracoes" />
      </Stack>
    </ShopProvider>
  );
}
