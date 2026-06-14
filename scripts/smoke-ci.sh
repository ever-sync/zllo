#!/usr/bin/env bash
# Smoke rápido local/CI: lint mobile + lint/typecheck/build web.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Mobile lint"
npm run lint

echo "→ Web lint"
(cd web && npm run lint)

echo "→ Web typecheck"
(cd web && npx tsc --noEmit)

echo "→ Web build"
(
  cd web
  NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder \
  npm run build
)

echo "✓ Smoke CI passou"
