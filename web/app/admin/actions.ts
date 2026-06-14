'use server';

import { updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { CACHE_TAG_ADMIN, CACHE_TAG_CATALOG } from '@/lib/cache-tags';

type DisputeStatus = Database['public']['Enums']['dispute_status'];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return { supabase: null as null, error: 'Sem permissão' };
  return { supabase, error: null };
}

export async function adminSetProductActive(
  productId: string,
  active: boolean,
): Promise<{ error?: string }> {
  const { supabase, error: authErr } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr ?? 'Sem permissão' };

  const { error } = await supabase.rpc('admin_set_product_active', {
    p_id: productId,
    p_active: active,
  });
  if (error) return { error: error.message };

  updateTag(CACHE_TAG_ADMIN);
  updateTag(CACHE_TAG_CATALOG);
  return {};
}

export async function adminResolveDispute(
  id: string,
  status: DisputeStatus,
  resolution: string,
): Promise<{ error?: string }> {
  const { supabase, error: authErr } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr ?? 'Sem permissão' };

  const { error } = await supabase.rpc('admin_resolve_dispute', {
    p_id: id,
    p_status: status,
    p_resolution: resolution,
  });
  if (error) return { error: error.message };

  updateTag(CACHE_TAG_ADMIN);
  return {};
}
