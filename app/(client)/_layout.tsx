import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { colors } from '@/theme';

export default function ClientLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/welcome" />;
  if (profile?.role === 'assistencia') return <Redirect href="/(shop)/(tabs)" />;

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="aparelho-novo" />
        <Stack.Screen name="solicitar" />
        <Stack.Screen name="pedido/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="vitrine" />
        <Stack.Screen name="anuncio-novo" />
        <Stack.Screen name="anuncio/[id]" />
        <Stack.Screen name="anuncio-editar/[id]" />
        <Stack.Screen name="anuncio-chat/[id]" />
        <Stack.Screen name="notificacoes" />
        <Stack.Screen name="produto/[id]" />
        <Stack.Screen name="carrinho" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="pedido-produto/[id]" />
      </Stack>
    </CartProvider>
  );
}
