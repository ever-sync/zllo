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

## 8D — Paridade web cliente ✅

- Pedidos: compras + links OS/solicitações
- Home: cards clicáveis + empty com CTA

## 8E — Assistência mobile ✅

- Produtos: editar, excluir, descrição
- Ranking regional navega para solicitar (mobile)

## 8F — Testes ✅

- `scripts/test-notification-href.mjs`

## Pendências (backlog)

- E2E automatizado pós-build EAS (Maestro/Detox)
- Chat P2P vitrine (hoje: interesse + telefone)

## Fase 8B — concluído ✅

- Badge de notificações no top bar + sidebar assistência web
- Sino de notificações no ShopHeader mobile
- Fotos de produto no mobile assistência
- Empty states web shop + admin
- `test:notifications` no smoke CI e GitHub Actions
