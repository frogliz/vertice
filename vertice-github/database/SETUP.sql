-- Vértice: execute uma vez no SQL Editor do Supabase.
-- Não altera tabelas nem políticas de outros aplicativos.
begin;

create table if not exists public.vertice_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint vertice_payload_object check (
    jsonb_typeof(payload) = 'object'
    and (payload ->> 'version') is not distinct from '1'
    and octet_length(payload::text) <= 5000000
  )
);

alter table public.vertice_states enable row level security;
alter table public.vertice_states force row level security;
revoke all on table public.vertice_states from public, anon;
grant select, insert, update on table public.vertice_states to authenticated;

drop policy if exists vertice_select_own on public.vertice_states;
create policy vertice_select_own on public.vertice_states for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists vertice_insert_own on public.vertice_states;
create policy vertice_insert_own on public.vertice_states for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists vertice_update_own on public.vertice_states;
create policy vertice_update_own on public.vertice_states for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- O compare-and-swap impede sobrescrita silenciosa entre dispositivos.
drop function if exists public.vertice_save_state(jsonb, integer);
create or replace function public.vertice_save_state(p_payload jsonb, p_expected_revision integer, p_owner uuid)
returns table (revision integer, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_revision integer;
  v_updated timestamptz;
begin
  if v_user is null or p_owner is distinct from v_user then
    raise exception 'VERTICE_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or (p_payload ->> 'version') is distinct from '1'
    or octet_length(p_payload::text) > 5000000 then
    raise exception 'VERTICE_INVALID_STATE' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    insert into public.vertice_states as target (user_id, payload, revision)
    values (v_user, p_payload, 1)
    on conflict (user_id) do nothing
    returning target.revision, target.updated_at into v_revision, v_updated;
    if not found then
      raise exception 'VERTICE_CONFLICT' using errcode = '40001';
    end if;
  else
    update public.vertice_states as target
      set payload = p_payload, revision = target.revision + 1, updated_at = clock_timestamp()
      where target.user_id = v_user and target.revision = p_expected_revision
      returning target.revision, target.updated_at into v_revision, v_updated;
    if not found then
      raise exception 'VERTICE_CONFLICT' using errcode = '40001';
    end if;
  end if;
  return query select v_revision, v_updated;
end;
$$;

revoke all on function public.vertice_save_state(jsonb, integer, uuid) from public, anon;
grant execute on function public.vertice_save_state(jsonb, integer, uuid) to authenticated;
comment on table public.vertice_states is 'Dados financeiros Vértice isolados por proprietário, com controle de revisão.';
commit;
