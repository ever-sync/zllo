# Build nativo (EAS) — issue #12

Após mudanças de UX nativa (ex.: `expo-notifications`, splash, ícones), é necessário um **development build** ou build de preview — o Expo Go não cobre todos os plugins.

## Pré-requisitos

1. Conta Expo: https://expo.dev
2. CLI: `npm i -g eas-cli`
3. Login: `eas login`
4. Vincular projeto (gera `projectId` em `app.json`):

```bash
eas init
```

Confirme que `app.json` contém:

```json
"extra": {
  "eas": {
    "projectId": "<uuid>"
  }
}
```

Sem `projectId`, o registro de push em `lib/push.ts` não funciona.

## Variáveis de ambiente

Configure no EAS (secrets) ou `.env` local para builds:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

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

## Smoke test pós-build

1. Login cliente e assistência
2. Tour cliente (3 passos) na home
3. Solicitar reparo + receber orçamento (push + centro de notificações)
4. Chat entre cliente e loja
5. Vitrine: listar, criar anúncio com foto, abrir detalhe
6. Loja: carrinho, checkout Pix
7. Push token registrado (`push_tokens` no Supabase)

## Notas

- Push remoto **não funciona** no Expo Go web nem sem dev client.
- Após `eas init`, faça commit de `app.json` com o `projectId`.
- Profiles em `eas.json`: `development`, `preview`, `production`.
