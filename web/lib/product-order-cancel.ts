import { createClient } from '@/lib/supabase/client';

export async function cancelShopProductOrder(productOrderId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke('product-order-cancel', {
    body: { product_order_id: productOrderId },
  });
  if (error) return { ok: false as const, error: error.message };
  if (data?.error) return { ok: false as const, error: data.error as string };
  return {
    ok: true as const,
    refunded: Boolean(data?.refunded),
    uberCanceled: Boolean(data?.uber_canceled),
  };
}
