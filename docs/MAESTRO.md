# Smoke E2E mobile (Maestro)

Testes de UI no **development build** (Expo Go não cobre push nem todos os plugins).

## Pré-requisitos

1. Dev build instalado no simulador/device (`eas build:run -p ios --profile development`)
2. [Maestro CLI](https://maestro.mobile.dev/docs/getting-started/installing-maestro):

```bash
brew tap mobile-dev-inc/tap && brew install maestro
```

3. `.env` com Supabase apontando para o projeto com seed (`cliente@zllo.dev` / `assistencia@zllo.dev`, senha `senha123`)

## Executar

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

## CI

Maestro **não roda no GitHub Actions Linux** (precisa simulador macOS). Use localmente ou Maestro Cloud no futuro.
