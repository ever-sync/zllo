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

if command -v maestro >/dev/null 2>&1 && [[ "${SKIP_MAESTRO:-}" != "1" ]]; then
  echo ""
  echo "→ Maestro (simulador/device deve ter dev build)"
  MAESTRO_REQUIRED=0 bash scripts/maestro-smoke.sh || echo "⊘ Maestro falhou ou app não instalado"
else
  echo ""
  echo "⊘ Maestro pulado (CLI ausente ou SKIP_MAESTRO=1) — ver docs/MAESTRO.md"
fi

echo ""
echo "✓ Smoke plataforma concluído"
