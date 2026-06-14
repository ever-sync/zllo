#!/usr/bin/env bash
# Pós-build EAS: status + próximos passos (smoke manual).
set -euo pipefail
cd "$(dirname "$0")/.."

BUILD_ID="${1:-}"
if [[ -z "$BUILD_ID" ]]; then
  echo "Builds recentes:"
  eas build:list --limit 5 --non-interactive
  echo ""
  echo "Uso: bash scripts/eas-post-build.sh <build-id>"
  exit 0
fi

eas build:view "$BUILD_ID" --json | node -e "
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const j = JSON.parse(Buffer.concat(chunks).toString());
  console.log('Status:', j.status);
  console.log('Platform:', j.platform);
  console.log('Profile:', j.buildProfile);
  if (j.artifacts?.buildUrl) console.log('Artifact:', j.artifacts.buildUrl);
  if (j.status === 'FINISHED') {
    console.log('');
    console.log('Smoke test (docs/EAS_BUILD.md + docs/MAESTRO.md):');
    console.log('  1. eas build:run -p', j.platform?.toLowerCase(), '--profile', j.buildProfile);
    console.log('  2. npm run maestro:smoke');
    console.log('  3. Login cliente + assistência (flows 02/03)');
    console.log('  4. Push token em push_tokens (Supabase)');
    console.log('  5. Solicitar reparo → orçamento → Pix (manual ou repair-e2e)');
  }
});
"
