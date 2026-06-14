#!/usr/bin/env bash
# E2E reparo: solicitação → orçamento → aceitar → pagamento teste.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! grep -q '^API_URL=' supabase/functions/.env 2>/dev/null; then
  echo "Falta supabase/functions/.env (copie de .env.example)."; exit 1
fi
export "$(grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=' supabase/functions/.env | xargs)"
node scripts/repair-e2e.mjs
