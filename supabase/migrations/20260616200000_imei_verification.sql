-- ============================================================================
-- zllo — IMEI obrigatório no cadastro de aparelho + verificação (anti-roubo)
--
-- A coluna devices.imei já existia (sensível, escondida das contrapartes).
-- Aqui adicionamos o status de verificação e a validação por número:
--   * formato: 15 dígitos + dígito verificador (Luhn);
--   * checagem de roubo: SIMULADA por enquanto (sem provedor externo ainda).
--     IMEIs começando com 9999 são tratados como roubados ('recusado').
-- O bloqueio de reparo/venda NÃO é aplicado aqui (decisão do produto) — o
-- status é apenas informativo. Para plugar uma API real depois, troque o corpo
-- de private.check_imei_theft por uma chamada (ex.: pg_net) e mova para 'pendente'
-- + atualização assíncrona.
-- ============================================================================

do $$ begin
  create type public.device_verification as enum ('pendente', 'aprovado', 'recusado');
exception when duplicate_object then null;
end $$;

alter table public.devices
  add column if not exists verification_status public.device_verification not null default 'pendente',
  add column if not exists verification_note   text,
  add column if not exists verified_at         timestamptz;

-- A contraparte já não lê imei (hardening). Liberamos só o status/observação
-- para o dono poder ver o selo de verificação no app/web.
grant select (verification_status, verification_note, verified_at)
  on public.devices to authenticated;

-- ---------- Validação de formato (15 dígitos + Luhn) ----------
create or replace function private.imei_is_valid(p_imei text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  d   text := regexp_replace(coalesce(p_imei, ''), '\D', '', 'g');
  sum int  := 0;
  n   int;
  i   int;
  dbl boolean := false;
begin
  if length(d) <> 15 then
    return false;
  end if;
  -- Luhn: da direita para a esquerda, dobra cada segundo dígito.
  for i in reverse 15..1 loop
    n := substr(d, i, 1)::int;
    if dbl then
      n := n * 2;
      if n > 9 then n := n - 9; end if;
    end if;
    sum := sum + n;
    dbl := not dbl;
  end loop;
  return sum % 10 = 0;
end $$;

-- ---------- Checagem de roubo (SIMULADA) ----------
-- Retorna true quando o IMEI é considerado roubado/bloqueado.
-- TODO: substituir pela consulta ao provedor externo de IMEI.
create or replace function private.check_imei_theft(p_imei text)
returns boolean language sql immutable set search_path = '' as $$
  select left(regexp_replace(coalesce(p_imei, ''), '\D', '', 'g'), 4) = '9999';
$$;

-- ---------- Trigger: valida e define o status no insert/update do IMEI ----------
create or replace function private.verify_device_imei()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  d text := regexp_replace(coalesce(new.imei, ''), '\D', '', 'g');
begin
  if d = '' then
    raise exception 'Informe o IMEI do aparelho';
  end if;
  if not private.imei_is_valid(d) then
    raise exception 'IMEI inválido — confira os 15 dígitos';
  end if;

  new.imei := d;

  if private.check_imei_theft(d) then
    new.verification_status := 'recusado';
    new.verification_note   := 'IMEI consta como roubado/bloqueado';
  else
    new.verification_status := 'aprovado';
    new.verification_note   := null;
  end if;
  new.verified_at := now();

  return new;
end $$;

drop trigger if exists trg_verify_device_imei on public.devices;
create trigger trg_verify_device_imei
  before insert or update of imei on public.devices
  for each row execute function private.verify_device_imei();
