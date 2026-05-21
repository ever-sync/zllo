-- ============================================================================
-- zllo — Endereço estruturado + consentimento LGPD no perfil do cliente
-- - Endereço é PII: as colunas NÃO entram no grant de SELECT por coluna criado
--   no hardening, então só o dono lê (via get_my_profile, security definer).
--   O endereço compartilhado com a loja continua sendo o de cada solicitação
--   (repair_requests.address), copiado na hora do pedido.
-- - Consentimento LGPD: data + versão do termo aceito no cadastro.
-- Obs.: a geolocalização do endereço (geography) entra numa migration futura,
-- junto do geocoding e do uso no fluxo de solicitação.
-- ============================================================================

alter table public.profiles
  add column if not exists cep              text,
  add column if not exists street           text,
  add column if not exists number           text,
  add column if not exists complement       text,
  add column if not exists neighborhood     text,
  add column if not exists city             text,
  add column if not exists uf               text,
  add column if not exists lgpd_accepted_at timestamptz,
  add column if not exists lgpd_version     text;

-- handle_new_user agora também grava endereço e consentimento vindos do signup.
-- (Os campos de endereço/LGPD são auto-reportados pelo próprio usuário no
--  cadastro — não são usados para autorização, apenas persistência de PII.)
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (
    id, role, full_name, cpf, phone, email,
    cep, street, number, complement, neighborhood, city, uf,
    lgpd_accepted_at, lgpd_version
  )
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'cliente'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    new.email,
    new.raw_user_meta_data->>'cep',
    new.raw_user_meta_data->>'street',
    new.raw_user_meta_data->>'number',
    new.raw_user_meta_data->>'complement',
    new.raw_user_meta_data->>'neighborhood',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'uf',
    case when (new.raw_user_meta_data->>'lgpd_accepted') = 'true' then now() end,
    new.raw_user_meta_data->>'lgpd_version'
  );
  return new;
end;
$$;
