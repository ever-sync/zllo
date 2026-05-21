# Deploy — Edge Functions (Pix/Asaas) + schema

> Mexe em **produção**. Faça com calma e revise cada passo.

## 0. Pré-requisitos
- `supabase login` (CLI autenticado na conta **dona** do projeto).
- `supabase/functions/.env` preenchido com a **ASAAS_API_KEY real** (sandbox ou produção).
- Saber o **project-ref** correto do zllo.
  - ⚠️ Hoje o app mobile aponta para `nkmpxyumayvnbpwxdkke`, que **não aparece**
    na conta logada (`supabase projects list`). Confirme qual é o projeto certo
    e/ou faça login na conta dona dele antes de prosseguir.

## 1. Schema (migrations) primeiro
O projeto hosted está **atrás** do local — faltam, entre outras:
`products`, `product_orders`, colunas de endereço/LGPD em `profiles`,
`browse_products`, `create_product_order`, `advance_product_order`, etc.

```bash
supabase link --project-ref <REF>
supabase db push          # aplica as migrations pendentes no hosted
```
Se o histórico divergir (migrations aplicadas fora de ordem no hosted),
resolva o conflito antes — não force.

## 2. Secrets + functions
```bash
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy create-pix-payment
supabase functions deploy create-product-payment
supabase functions deploy asaas-webhook   # verify_jwt=false (config.toml)
```
Ou tudo de uma vez (passos 1–2 do deploy): `bash scripts/deploy-functions.sh <REF>`

## 3. Webhook no painel do Asaas
- URL: `https://<REF>.supabase.co/functions/v1/asaas-webhook`
- Header: `asaas-access-token` = **mesmo** `ASAAS_WEBHOOK_TOKEN` do `.env`
- Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`

## 4. Carteira das lojas
Cada loja define o `asaas_wallet_id` (console → Configurações). Sem isso,
a cobrança retorna 422 ("loja não configurou recebimento").

## 5. App mobile / console
- Mobile: `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` apontando para o hosted (`.env`).
- Console web: `web/.env.local` com `NEXT_PUBLIC_SUPABASE_URL/PUBLISHABLE_KEY`
  do hosted (e deploy do Next à parte: Vercel/etc.).
