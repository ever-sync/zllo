import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type Shop = {
  id: string;
  owner_id: string;
  name: string;
  is_online: boolean;
  coins: number;
  rating: number;
  reviews_count: number;
  address: string | null;
};

type ShopState = {
  shop: Shop | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setOnline: (value: boolean) => Promise<void>;
};

const ShopContext = createContext<ShopState | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setShop(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('shops')
      .select('id, owner_id, name, is_online, coins, rating, reviews_count, address')
      .eq('owner_id', session.user.id)
      .maybeSingle();
    setShop((data as Shop) ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const setOnline = async (value: boolean) => {
    if (!shop) return;
    setShop({ ...shop, is_online: value });
    await supabase.from('shops').update({ is_online: value }).eq('id', shop.id);
  };

  return (
    <ShopContext.Provider value={{ shop, loading, refresh: load, setOnline }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop precisa estar dentro de <ShopProvider>');
  return ctx;
}
