# Roadmap zllo — Fase 8

Status em jun/2026 após execução do plano de melhorias.

## 8A — Notificações e deep links ✅

- Migration `20260523160000_phase8_improvements.sql` (payloads corrigidos)
- `lib/notification-routes.ts` + `web/lib/notifications.ts` (todos os tipos)
- Tap em push (`components/push-navigation-handler.tsx`)
- Centro de notificações assistência (mobile + web)

## 8B — Auth e LGPD ✅

- Recuperação de senha (mobile + web cliente + web assistência)
- Cadastro web cliente (`/cliente/register`)
- Termos e privacidade (`/termos`, `/privacidade` + mobile)

## 8C — Vitrine P2P ✅

- RPC `express_listing_interest` + `get_listing_seller_contact`
- Botão "Tenho interesse" + contato (mobile + web)
- Editar anúncio (mobile + web)
- Chat in-app comprador ↔ vendedor (`listing_messages`, migration `20260524140000_listing_chat.sql`)

## 8D — Paridade web cliente ✅

- Pedidos: compras + links OS/solicitações
- Home: cards clicáveis + empty com CTA

## 8E — Assistência mobile ✅

- Produtos: editar, excluir, descrição
- Ranking regional navega para solicitar (mobile)

## 8F — Testes ✅

- `scripts/test-notification-href.mjs`

## Pendências (backlog)

- Configurar secrets `EXPO_TOKEN`, `MAESTRO_API_KEY`, `MAESTRO_PROJECT_ID` no GitHub para ativar Maestro Cloud
- Maestro flows `05`/`06` marketplace Uber (checkout + despacho)

## Fase 8C — Maestro E2E ✅

- Flows `.maestro/flows/` (welcome, login cliente/loja, auth links)
- `npm run maestro:smoke` + `docs/MAESTRO.md`
- Maestro Cloud CI: `.github/workflows/maestro-cloud.yml` + `scripts/maestro-cloud-prepare.sh`
- Integrado em `platform-smoke.sh` e `eas-post-build.sh`

## Fase 8B — concluído ✅

- Badge de notificações no top bar + sidebar assistência web
- Sino de notificações no ShopHeader mobile
- Fotos de produto no mobile assistência
- Empty states web shop + admin
- `test:notifications` no smoke CI e GitHub Actions
