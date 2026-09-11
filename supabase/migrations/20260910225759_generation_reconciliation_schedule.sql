create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function private.invoke_generation_reconcile()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_url text;
  job_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into project_url
    from vault.decrypted_secrets
   where name = 'studioflow_project_url';

  select decrypted_secret
    into job_secret
    from vault.decrypted_secrets
   where name = 'studioflow_generation_job_secret';

  if project_url is null or job_secret is null then
    return null;
  end if;

  project_url := btrim(project_url);
  if project_url !~ '^https://[a-z0-9]{20}\.supabase\.co$' or length(job_secret) < 32 then
    return null;
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/generation-reconcile',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-generation-job-secret', job_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.invoke_generation_reconcile() from public, anon, authenticated;

select cron.schedule(
  'studioflow-generation-reconcile',
  '* * * * *',
  'select private.invoke_generation_reconcile();'
);

select cron.alter_job(
  job_id := (
    select jobid
      from cron.job
     where jobname = 'studioflow-generation-reconcile'
  ),
  active := false
);

create or replace function public.set_generation_reconciliation_active(target_active boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id bigint;
begin
  select jobid
    into target_job_id
    from cron.job
   where jobname = 'studioflow-generation-reconcile';

  if target_job_id is null then
    return false;
  end if;

  perform cron.alter_job(job_id := target_job_id, active := target_active);
  return true;
end;
$$;

revoke all on function public.set_generation_reconciliation_active(boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.set_generation_reconciliation_active(boolean) to service_role;

create or replace function public.claim_generation_submission_with_reconcile(
  target_generation_id uuid,
  requested_claim_id uuid,
  target_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean;
begin
  claimed := public.claim_generation_submission(
    target_generation_id,
    requested_claim_id,
    target_owner_id
  );

  if claimed and not public.set_generation_reconciliation_active(true) then
    raise exception 'Generation reconciliation schedule is unavailable';
  end if;

  return claimed;
end;
$$;

revoke all on function public.claim_generation_submission_with_reconcile(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_generation_submission_with_reconcile(uuid, uuid, uuid)
  to service_role;

comment on function private.invoke_generation_reconcile() is
  'Vault-authenticated pg_cron invocation of the internal generation reconciler; returns without an HTTP call when configuration is absent or invalid.';
comment on function public.set_generation_reconciliation_active(boolean) is
  'Internal-only control for the on-demand generation reconciliation schedule.';
comment on function public.claim_generation_submission_with_reconcile(uuid, uuid, uuid) is
  'Atomically claims one managed generation and activates closed-browser reconciliation before commit.';
