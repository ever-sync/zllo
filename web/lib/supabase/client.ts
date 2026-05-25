import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { supabaseAnonKey, supabaseUrl } from './env';

/** Cliente Supabase para componentes de cliente (browser). */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
