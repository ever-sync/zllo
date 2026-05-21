import {
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '@/lib/auth';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const [loaded] = useFonts({
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
