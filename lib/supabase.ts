import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Use the CommonJS entry so the Android Hermes bundle does not pick the ESM
// tracing path with a dynamic import that fails bytecode generation.
import { createClient } from '@supabase/supabase-js/dist/index.cjs';
import { AppState, Platform } from 'react-native';

import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[zllo] Variáveis do Supabase ausentes. Defina EXPO_PUBLIC_SUPABASE_URL e ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Na web o supabase-js usa localStorage por padrão; no nativo usamos AsyncStorage.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// No app nativo, pausa/retoma o refresh automático do token conforme o app vai
// para segundo plano — recomendado pela doc do Supabase para React Native.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
