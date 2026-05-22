-- ============================================================================
-- zllo — Remove o sistema de moedas (não será usado no app)
-- A coluna shops.coins sai; o grant de SELECT por coluna do hardening que a
-- referenciava é ajustado automaticamente ao dropar a coluna.
-- ============================================================================

alter table public.shops drop column if exists coins;
