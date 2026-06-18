-- ============================================================================
-- FIX: enforce_shop_wallet_on_quote precisa ser SECURITY DEFINER.
--
-- O trigger BEFORE INSERT em public.quotes lê shops.asaas_wallet_id, coluna
-- escondida do papel `authenticated` pelo hardening (LGPD). Como a função era
-- SECURITY INVOKER, ao enviar um orçamento ela rodava como a loja autenticada e
-- falhava com "permission denied for table shops". Rodando como definer ela
-- enxerga a coluna sensível sem expô-la ao cliente.
-- ============================================================================

create or replace function private.enforce_shop_wallet_on_quote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.shops s
     where s.id = new.shop_id
       and nullif(trim(s.asaas_wallet_id), '') is not null
  ) then
    raise exception 'Configure a conta Asaas em Configurações antes de enviar orçamentos';
  end if;
  return new;
end;
$$;
