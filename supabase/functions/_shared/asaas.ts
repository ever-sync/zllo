const ASAAS_BASE = Deno.env.get('ASAAS_BASE_URL') ?? 'https://api-sandbox.asaas.com/v3';
const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';

export async function asaasRequest(path: string, init?: RequestInit) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_KEY,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.description ?? `Asaas ${res.status}`);
  }
  return data;
}

/** Estorno integral Pix (webhook PAYMENT_REFUNDED confirma depois). */
export async function refundAsaasPayment(paymentId: string, description = 'Pedido cancelado pela loja') {
  return asaasRequest(`/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}
