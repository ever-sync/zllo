#!/usr/bin/env bash
# Smoke Maestro pós-build (simulador/device com dev client instalado).
# Requer: https://maestro.mobile.dev/docs/getting-started/installing-maestro
set -euo pipefail
cd "$(dirname "$0")/.."

MAESTRO_BIN="${MAESTRO_BIN:-maestro}"
if ! command -v "$MAESTRO_BIN" >/dev/null 2>&1 && [[ -x /opt/homebrew/bin/maestro ]]; then
  MAESTRO_BIN=/opt/homebrew/bin/maestro
fi

if ! command -v "$MAESTRO_BIN" >/dev/null 2>&1; then
  echo "⊘ Maestro não instalado — pule ou instale:"
  echo "  brew tap mobile-dev-inc/tap && brew trust mobile-dev-inc/tap"
  echo "  brew install mobile-dev-inc/tap/maestro"
  echo "  brew link --overwrite mobile-dev-inc/tap/maestro   # se command not found"
  exit "${MAESTRO_REQUIRED:-0}"
fi

APP_ID="${MAESTRO_APP_ID:-com.eversync.zllo}"
export MAESTRO_APP_ID="$APP_ID"

if ! lsof -nP -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠ Metro não detectado na porta 8081."
  echo "  Em outro terminal: npx expo start"
  echo "  (development build EAS abre o Expo Dev Launcher sem Metro)"
  if [[ "${MAESTRO_REQUIRE_METRO:-1}" != "0" ]]; then
    exit 1
  fi
fi

echo "→ Maestro smoke (appId=$APP_ID)"
"$MAESTRO_BIN" test .maestro/flows

echo "✓ Maestro smoke passou"
