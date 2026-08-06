create function public.upsert_module_heartbeat(
  module_id text,
  module_name text,
  owner_user_id uuid,
  run_at timestamptz
)
returns table (id text, last_run_at timestamptz)
language sql
security definer
set search_path = public
as $$
  insert into public.modules (id, name, status, user_id, last_run_at)
  values (module_id, module_name, 'active', owner_user_id, run_at)
  on conflict (id) do update
    set last_run_at = excluded.last_run_at
  returning modules.id, modules.last_run_at;
$$;

revoke all on function public.upsert_module_heartbeat(text, text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.upsert_module_heartbeat(text, text, uuid, timestamptz)
  to service_role;
