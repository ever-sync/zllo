#!/usr/bin/env bash
# Deploy das Edge Functions (Pix/Asaas) + secrets para um projeto Supabase hosted.
# Uso: bash scripts/deploy-functions.sh <project-ref>
#
# Pré-requisitos:
#   - supabase login  (já logado)
#   - supabase/functions/.env preenchido (ASAAS_API_KEY real)
#   - o schema do projeto hosted precisa estar atualizado (db push) — ver runbook
set -e
cd "$(dirname "$0")/.."

REF="${1:?Uso: bash scripts/deploy-functions.sh <project-ref>}"

if ! grep -q '^ASAAS_API_KEY=.\+' supabase/functions/.env 2>/dev/null \
   || grep -q 'PREENCHA' supabase/functions/.env; then
  echo "✋ Preencha ASAAS_API_KEY em supabase/functions/.env antes do deploy."; exit 1
fi

echo "→ 1/4 link do projeto $REF"
supabase link --project-ref "$REF"

echo "→ 2/4 push das migrations (schema do hosted)"
echo "   (revise o diff; o hosted precisa de products/product_orders/etc.)"
supabase db push

echo "→ 3/4 secrets das functions (a partir de supabase/functions/.env)"
supabase secrets set --env-file supabase/functions/.env

echo "→ 4/4 deploy das functions (config.toml define verify_jwt por função)"
supabase functions deploy create-pix-payment
supabase functions deploy create-product-payment
supabase functions deploy asaas-webhook
supabase functions deploy uber-delivery-quote
supabase functions deploy uber-delivery-dispatch
supabase functions deploy uber-webhook
supabase functions deploy product-order-cancel

echo ""
echo "✅ Deploy concluído. Webhooks:"
echo "   Asaas: https://$REF.supabase.co/functions/v1/asaas-webhook"
echo "   Uber:  https://$REF.supabase.co/functions/v1/uber-webhook"
