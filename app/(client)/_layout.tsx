import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function ClientLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="aparelho-novo" />
      <Stack.Screen name="solicitar" />
      <Stack.Screen name="pedido/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="vitrine" />
      <Stack.Screen name="anuncio-novo" />
      <Stack.Screen name="anuncio/[id]" />
    </Stack>
  );
}
