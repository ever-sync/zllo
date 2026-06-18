-- ============================================================================
-- Maestro E2E — fixtures marketplace (cliente + pickup Reparo Smart)
-- ============================================================================

update public.profiles
set
  street = 'Av. Paulista',
  number = '1578',
  neighborhood = 'Bela Vista',
  city = 'São Paulo',
  uf = 'SP',
  cep = '01310100',
  phone = coalesce(nullif(trim(phone), ''), '11999990000')
where id = '44444444-4444-4444-4444-444444444444'::uuid;

update public.shops
set
  pickup_phone = coalesce(nullif(trim(pickup_phone), ''), '11988887777'),
  pickup_street = coalesce(nullif(trim(pickup_street), ''), 'Av. Paulista'),
  pickup_number = coalesce(nullif(trim(pickup_number), ''), '1000'),
  pickup_city = coalesce(nullif(trim(pickup_city), ''), 'São Paulo'),
  pickup_uf = coalesce(nullif(trim(pickup_uf), ''), 'SP'),
  pickup_cep = coalesce(nullif(trim(pickup_cep), ''), '01310100')
where name = 'Reparo Smart';
