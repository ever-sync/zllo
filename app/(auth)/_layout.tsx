import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (session) {
    return <Redirect href={profile?.role === 'assistencia' ? '/(shop)/(tabs)' : '/(client)/(tabs)'} />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAFAFA' } }} />;
}
