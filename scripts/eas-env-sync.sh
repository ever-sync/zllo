#!/usr/bin/env bash
# Sincroniza EXPO_PUBLIC_* do .env local para o EAS (development, preview, production).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado. Copie de .env.example e preencha."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

for env in development preview production; do
  for name in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_ALLOW_TEST_PAY; do
    value="${!name:-}"
    if [[ -z "$value" && "$name" != "EXPO_PUBLIC_ALLOW_TEST_PAY" ]]; then
      echo "Variável $name vazia no .env — pulando."
      continue
    fi
    eas env:create "$env" \
      --name "$name" \
      --value "$value" \
      --visibility plaintext \
      --non-interactive \
      --force >/dev/null
    echo "OK $env → $name"
  done
done

echo "Variáveis EXPO_PUBLIC_* sincronizadas no EAS."
