#!/usr/bin/env bash
# Reinicia as Edge Functions com os secrets atuais e roda o e2e do Pix.
# Uso: bash scripts/pix-test.sh   (depois de preencher supabase/functions/.env)
set -e
cd "$(dirname "$0")/.."

if ! grep -q '^ASAAS_API_KEY=' supabase/functions/.env 2>/dev/null; then
  echo "Falta supabase/functions/.env (copie de .env.example e preencha ASAAS_API_KEY)."; exit 1
fi

# token do webhook a partir do .env das functions
export "$(grep -E '^ASAAS_WEBHOOK_TOKEN=' supabase/functions/.env | xargs)"

# (re)inicia o functions serve com o env atualizado (destacado, persiste após o script)
pkill -f "functions serve" 2>/dev/null || true
pkill -f "edge-runtime" 2>/dev/null || true
sleep 1
( nohup supabase functions serve --env-file supabase/functions/.env > /tmp/zllo-fns.log 2>&1 & )
echo "subindo functions serve…"
for i in $(seq 1 40); do grep -qi "Serving functions" /tmp/zllo-fns.log && break; sleep 1; done

# chaves do supabase local
eval "$(supabase status -o env)"
API_URL="$API_URL" ANON_KEY="$ANON_KEY" SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
  ASAAS_WEBHOOK_TOKEN="$ASAAS_WEBHOOK_TOKEN" node scripts/pix-test.mjs
