# Smoke E2E mobile (Maestro)

Testes de UI no **development build** (Expo Go não cobre push nem todos os plugins).

## Pré-requisitos

1. Dev build instalado no simulador/device (`eas build:run -p ios --profile development`)
2. [Maestro CLI](https://maestro.mobile.dev/docs/getting-started/installing-maestro):

```bash
brew tap mobile-dev-inc/tap && brew install maestro
```

3. `.env` com Supabase apontando para o projeto com seed (`cliente@zllo.dev` / `assistencia@zllo.dev`, senha `senha123`)

## Executar (local)

```bash
# Todos os flows
npm run maestro:smoke

# Um flow
maestro test .maestro/flows/01-welcome.yaml

# Android (package id)
MAESTRO_APP_ID=com.eversync.zllo npm run maestro:smoke
```

## Flows

| Arquivo | O que valida |
|---------|----------------|
| `01-welcome.yaml` | Tela inicial + navegação para login |
| `02-login-cliente.yaml` | Login cliente → tabs (Início) |
| `03-login-assistencia.yaml` | Login loja → painel Orçamentos |
| `04-auth-links.yaml` | Esqueci senha + link criar conta |
| `05-marketplace-checkout-uber.yaml` | Cliente: loja → checkout entrega → cotação Uber → pedido |
| `06-marketplace-dispatch-uber.yaml` | E2E completo: pagamento teste + loja chama Uber |

## Pré-requisitos (flows 05–06)

1. Seed/migration com produto **Película 3D iPhone 13** (loja Reparo Smart) e endereço do `cliente@zllo.dev`
2. Supabase com **`UBER_DIRECT_MOCK=1`** nas Edge Functions (cotação/despacho simulados)
3. Dev build com **`EXPO_PUBLIC_ALLOW_TEST_PAY=true`** (flow 06 — botão “Pagar (teste)”)
4. Login da loja do marketplace: `loja1@zllo.dev` / `senha123` (`MARKETPLACE_SHOP_EMAIL` no config)

```bash
# Só checkout Uber
maestro test .maestro/flows/05-marketplace-checkout-uber.yaml

# E2E completo (mais lento)
maestro test .maestro/flows/06-marketplace-dispatch-uber.yaml
```

## Pós-build EAS

```bash
eas build:run -p ios --profile development
npm run maestro:smoke
```

Ou após CI:

```bash
npm run eas:post-build -- <build-id>
npm run maestro:smoke
```

## Variáveis

Definidas em `.maestro/config.yaml` (override via env Maestro):

- `CLIENT_EMAIL` / `CLIENT_PASSWORD`
- `SHOP_EMAIL` / `SHOP_PASSWORD`

## Maestro Cloud (CI)

Workflow: [`.github/workflows/maestro-cloud.yml`](../.github/workflows/maestro-cloud.yml)

Roda no **Maestro Cloud** (simuladores na nuvem) — não precisa runner macOS no GitHub.

### Secrets do repositório

| Secret | Onde obter |
|--------|------------|
| `EXPO_TOKEN` | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) |
| `MAESTRO_API_KEY` | Maestro Cloud → Settings → API Keys |
| `MAESTRO_PROJECT_ID` | Maestro Cloud → Settings → Project ID |

### Quando roda

- **Manual:** Actions → *Maestro Cloud* → Run workflow (escolha `ios` ou `android`)
- **Semanal:** segunda 10:00 UTC
- **Push:** alterações em `.maestro/**`

### Pré-requisito

Precisa existir um build EAS **FINISHED** com profile `development`:

```bash
npm run eas:build:dev
```

O workflow baixa o artefato mais recente via `scripts/maestro-cloud-prepare.sh`.

### Testar preparação localmente

```bash
eas login
npm run maestro:cloud:prepare -- ios
# imprime caminho do .zip (iOS) ou .apk (Android)
```

### CI Linux (lint only)

O workflow [`ci.yml`](../.github/workflows/ci.yml) continua no Ubuntu (lint + build web). E2E mobile fica no Maestro Cloud.
