import type { DeliveryAddress } from './delivery-address';
import { fetchUberDeliveryQuote, type UberQuoteResult } from './uber-quote';

/** Renova a cotação um minuto antes de expirar. */
export const QUOTE_EXPIRY_BUFFER_MS = 60_000;

export function isUberQuoteExpired(expires?: string | null, now = Date.now()): boolean {
  if (!expires) return false;
  const t = Date.parse(expires);
  if (Number.isNaN(t)) return false;
  return t <= now + QUOTE_EXPIRY_BUFFER_MS;
}

export function uberQuoteMinutesLeft(expires?: string | null, now = Date.now()): number | null {
  if (!expires) return null;
  const t = Date.parse(expires);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - now) / 60_000));
}

export function isUberQuoteUsable(quote: UberQuoteResult): boolean {
  return Boolean(quote.enabled && quote.quote_id && !isUberQuoteExpired(quote.expires));
}

export async function ensureFreshUberQuote(
  shopId: string,
  dropoff: DeliveryAddress,
  current?: UberQuoteResult | null,
): Promise<{ quote: UberQuoteResult; refreshed: boolean }> {
  if (current && isUberQuoteUsable(current)) {
    return { quote: current, refreshed: false };
  }
  const quote = await fetchUberDeliveryQuote(shopId, dropoff);
  return { quote, refreshed: true };
}
