-- ============================================================================
-- zllo — Push de disputas
--   - aberta → avisa a contraparte (quem não abriu) + os admins
--   - resolvida/recusada → avisa cliente e loja com o desfecho
-- Reaproveita private.send_push (fail-safe).
-- ============================================================================

create or replace function private.notify_dispute_opened()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner     uuid;
  v_recipient uuid;
  v_admin     uuid;
begin
  select owner_id into v_owner from public.shops where id = new.shop_id;

  -- contraparte = quem NÃO abriu a disputa
  v_recipient := case when new.opened_by = new.client_id then v_owner else new.client_id end;
  if v_recipient is not null and v_recipient <> new.opened_by then
    perform private.send_push(
      v_recipient, 'Disputa aberta',
      'Há uma disputa sobre um pedido. Acompanhe pelo app.',
      jsonb_build_object('type', 'dispute', 'dispute_id', new.id));
  end if;

  -- admins (mediadores) que tiverem app/token
  for v_admin in select user_id from public.admins loop
    perform private.send_push(
      v_admin, 'Nova disputa 🛡️',
      'Uma disputa foi aberta e precisa de mediação.',
      jsonb_build_object('type', 'dispute', 'dispute_id', new.id));
  end loop;

  return new;
end $$;

create trigger trg_notify_dispute_opened after insert on public.disputes
  for each row execute function private.notify_dispute_opened();

create or replace function private.notify_dispute_resolved()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_label text;
begin
  if new.status is distinct from old.status and new.status in ('resolvida', 'recusada') then
    v_label := case new.status
      when 'resolvida' then 'Sua disputa foi resolvida'
      else 'Sua disputa foi recusada' end;
    select owner_id into v_owner from public.shops where id = new.shop_id;

    perform private.send_push(
      new.client_id, v_label,
      coalesce(new.resolution, 'Veja os detalhes no app.'),
      jsonb_build_object('type', 'dispute', 'dispute_id', new.id));

    if v_owner is not null then
      perform private.send_push(
        v_owner, 'Disputa atualizada', v_label,
        jsonb_build_object('type', 'dispute', 'dispute_id', new.id));
    end if;
  end if;
  return new;
end $$;

create trigger trg_notify_dispute_resolved after update on public.disputes
  for each row execute function private.notify_dispute_resolved();
