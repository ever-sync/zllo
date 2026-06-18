/** Cliente Uber Direct (OAuth + quotes + deliveries). */

export type AddressParts = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  uf?: string | null;
  cep?: string | null;
};

export function isUberConfigured(): boolean {
  return Boolean(
    Deno.env.get('UBER_DIRECT_CLIENT_ID') &&
      Deno.env.get('UBER_DIRECT_CLIENT_SECRET') &&
      Deno.env.get('UBER_DIRECT_CUSTOMER_ID'),
  );
}

export function isUberMock(): boolean {
  return Deno.env.get('UBER_DIRECT_MOCK') === '1';
}

export function toUberAddressJson(parts: AddressParts): string {
  const line1 = [parts.street, parts.number].filter(Boolean).join(', ');
  const line2 = parts.complement ?? parts.neighborhood ?? '';
  const street_address = [line1, line2].filter((s) => s && s.length > 0);
  return JSON.stringify({
    street_address: street_address.length ? street_address : ['Endereço'],
    city: parts.city ?? 'São Paulo',
    state: parts.uf ?? 'SP',
    zip_code: (parts.cep ?? '').replace(/\D/g, '') || '01310100',
    country: 'BR',
  });
}

export function formatAddressLabel(parts: AddressParts): string {
  const linha1 = [parts.street, parts.number].filter(Boolean).join(', ');
  const local = parts.uf ? `${parts.city}/${parts.uf}` : parts.city;
  return [linha1, parts.complement, parts.neighborhood, local].filter(Boolean).join(' · ');
}

let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (isUberMock()) return 'mock-token';
  const now = Date.now();
  if (cachedToken && cachedToken.exp > now + 60_000) return cachedToken.value;

  const clientId = Deno.env.get('UBER_DIRECT_CLIENT_ID')!;
  const clientSecret = Deno.env.get('UBER_DIRECT_CLIENT_SECRET')!;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries',
  });

  const res = await fetch('https://auth.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error_description ?? data?.message ?? `Uber auth ${res.status}`);
  }
  cachedToken = {
    value: data.access_token as string,
    exp: now + (Number(data.expires_in) || 3600) * 1000,
  };
  return cachedToken.value;
}

function customerPath(suffix: string): string {
  const id = Deno.env.get('UBER_DIRECT_CUSTOMER_ID')!;
  return `https://api.uber.com/v1/customers/${id}${suffix}`;
}

export async function createDeliveryQuote(pickup: AddressParts, dropoff: AddressParts) {
  if (isUberMock()) {
    return {
      id: `mock-quote-${crypto.randomUUID()}`,
      fee: 1290,
      currency: 'BRL',
      duration: 25,
      expires: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  }

  const token = await getAccessToken();
  const res = await fetch(customerPath('/delivery_quotes'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pickup_address: toUberAddressJson(pickup),
      dropoff_address: toUberAddressJson(dropoff),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? data?.code ?? `Uber quote ${res.status}`);
  }
  return data as {
    id: string;
    fee: number;
    currency?: string;
    duration?: number;
    expires?: string;
  };
}

export type ManifestItem = { name: string; quantity: number; price: number };

export async function createDelivery(params: {
  quoteId: string;
  pickupName: string;
  pickupPhone: string;
  pickup: AddressParts;
  dropoffName: string;
  dropoffPhone: string;
  dropoff: AddressParts;
  items: ManifestItem[];
  externalId: string;
}) {
  if (isUberMock()) {
    return {
      id: `mock-delivery-${crypto.randomUUID()}`,
      status: 'pending',
      tracking_url: 'https://example.com/uber-tracking-mock',
      fee: 1290,
    };
  }

  const token = await getAccessToken();
  const res = await fetch(customerPath('/deliveries'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quote_id: params.quoteId,
      pickup_name: params.pickupName,
      pickup_address: toUberAddressJson(params.pickup),
      pickup_phone_number: params.pickupPhone,
      dropoff_name: params.dropoffName,
      dropoff_address: toUberAddressJson(params.dropoff),
      dropoff_phone_number: params.dropoffPhone,
      manifest_items: params.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        size: 'small',
        price: Math.round(it.price * 100),
      })),
      external_id: params.externalId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? data?.code ?? `Uber delivery ${res.status}`);
  }
  return data as {
    id: string;
    status: string;
    tracking_url?: string;
    fee?: number;
  };
}

export async function cancelDelivery(deliveryId: string) {
  if (isUberMock()) {
    return { id: deliveryId, status: 'canceled' };
  }

  const token = await getAccessToken();
  const res = await fetch(customerPath(`/deliveries/${deliveryId}/cancel`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) {
      return { id: deliveryId, status: 'canceled' };
    }
    throw new Error(data?.message ?? data?.code ?? `Uber cancel ${res.status}`);
  }
  return data as { id: string; status: string };
}

export async function verifyUberWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = Deno.env.get('UBER_WEBHOOK_SIGNING_KEY');
  if (!secret) return Deno.env.get('UBER_DIRECT_MOCK') === '1';
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === signature.toLowerCase();
}

export function mapUberStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('deliver')) return 'delivered';
  if (s.includes('cancel')) return 'canceled';
  if (s.includes('pickup') && s.includes('complete')) return 'in_transit';
  if (s.includes('pickup')) return 'pickup';
  if (s.includes('dropoff')) return 'in_transit';
  if (s.includes('return')) return 'failed';
  return 'created';
}
