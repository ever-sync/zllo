#!/usr/bin/env bash
# Baixa o último build EAS concluído e prepara o binário para Maestro Cloud.
# Uso: bash scripts/maestro-cloud-prepare.sh [ios|android] [profile]
set -euo pipefail
cd "$(dirname "$0")/.."

PLATFORM="${1:-ios}"
PROFILE="${2:-development}"
OUT_DIR="${MAESTRO_PREPARE_DIR:-/tmp/maestro-cloud}"

if ! command -v eas >/dev/null 2>&1; then
  echo "EAS CLI não encontrado. Instale: npm i -g eas-cli" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "→ Buscando build EAS ($PLATFORM / $PROFILE)…"
BUILD_JSON="$(eas build:list \
  --platform "$PLATFORM" \
  --build-profile "$PROFILE" \
  --status finished \
  --limit 1 \
  --json \
  --non-interactive)"

BUILD_URL="$(node -e "
const rows = JSON.parse(process.argv[1]);
const b = rows[0];
if (!b?.artifacts?.buildUrl) {
  console.error('Nenhum build FINISHED encontrado. Rode: npm run eas:build:dev');
  process.exit(1);
}
console.log(b.artifacts.buildUrl);
" "$BUILD_JSON")"

if [[ "$PLATFORM" == "ios" ]]; then
  ARCHIVE="$OUT_DIR/ios-build.tar.gz"
  curl -fsSL -o "$ARCHIVE" "$BUILD_URL"
  EXTRACT="$OUT_DIR/extracted"
  rm -rf "$EXTRACT"
  mkdir -p "$EXTRACT"
  tar -xzf "$ARCHIVE" -C "$EXTRACT"
  APP_PATH="$(find "$EXTRACT" -name '*.app' -type d | head -1)"
  if [[ -z "$APP_PATH" ]]; then
    echo "Não foi possível localizar .app no artefato iOS." >&2
    exit 1
  fi
  ZIP="$OUT_DIR/maestro-ios.zip"
  rm -f "$ZIP"
  (cd "$(dirname "$APP_PATH")" && zip -qr "$ZIP" "$(basename "$APP_PATH")")
  echo "$ZIP"
else
  APK="$OUT_DIR/maestro-android.apk"
  curl -fsSL -o "$APK" "$BUILD_URL"
  echo "$APK"
fi
