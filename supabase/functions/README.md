# Pagamentos (Pix + split) — Edge Functions

Pagamento via **Asaas** (Pix com split: 97% para a loja, 3% ficam com a conta
marketplace da zllo automaticamente). O provedor está isolado em
`create-pix-payment/index.ts` e `create-product-payment/index.ts`.

## Pré-requisitos (uma vez)

1. **Conta Asaas** (marketplace) + API key (sandbox ou produção).
2. **Cada loja** precisa de uma conta Asaas e do seu `walletId` — o lojista
   informa em *Perfil → Editar dados da loja* (campo "Conta de recebimento").
3. **Secrets** no projeto Supabase:
   ```sh
   supabase secrets set ASAAS_API_KEY=xxxxx
   supabase secrets set ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3   # produção: https://api.asaas.com/v3
   supabase secrets set ASAAS_WEBHOOK_TOKEN=um-token-secreto-qualquer
   supabase secrets set WEB_APP_URL=https://seu-console-web.up.railway.app
   supabase secrets set ALLOWED_ORIGINS=https://seu-console-web.up.railway.app,http://localhost:3000
   supabase secrets set REVALIDATE_SECRET=mesmo-valor-do-next-js
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` já são injetadas.)

   `WEB_APP_URL` + `REVALIDATE_SECRET` invalidam o cache do catálogo web quando
   um pedido de produto é pago (estoque atualizado). Defina `REVALIDATE_SECRET`
   também no `.env.local` do Next.js.

## Deploy

```sh
supabase functions deploy create-pix-payment
supabase functions deploy create-product-payment
supabase functions deploy asaas-webhook
```

## Webhook no painel do Asaas

- URL: `https://<project-ref>.supabase.co/functions/v1/asaas-webhook`
- Adicione o header de autenticação `asaas-access-token` = mesmo valor de
  `ASAAS_WEBHOOK_TOKEN`.
- Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`.

## Fluxo

1. App (cliente) chama `create-pix-payment` com `{ order_id }` (reparo) ou
   `create-product-payment` com `{ product_order_id }` (marketplace).
2. Cliente paga → Asaas chama `asaas-webhook` → status `pago` + invalidação
   do cache do catálogo (produtos).
3. O app acompanha via Realtime (`payments` ou `product_orders`).

## Observações

- Migrations de pagamentos e marketplace precisam estar aplicadas.
- Logs estruturados (JSON) em `_shared/log.ts` — visíveis no dashboard Supabase.
- Pagamento de teste: só com `app_config.allow_test_payments = true` (seed local).
