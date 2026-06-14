# Build nativo (EAS)

Após mudanças de UX nativa (ex.: `expo-notifications`, splash, ícones), é necessário um **development build** ou build de preview — o Expo Go não cobre todos os plugins.

## Projeto EAS

- **Conta:** `@eversync/zllo`
- **Project ID:** `a123dc4e-4e8c-43a8-a048-04ab8914fc83`
- **Dashboard:** https://expo.dev/accounts/eversync/projects/zllo

O `app.json` já contém `extra.eas.projectId` (gerado por `eas init`).

## Pré-requisitos

1. CLI: `npm i -g eas-cli`
2. Login: `eas login`
3. `.env` local com Supabase (copie de `.env.example`)

## Variáveis de ambiente no EAS

Sincronize do `.env` local:

```bash
bash scripts/eas-env-sync.sh
```

Variáveis: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ALLOW_TEST_PAY`.

## Comandos

```bash
# Development client (simulador iOS + APK interno Android)
npm run eas:build:dev

# Preview interno (TestFlight / APK)
npm run eas:build:preview

# Produção (stores)
npm run eas:build:prod
```

Instalar no device:

```bash
eas build:run -p ios --profile development
eas build:run -p android --profile development
```

Ver status e próximos passos após um build:

```bash
npm run eas:post-build              # lista builds recentes
npm run eas:post-build -- <build-id>
```

## Smoke test pós-build

1. Login cliente e assistência
2. Tour cliente (3 passos) na home
3. Solicitar reparo + receber orçamento (push + centro de notificações)
4. **Notificações:** toque em push e card in-app → abre pedido/chat correto
5. Chat entre cliente e loja
6. Vitrine: listar, criar anúncio com foto, **tenho interesse** + contato
7. Loja: carrinho, checkout Pix
8. Assistência: produtos com foto, notificações (sino no header)
9. Push token registrado (`push_tokens` no Supabase)

Teste automatizado local/CI:

```bash
npm run test:notifications
npm run smoke:ci
```

## Notas

- Push remoto **não funciona** no Expo Go web nem sem dev client.
- Após `eas init`, faça commit de `app.json` com o `projectId`.
- Profiles em `eas.json`: `development`, `preview`, `production`.
