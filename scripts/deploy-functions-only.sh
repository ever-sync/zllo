#!/usr/bin/env bash
# Deploy SÓ das Edge Functions (sem db push). Não precisa da senha do DB,
# mas precisa de 'supabase login' na conta dona do projeto.
# ⚠️ As functions dependem do schema novo (product_orders, asaas_wallet_id,
#    asaas_customer_id, payments). Se o hosted não tiver, elas quebram em runtime.
# Uso: bash scripts/deploy-functions-only.sh <project-ref>
set -e
cd "$(dirname "$0")/.."
REF="${1:?Uso: bash scripts/deploy-functions-only.sh <project-ref>}"

echo "→ deploy das functions em $REF"
supabase functions deploy create-pix-payment --project-ref "$REF"
supabase functions deploy create-product-payment --project-ref "$REF"
supabase functions deploy asaas-webhook --project-ref "$REF" --no-verify-jwt

if grep -q 'PREENCHA' supabase/functions/.env 2>/dev/null; then
  echo "⚠️ ASAAS_API_KEY ainda é placeholder — secrets NÃO aplicados."
  echo "   Depois de preencher: supabase secrets set --project-ref $REF --env-file supabase/functions/.env"
else
  echo "→ aplicando secrets"
  supabase secrets set --project-ref "$REF" --env-file supabase/functions/.env
fi

echo ""
echo "✅ Functions no ar. Webhook no painel Asaas:"
echo "   URL:   https://$REF.supabase.co/functions/v1/asaas-webhook"
echo "   Header asaas-access-token = ASAAS_WEBHOOK_TOKEN do .env"
echo "   Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_REFUNDED"
