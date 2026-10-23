-- Teste transacional. Todos os usuários e registros sintéticos são revertidos.
begin;
create temporary table vertice_test_ids as select gen_random_uuid() as owner_id, gen_random_uuid() as other_id;
grant select on table vertice_test_ids to authenticated;
insert into auth.users (id) select owner_id from vertice_test_ids union all select other_id from vertice_test_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub', (select owner_id::text from vertice_test_ids), true);
select * from public.vertice_save_state('{"version":1,"test":"owner"}'::jsonb, 0, (select owner_id from vertice_test_ids));
do $$ begin
  if (select count(*) from public.vertice_states) <> 1 then raise exception 'RLS_OWNER_FAILED'; end if;
  begin
    perform public.vertice_save_state('{"version":1}'::jsonb, 0, (select owner_id from vertice_test_ids));
    raise exception 'CAS_CONFLICT_NOT_DETECTED';
  exception when serialization_failure then null;
  end;
  begin
    perform public.vertice_save_state('{"version":1}'::jsonb, 1, (select other_id from vertice_test_ids));
    raise exception 'OWNER_BINDING_FAILED';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.vertice_states set user_id=(select other_id from vertice_test_ids);
    raise exception 'OWNER_REASSIGNMENT_FAILED';
  exception when insufficient_privilege then null;
  end;
end $$;
select * from public.vertice_save_state('{"version":1,"test":"updated"}'::jsonb, 1, (select owner_id from vertice_test_ids));
select set_config('request.jwt.claim.sub', (select other_id::text from vertice_test_ids), true);
do $$ begin
  if (select count(*) from public.vertice_states) <> 0 then raise exception 'RLS_OTHER_USER_FAILED'; end if;
end $$;
select * from public.vertice_save_state('{"version":1,"test":"other"}'::jsonb, 0, (select other_id from vertice_test_ids));
do $$ begin
  if (select count(*) from public.vertice_states) <> 1 then raise exception 'RLS_ISOLATION_FAILED'; end if;
  if has_table_privilege('anon','public.vertice_states','SELECT') then raise exception 'ANONYMOUS_READ_FAILED'; end if;
  if has_function_privilege('anon','public.vertice_save_state(jsonb,integer,uuid)','EXECUTE') then raise exception 'ANONYMOUS_RPC_FAILED'; end if;
end $$;
select 'OK: isolamento por usuário, bloqueio anônimo, revisão atômica e troca de proprietário protegida' as validation;
rollback;
