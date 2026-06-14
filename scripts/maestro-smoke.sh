#!/usr/bin/env bash
# Smoke Maestro pós-build (simulador/device com dev client instalado).
# Requer: https://maestro.mobile.dev/docs/getting-started/installing-maestro
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v maestro >/dev/null 2>&1; then
  echo "⊘ Maestro não instalado — pule ou instale: https://maestro.mobile.dev"
  echo "  brew tap mobile-dev-inc/tap && brew install maestro"
  exit "${MAESTRO_REQUIRED:-0}"
fi

APP_ID="${MAESTRO_APP_ID:-com.eversync.zllo}"
export MAESTRO_APP_ID="$APP_ID"

echo "→ Maestro smoke (appId=$APP_ID)"
maestro test .maestro/flows

echo "✓ Maestro smoke passou"
