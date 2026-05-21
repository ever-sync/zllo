import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Carrinho do cliente — uma loja por vez (modelo iFood), persistido localmente. */

export type CartItem = {
  product_id: string;
  name: string;
  price: number;
  photo: string | null;
  qty: number;
};

type AddResult = 'ok' | 'other_shop';

type CartState = {
  shopId: string | null;
  shopName: string | null;
  items: CartItem[];
  count: number;
  total: number;
  /** Adiciona; retorna 'other_shop' se já houver itens de outra loja. */
  add: (shopId: string, shopName: string, item: Omit<CartItem, 'qty'>, qty?: number) => AddResult;
  /** Esvazia e começa um novo carrinho com este item (troca de loja). */
  replaceWith: (shopId: string, shopName: string, item: Omit<CartItem, 'qty'>, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const KEY = 'zllo.cart.v1';
const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try {
          const s = JSON.parse(raw);
          setShopId(s.shopId ?? null);
          setShopName(s.shopName ?? null);
          setItems(Array.isArray(s.items) ? s.items : []);
        } catch {
          // ignora carrinho corrompido
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ shopId, shopName, items }));
  }, [shopId, shopName, items, hydrated]);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const replaceWith: CartState['replaceWith'] = (sId, sName, item, qty = 1) => {
      setShopId(sId);
      setShopName(sName);
      setItems([{ ...item, qty }]);
    };

    const add: CartState['add'] = (sId, sName, item, qty = 1) => {
      if (items.length > 0 && shopId && shopId !== sId) return 'other_shop';
      setShopId(sId);
      setShopName(sName);
      setItems((prev) => {
        const ix = prev.findIndex((i) => i.product_id === item.product_id);
        if (ix >= 0) {
          const cp = [...prev];
          cp[ix] = { ...cp[ix], qty: cp[ix].qty + qty };
          return cp;
        }
        return [...prev, { ...item, qty }];
      });
      return 'ok';
    };

    const setQty: CartState['setQty'] = (pid, qty) =>
      setItems((prev) => prev.map((i) => (i.product_id === pid ? { ...i, qty: Math.max(1, qty) } : i)));

    const remove: CartState['remove'] = (pid) =>
      setItems((prev) => {
        const next = prev.filter((i) => i.product_id !== pid);
        if (next.length === 0) {
          setShopId(null);
          setShopName(null);
        }
        return next;
      });

    const clear: CartState['clear'] = () => {
      setItems([]);
      setShopId(null);
      setShopName(null);
    };

    return { shopId, shopName, items, count, total, add, replaceWith, setQty, remove, clear };
  }, [shopId, shopName, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
}
