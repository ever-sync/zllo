import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { registerPushToken } from './push';
import { supabase } from './supabase';

export type UserRole = 'cliente' | 'assistencia';

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    // RPC security definer: o dono lê o próprio perfil completo (inclui CPF/
    // telefone/email), que ficam fora do alcance de SELECT direto das contrapartes.
    const { data } = await supabase.rpc('get_my_profile');
    const row = Array.isArray(data) ? data[0] : data;
    setProfile((row as Profile) ?? null);
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
      if (data.session) registerPushToken();
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      await loadProfile(nextSession?.user.id);
      if (event === 'SIGNED_IN') registerPushToken();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: () => loadProfile(session?.user.id),
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
