create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_owners
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_app_owner() from public, anon, authenticated, service_role;
grant execute on function private.is_app_owner() to authenticated, service_role;

create or replace function public.current_user_is_app_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_app_owner();
$$;

revoke all on function public.current_user_is_app_owner() from public, anon, authenticated, service_role;
grant execute on function public.current_user_is_app_owner() to authenticated, service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'series', 'episodes', 'script_versions', 'scenes', 'shots', 'entities', 'assets',
    'asset_links', 'upload_sessions', 'prompt_versions', 'generation_records', 'time_entries',
    'cost_entries', 'publications', 'captures', 'backup_runs', 'error_events'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_access', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = (select auth.uid()) and (select private.is_app_owner())) with check (owner_id = (select auth.uid()) and (select private.is_app_owner()))',
      table_name || '_owner_access', table_name
    );
  end loop;
end $$;

drop function public.is_app_owner(uuid);

comment on function private.is_app_owner() is 'Private RLS helper that verifies the authenticated caller against the singleton StudioFlow owner allowlist.';
comment on function public.current_user_is_app_owner() is 'Safe authenticated self-check used by the StudioFlow sign-in gate.';
