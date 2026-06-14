import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CACHE_TAG_ADMIN, CACHE_TAG_CATALOG } from '@/lib/cache-tags';

const ADMIN_TTL = 60;
const CATALOG_TTL = 30;

export async function fetchAdminMetrics() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('admin_metrics');
      if (error) return null;
      return data;
    },
    ['admin-metrics'],
    { revalidate: ADMIN_TTL, tags: [CACHE_TAG_ADMIN] },
  )();
}

export async function fetchAdminShops() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('admin_shops');
      if (error) return [];
      return data ?? [];
    },
    ['admin-shops'],
    { revalidate: ADMIN_TTL, tags: [CACHE_TAG_ADMIN] },
  )();
}

export async function fetchAdminProducts() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('admin_products');
      if (error) return [];
      return data ?? [];
    },
    ['admin-products'],
    { revalidate: ADMIN_TTL, tags: [CACHE_TAG_ADMIN] },
  )();
}

export async function fetchAdminOrders() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('admin_orders');
      if (error) return [];
      return data ?? [];
    },
    ['admin-orders'],
    { revalidate: ADMIN_TTL, tags: [CACHE_TAG_ADMIN] },
  )();
}

export async function fetchAdminDisputes() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('admin_disputes');
      if (error) return [];
      return data ?? [];
    },
    ['admin-disputes'],
    { revalidate: ADMIN_TTL, tags: [CACHE_TAG_ADMIN] },
  )();
}

/** Catálogo público (mesmo resultado para todos os clientes autenticados). */
export async function fetchActiveProducts() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category, price, stock, shop_id, photos, shop:shops(name, rating)')
        .eq('is_active', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(24);
      if (error) return [];
      return data ?? [];
    },
    ['active-products'],
    { revalidate: CATALOG_TTL, tags: [CACHE_TAG_CATALOG] },
  )();
}
