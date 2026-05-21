# Pagamentos (Pix + split) — Edge Functions

Pagamento via **Asaas** (Pix com split: 97% para a loja, 3% ficam com a conta
marketplace da zllo automaticamente). O provedor está isolado em
`create-pix-payment/index.ts` — trocar por Pagar.me/Stripe é mexer só ali.

## Pré-requisitos (uma vez)

1. **Conta Asaas** (marketplace) + API key (sandbox ou produção).
2. **Cada loja** precisa de uma conta Asaas e do seu `walletId` — o lojista
   informa em *Perfil → Editar dados da loja* (campo "Conta de recebimento").
3. **Secrets** no projeto Supabase:
   ```sh
   supabase secrets set ASAAS_API_KEY=xxxxx
   supabase secrets set ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3   # produção: https://api.asaas.com/v3
   supabase secrets set ASAAS_WEBHOOK_TOKEN=um-token-secreto-qualquer
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` já são injetadas.)

## Deploy

```sh
supabase functions deploy create-pix-payment
supabase functions deploy asaas-webhook
```

## Webhook no painel do Asaas

- URL: `https://<project-ref>.supabase.co/functions/v1/asaas-webhook`
- Adicione o header de autenticação `asaas-access-token` = mesmo valor de
  `ASAAS_WEBHOOK_TOKEN`.
- Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`.

## Fluxo

1. App (cliente) chama `create-pix-payment` com `{ order_id }` → cria a cobrança
   com split, grava `payments` (pendente) e retorna o QR Code Pix.
2. Cliente paga → Asaas chama `asaas-webhook` → `payments.status = 'pago'`.
3. O app acompanha via Realtime na tabela `payments`.

## Observações

- A migration `20260521080000_payments.sql` precisa estar aplicada.
- A comissão (3%) e o repasse (97%) são gravados em `payments` para o financeiro.
