-- ============================================================================
-- zllo — Pagamento de teste desligado por padrão em produção
-- O seed local liga explicitamente (allow_test_payments = true).
-- Esta migration só insere a linha padrão se ainda não existir.
-- ============================================================================

insert into public.app_config (id, allow_test_payments)
values (1, false)
on conflict (id) do nothing;
