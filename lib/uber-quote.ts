import { supabase } from './supabase';
import type { DeliveryAddress } from './delivery-address';

export type UberQuoteResult = {
  enabled: boolean;
  quote_id?: string;
  fee?: number;
  fee_label?: string;
  duration_minutes?: number;
  expires?: string;
  error?: string;
};

export async function fetchUberDeliveryQuote(
  shopId: string,
  dropoff: DeliveryAddress,
): Promise<UberQuoteResult> {
  const { data, error } = await supabase.functions.invoke('uber-delivery-quote', {
    body: { shop_id: shopId, dropoff },
  });
  if (error) {
    return { enabled: false, error: error.message };
  }
  return (data ?? { enabled: false }) as UberQuoteResult;
}

export async function dispatchUberDelivery(productOrderId: string): Promise<{ ok: boolean; error?: string; tracking_url?: string }> {
  const { data, error } = await supabase.functions.invoke('uber-delivery-dispatch', {
    body: { product_order_id: productOrderId },
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error as string };
  return { ok: true, tracking_url: data?.tracking_url as string | undefined };
}
