#!/usr/bin/env bash
# Smoke da plataforma: CI local + E2E reparo (se credenciais existirem).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Smoke plataforma zllo ==="
bash scripts/smoke-ci.sh

if [[ -f supabase/functions/.env ]] && grep -q '^SERVICE_ROLE_KEY=' supabase/functions/.env 2>/dev/null; then
  echo ""
  echo "→ E2E reparo (hosted/local com seed)"
  bash scripts/repair-e2e.sh
else
  echo ""
  echo "⊘ E2E reparo pulado (supabase/functions/.env sem SERVICE_ROLE_KEY)"
fi

echo ""
echo "✓ Smoke plataforma concluído"
