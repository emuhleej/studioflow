alter table public.generation_records
  add column execution_mode text not null default 'manual',
  add column media_kind text,
  add column operational_status text not null default 'recorded',
  add column client_request_id uuid,
  add column provider_job_id text,
  add column api_version text,
  add column model_version text,
  add column request_settings jsonb not null default '{}'::jsonb,
  add column estimated_cost_micros bigint not null default 0,
  add column calculated_cost_micros bigint,
  add column provider_reported_cost_micros bigint,
  add column reserved_max_cost_micros bigint not null default 0,
  add column pricing_snapshot jsonb not null default '{}'::jsonb,
  add column provider_credit_units numeric(14,4),
  add column estimated_output_bytes bigint not null default 0,
  add column reserved_output_bytes bigint not null default 0,
  add column submitted_at timestamptz,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column next_poll_at timestamptz,
  add column poll_attempts integer not null default 0,
  add column ingest_attempts integer not null default 0,
  add column failure_code text,
  add column failure_message text,
  add column submission_claim_id uuid,
  add column submission_claim_expires_at timestamptz,
  add column provider_submission_started_at timestamptz,
  add constraint generation_records_execution_mode_check
    check (execution_mode in ('manual', 'managed')),
  add constraint generation_records_media_kind_check
    check (media_kind is null or media_kind in ('image', 'video')),
  add constraint generation_records_operational_status_check
    check (operational_status in (
      'recorded', 'draft', 'submitting', 'queued', 'running', 'saving', 'completed',
      'failed', 'cancel_requested', 'cancelled', 'submission_unknown'
    )),
  add constraint generation_records_request_settings_object_check
    check (jsonb_typeof(request_settings) = 'object'),
  add constraint generation_records_pricing_snapshot_object_check
    check (jsonb_typeof(pricing_snapshot) = 'object'),
  add constraint generation_records_cost_micros_check
    check (
      estimated_cost_micros >= 0
      and (calculated_cost_micros is null or calculated_cost_micros >= 0)
      and (provider_reported_cost_micros is null or provider_reported_cost_micros >= 0)
      and reserved_max_cost_micros >= 0
      and (provider_credit_units is null or provider_credit_units >= 0)
    ),
  add constraint generation_records_output_bytes_check
    check (
      estimated_output_bytes >= 0 and estimated_output_bytes <= 250000000
      and reserved_output_bytes >= 0 and reserved_output_bytes <= 250000000
    ),
  add constraint generation_records_attempts_check
    check (poll_attempts >= 0 and ingest_attempts >= 0),
  add constraint generation_records_failure_message_check
    check (failure_message is null or char_length(failure_message) between 1 and 1000),
  add constraint generation_records_execution_shape_check
    check (
      (
        execution_mode = 'manual'
        and operational_status = 'recorded'
        and media_kind is null
        and client_request_id is null
        and reserved_max_cost_micros = 0
        and reserved_output_bytes = 0
      )
      or
      (
        execution_mode = 'managed'
        and media_kind is not null
        and client_request_id is not null
        and prompt_version_id is not null
      )
    );

alter table public.cost_entries
  add column source_generation_id uuid references public.generation_records(id) on delete restrict;

alter table public.assets
  add column source_generation_id uuid references public.generation_records(id) on delete restrict;

create table public.generation_input_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid not null references public.generation_records(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  role text not null check (role in ('reference_image', 'start_image')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  unique (generation_id, asset_id, role)
);

create table public.generation_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid not null references public.generation_records(id) on delete cascade,
  event_type text not null check (char_length(btrim(event_type)) between 1 and 80),
  from_status text,
  to_status text,
  message text not null default '' check (char_length(message) <= 500),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  constraint generation_events_from_status_check check (
    from_status is null or from_status in (
      'recorded', 'draft', 'submitting', 'queued', 'running', 'saving', 'completed',
      'failed', 'cancel_requested', 'cancelled', 'submission_unknown'
    )
  ),
  constraint generation_events_to_status_check check (
    to_status is null or to_status in (
      'recorded', 'draft', 'submitting', 'queued', 'running', 'saving', 'completed',
      'failed', 'cancel_requested', 'cancelled', 'submission_unknown'
    )
  )
);

create table public.generation_budget_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  generation_enabled boolean not null default false,
  max_image_request_micros bigint not null default 100000,
  max_video_request_micros bigint not null default 300000,
  daily_limit_micros bigint not null default 2000000,
  monthly_limit_micros bigint not null default 10000000,
  generated_output_limit_bytes bigint not null default 250000000,
  reference_image_limit_bytes bigint not null default 16000000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  constraint generation_budget_limits_check check (
    max_image_request_micros between 0 and 100000
    and max_video_request_micros between 0 and 300000
    and daily_limit_micros between 0 and 2000000
    and monthly_limit_micros between 0 and 10000000
    and daily_limit_micros <= monthly_limit_micros
    and generated_output_limit_bytes between 1 and 250000000
    and reference_image_limit_bytes between 1 and 16000000
  )
);

insert into public.generation_budget_settings (owner_id)
select user_id from public.app_owners
on conflict (owner_id) do nothing;

create unique index generation_records_owner_client_request_idx
  on public.generation_records(owner_id, client_request_id)
  where client_request_id is not null;

create unique index generation_records_one_active_job_idx
  on public.generation_records(owner_id)
  where execution_mode = 'managed'
    and operational_status in (
      'submitting', 'queued', 'running', 'saving', 'cancel_requested', 'submission_unknown'
    );

create index generation_records_owner_due_poll_idx
  on public.generation_records(owner_id, next_poll_at)
  where execution_mode = 'managed'
    and operational_status in ('queued', 'running', 'saving', 'cancel_requested');

create index generation_input_assets_owner_generation_idx
  on public.generation_input_assets(owner_id, generation_id, position);
create index generation_input_assets_asset_id_idx
  on public.generation_input_assets(asset_id);
create index generation_events_owner_generation_created_idx
  on public.generation_events(owner_id, generation_id, created_at);
create unique index cost_entries_source_generation_idx
  on public.cost_entries(source_generation_id)
  where source_generation_id is not null;
create unique index assets_source_generation_idx
  on public.assets(source_generation_id)
  where source_generation_id is not null;

create or replace function public.protect_managed_generation_control_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' and new.execution_mode = 'managed' then
    if new.operational_status <> 'draft'
      or new.provider_job_id is not null
      or new.calculated_cost_micros is not null
      or new.reserved_max_cost_micros <> 0
      or new.reserved_output_bytes <> 0
      or new.submission_claim_id is not null
      or new.provider_submission_started_at is not null then
      raise exception 'Browser clients may only prepare inert managed generation drafts';
    end if;
  elsif tg_op = 'UPDATE' and old.execution_mode = 'managed' then
    if new.owner_id is distinct from old.owner_id
      or new.episode_id is distinct from old.episode_id
      or new.shot_id is distinct from old.shot_id
      or new.prompt_version_id is distinct from old.prompt_version_id
      or new.execution_mode is distinct from old.execution_mode
      or new.media_kind is distinct from old.media_kind
      or new.operational_status is distinct from old.operational_status
      or new.client_request_id is distinct from old.client_request_id
      or new.provider is distinct from old.provider
      or new.model is distinct from old.model
      or new.provider_job_id is distinct from old.provider_job_id
      or new.api_version is distinct from old.api_version
      or new.model_version is distinct from old.model_version
      or new.request_settings is distinct from old.request_settings
      or new.estimated_cost_micros is distinct from old.estimated_cost_micros
      or new.calculated_cost_micros is distinct from old.calculated_cost_micros
      or new.provider_reported_cost_micros is distinct from old.provider_reported_cost_micros
      or new.reserved_max_cost_micros is distinct from old.reserved_max_cost_micros
      or new.pricing_snapshot is distinct from old.pricing_snapshot
      or new.provider_credit_units is distinct from old.provider_credit_units
      or new.estimated_output_bytes is distinct from old.estimated_output_bytes
      or new.reserved_output_bytes is distinct from old.reserved_output_bytes
      or new.submitted_at is distinct from old.submitted_at
      or new.started_at is distinct from old.started_at
      or new.completed_at is distinct from old.completed_at
      or new.next_poll_at is distinct from old.next_poll_at
      or new.poll_attempts is distinct from old.poll_attempts
      or new.ingest_attempts is distinct from old.ingest_attempts
      or new.failure_code is distinct from old.failure_code
      or new.failure_message is distinct from old.failure_message
      or new.submission_claim_id is distinct from old.submission_claim_id
      or new.submission_claim_expires_at is distinct from old.submission_claim_expires_at
      or new.provider_submission_started_at is distinct from old.provider_submission_started_at
      or new.cost_cents is distinct from old.cost_cents
      or new.duration_seconds is distinct from old.duration_seconds
      or new.asset_ids is distinct from old.asset_ids then
      raise exception 'Managed generation control fields are server-owned';
    end if;
  end if;

  return new;
end;
$$;

create trigger generation_records_protect_managed_controls
before insert or update on public.generation_records
for each row execute function public.protect_managed_generation_control_fields();

create or replace function public.validate_managed_generation_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.execution_mode = 'managed' then
    if new.operational_status = 'completed' and not exists (
      select 1
      from public.assets
      where assets.owner_id = new.owner_id
        and assets.source = 'generation'
        and assets.bytes > 0
        and (
          assets.id = any(new.asset_ids)
          or exists (
            select 1
            from public.asset_links
            where asset_links.owner_id = new.owner_id
              and asset_links.asset_id = assets.id
              and asset_links.target_type = 'generation'
              and asset_links.target_id = new.id
          )
        )
    ) then
      raise exception 'Managed completion requires a linked generated asset';
    end if;

    if new.operational_status in ('queued', 'running', 'saving', 'completed', 'cancel_requested')
      and new.provider_job_id is null then
      raise exception 'Managed provider work requires a provider job ID';
    end if;

    if new.operational_status = 'completed' and new.calculated_cost_micros is null then
      raise exception 'Managed completion requires a calculated cost';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.operational_status is distinct from new.operational_status then
    if not (
      (old.operational_status = 'draft' and new.operational_status in ('submitting', 'cancelled'))
      or (old.operational_status = 'submitting' and new.operational_status in ('draft', 'queued', 'failed', 'submission_unknown', 'cancel_requested'))
      or (old.operational_status = 'queued' and new.operational_status in ('running', 'saving', 'failed', 'cancel_requested', 'cancelled', 'submission_unknown'))
      or (old.operational_status = 'running' and new.operational_status in ('saving', 'failed', 'cancel_requested', 'cancelled', 'submission_unknown'))
      or (old.operational_status = 'saving' and new.operational_status in ('completed', 'failed', 'cancel_requested'))
      or (old.operational_status = 'cancel_requested' and new.operational_status in ('running', 'failed', 'cancelled', 'submission_unknown'))
      or (old.operational_status = 'submission_unknown' and new.operational_status in ('failed', 'cancelled'))
    ) then
      raise exception 'Invalid generation lifecycle transition from % to %', old.operational_status, new.operational_status;
    end if;
  end if;

  return new;
end;
$$;

create trigger generation_records_validate_managed
before insert or update on public.generation_records
for each row execute function public.validate_managed_generation_record();

create or replace function public.validate_generation_input_asset()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  generation_project_id uuid;
  generation_media_kind text;
  generation_status text;
begin
  select series.project_id, generation_records.media_kind, generation_records.operational_status
  into generation_project_id, generation_media_kind, generation_status
  from public.generation_records
  join public.episodes
    on episodes.id = generation_records.episode_id
    and episodes.owner_id = generation_records.owner_id
  join public.series
    on series.id = episodes.series_id
    and series.owner_id = generation_records.owner_id
  where generation_records.id = new.generation_id
    and generation_records.owner_id = new.owner_id
    and generation_records.execution_mode = 'managed';

  if not found then
    raise exception 'Generation input must reference a managed generation owned by the same workspace';
  end if;

  if generation_status <> 'draft' then
    raise exception 'Generation inputs are immutable after submission begins';
  end if;

  if not exists (
    select 1
    from public.assets
    where id = new.asset_id
      and owner_id = new.owner_id
      and project_id = generation_project_id
      and kind = 'image'
      and bytes between 1 and 16000000
      and deleted_at is null
  ) then
    raise exception 'Generation reference must be an active image from the same project and no larger than 16 MB';
  end if;

  if new.role = 'start_image' and generation_media_kind <> 'video' then
    raise exception 'A start image can only be used for video generation';
  end if;

  return new;
end;
$$;

create trigger generation_input_assets_validate
before insert or update of owner_id, generation_id, asset_id, role
on public.generation_input_assets
for each row execute function public.validate_generation_input_asset();

create or replace function public.prevent_generation_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'StudioFlow generation events are append-only';
end;
$$;

create trigger generation_events_are_immutable
before update or delete on public.generation_events
for each row execute function public.prevent_generation_event_mutation();

create or replace function public.record_generation_status_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.execution_mode = 'managed'
    and (tg_op = 'INSERT' or old.operational_status is distinct from new.operational_status) then
    insert into public.generation_events (
      owner_id, generation_id, event_type, from_status, to_status, message
    ) values (
      new.owner_id,
      new.id,
      case when tg_op = 'INSERT' then 'prepared' else 'status_changed' end,
      case when tg_op = 'INSERT' then null else old.operational_status end,
      new.operational_status,
      case when tg_op = 'INSERT' then 'Managed generation prepared.' else 'Generation status changed.' end
    );
  end if;
  return new;
end;
$$;

create trigger generation_records_record_status_event
after insert or update of operational_status on public.generation_records
for each row execute function public.record_generation_status_event();

create or replace function public.validate_generation_cost_entry()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  generation_media_kind text;
begin
  if new.source_generation_id is null then
    return new;
  end if;

  select media_kind into generation_media_kind
  from public.generation_records
  where id = new.source_generation_id
    and owner_id = new.owner_id
    and episode_id = new.episode_id
    and execution_mode = 'managed';

  if not found then
    raise exception 'Generation-linked cost must share owner and episode context with a managed generation';
  end if;

  if new.category::text <> generation_media_kind then
    raise exception 'Generation-linked cost category must match the generation media kind';
  end if;

  return new;
end;
$$;

create trigger cost_entries_validate_generation
before insert or update of owner_id, episode_id, category, source_generation_id
on public.cost_entries
for each row execute function public.validate_generation_cost_entry();

create or replace function public.claim_generation_submission(
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
  target public.generation_records%rowtype;
  settings public.generation_budget_settings%rowtype;
  daily_exposure bigint;
  monthly_exposure bigint;
  storage_exposure bigint;
  request_limit bigint;
begin
  if not exists (select 1 from public.app_owners where user_id = target_owner_id) then
    raise exception 'Configured StudioFlow owner not found';
  end if;

  select * into target
  from public.generation_records
  where id = target_generation_id and owner_id = target_owner_id
  for update;

  if not found then
    raise exception 'Managed generation not found';
  end if;

  if target.execution_mode <> 'managed' then
    raise exception 'Only managed generations can be claimed';
  end if;

  if target.operational_status <> 'draft' then
    return false;
  end if;

  select * into settings
  from public.generation_budget_settings
  where owner_id = target.owner_id
  for update;

  if not found then
    raise exception 'Generation budget settings are missing';
  end if;

  if target.provider <> 'studioflow-fake' and not settings.generation_enabled then
    raise exception 'Managed provider generation is disabled';
  end if;

  if target.provider = 'studioflow-fake' and target.estimated_cost_micros <> 0 then
    raise exception 'The fake provider must remain free';
  end if;

  request_limit := case target.media_kind
    when 'image' then settings.max_image_request_micros
    when 'video' then settings.max_video_request_micros
  end;

  if target.estimated_cost_micros > request_limit then
    raise exception 'Generation exceeds the per-request spending limit';
  end if;

  select coalesce(sum(
    case
      when calculated_cost_micros is not null then calculated_cost_micros
      when operational_status in ('submitting', 'queued', 'running', 'saving', 'cancel_requested', 'submission_unknown') then reserved_max_cost_micros
      else 0
    end
  ), 0) into daily_exposure
  from public.generation_records
  where owner_id = target.owner_id
    and id <> target.id
    and execution_mode = 'managed'
    and created_at >= date_trunc('day', now());

  select coalesce(sum(
    case
      when calculated_cost_micros is not null then calculated_cost_micros
      when operational_status in ('submitting', 'queued', 'running', 'saving', 'cancel_requested', 'submission_unknown') then reserved_max_cost_micros
      else 0
    end
  ), 0) into monthly_exposure
  from public.generation_records
  where owner_id = target.owner_id
    and id <> target.id
    and execution_mode = 'managed'
    and created_at >= date_trunc('month', now());

  if daily_exposure + target.estimated_cost_micros > settings.daily_limit_micros then
    raise exception 'Generation exceeds the daily spending limit';
  end if;
  if monthly_exposure + target.estimated_cost_micros > settings.monthly_limit_micros then
    raise exception 'Generation exceeds the monthly spending limit';
  end if;

  select
    coalesce((select sum(bytes) from public.assets where owner_id = target.owner_id), 0)
    + coalesce((select sum(bytes) from public.backup_runs where owner_id = target.owner_id and status = 'completed'), 0)
    + coalesce((
      select sum(reserved_output_bytes)
      from public.generation_records
      where owner_id = target.owner_id
        and id <> target.id
        and execution_mode = 'managed'
        and operational_status in ('submitting', 'queued', 'running', 'saving', 'cancel_requested', 'submission_unknown')
    ), 0)
  into storage_exposure;

  if target.estimated_output_bytes > settings.generated_output_limit_bytes
    or storage_exposure + target.estimated_output_bytes > 9000000000 then
    raise exception 'Generation exceeds the private storage safety limit';
  end if;

  update public.generation_records
  set operational_status = 'submitting',
      reserved_max_cost_micros = estimated_cost_micros,
      reserved_output_bytes = estimated_output_bytes,
      submission_claim_id = requested_claim_id,
      submission_claim_expires_at = now() + interval '2 minutes',
      submitted_at = now(),
      failure_code = null,
      failure_message = null
  where id = target.id;

  return true;
end;
$$;

revoke all on function public.claim_generation_submission(uuid, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.claim_generation_submission(uuid, uuid, uuid) to service_role;

create or replace function public.mark_generation_submission_started(
  target_generation_id uuid,
  requested_claim_id uuid,
  target_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.app_owners where user_id = target_owner_id) then
    raise exception 'Configured StudioFlow owner not found';
  end if;

  update public.generation_records
  set provider_submission_started_at = now()
  where id = target_generation_id
    and owner_id = target_owner_id
    and operational_status = 'submitting'
    and submission_claim_id = requested_claim_id
    and provider_submission_started_at is null;

  return found;
end;
$$;

revoke all on function public.mark_generation_submission_started(uuid, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.mark_generation_submission_started(uuid, uuid, uuid) to service_role;

create or replace function public.recover_stale_generation_claims()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  with recovered as (
    update public.generation_records
    set operational_status = case
          when provider_submission_started_at is null then 'draft'
          else 'submission_unknown'
        end,
        reserved_max_cost_micros = case
          when provider_submission_started_at is null then 0
          else reserved_max_cost_micros
        end,
        reserved_output_bytes = case
          when provider_submission_started_at is null then 0
          else reserved_output_bytes
        end,
        submission_claim_id = null,
        submission_claim_expires_at = null,
        failure_code = case
          when provider_submission_started_at is null then null
          else 'submission_response_lost'
        end,
        failure_message = case
          when provider_submission_started_at is null then null
          else 'Provider submission may have occurred; owner review is required.'
        end
    where execution_mode = 'managed'
      and operational_status = 'submitting'
      and submission_claim_expires_at < now()
    returning 1
  )
  select count(*)::integer into changed from recovered;
  return changed;
end;
$$;

revoke all on function public.recover_stale_generation_claims() from public, anon, authenticated, service_role;
grant execute on function public.recover_stale_generation_claims() to service_role;

create or replace function public.complete_generation_ingest(
  target_generation_id uuid,
  target_owner_id uuid,
  output_filename text,
  output_mime_type text,
  output_bytes bigint,
  output_storage_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.generation_records%rowtype;
  existing_asset_id uuid;
  generated_asset_id uuid := target_generation_id;
  settled_cost_micros bigint;
begin
  if not exists (select 1 from public.app_owners where user_id = target_owner_id) then
    raise exception 'Configured StudioFlow owner not found';
  end if;

  select * into target
  from public.generation_records
  where id = target_generation_id
    and owner_id = target_owner_id
    and execution_mode = 'managed'
  for update;

  if not found then
    raise exception 'Managed generation not found';
  end if;

  select id into existing_asset_id
  from public.assets
  where source_generation_id = target.id
    and owner_id = target.owner_id;

  if target.operational_status = 'completed' and existing_asset_id is not null then
    return existing_asset_id;
  end if;

  if target.operational_status <> 'saving' then
    raise exception 'Generation must be saving before output ingest can complete';
  end if;
  if output_bytes <= 0 or output_bytes > target.reserved_output_bytes then
    raise exception 'Generated output exceeds its reserved byte envelope';
  end if;
  if output_storage_key not like 'owners/' || target_owner_id::text || '/media/' || target_generation_id::text || '/%' then
    raise exception 'Generated output storage key is outside the owner generation prefix';
  end if;
  if (target.media_kind = 'image' and output_mime_type not in ('image/jpeg', 'image/png', 'image/webp'))
    or (target.media_kind = 'video' and output_mime_type not in ('video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska')) then
    raise exception 'Generated output type does not match the requested media kind';
  end if;

  insert into public.assets (
    id, owner_id, project_id, episode_id, kind, filename, mime_type, bytes,
    storage_key, review_status, source, source_generation_id, notes
  )
  select
    generated_asset_id,
    target.owner_id,
    series.project_id,
    target.episode_id,
    target.media_kind::public.asset_kind,
    output_filename,
    output_mime_type,
    output_bytes,
    output_storage_key,
    'unreviewed'::public.asset_review_status,
    'generation',
    target.id,
    'Generated output copied directly from the configured provider into private B2.'
  from public.episodes
  join public.series on series.id = episodes.series_id and series.owner_id = episodes.owner_id
  where episodes.id = target.episode_id and episodes.owner_id = target.owner_id
  on conflict (id) do nothing;

  if not found then
    raise exception 'Generation project context is missing or output asset already conflicts';
  end if;

  insert into public.asset_links (owner_id, asset_id, target_type, target_id)
  values (target.owner_id, generated_asset_id, 'generation', target.id)
  on conflict (asset_id, target_type, target_id) do nothing;

  settled_cost_micros := target.estimated_cost_micros;
  insert into public.cost_entries (
    owner_id, episode_id, source_generation_id, category, amount_cents,
    provider, note, occurred_on
  ) values (
    target.owner_id,
    target.episode_id,
    target.id,
    target.media_kind::public.cost_category,
    round(settled_cost_micros / 10000.0)::integer,
    target.provider,
    'Managed generation charge recorded once from its frozen pricing snapshot.',
    current_date
  )
  on conflict (source_generation_id) where source_generation_id is not null do nothing;

  update public.generation_records
  set operational_status = 'completed',
      calculated_cost_micros = settled_cost_micros,
      cost_cents = round(settled_cost_micros / 10000.0)::integer,
      asset_ids = case
        when generated_asset_id = any(asset_ids) then asset_ids
        else array_append(asset_ids, generated_asset_id)
      end,
      reserved_max_cost_micros = 0,
      reserved_output_bytes = 0,
      ingest_attempts = ingest_attempts + 1,
      completed_at = now(),
      next_poll_at = null
  where id = target.id and owner_id = target.owner_id;

  return generated_asset_id;
end;
$$;

revoke all on function public.complete_generation_ingest(uuid, uuid, text, text, bigint, text)
  from public, anon, authenticated, service_role;
grant execute on function public.complete_generation_ingest(uuid, uuid, text, text, bigint, text)
  to service_role;

create or replace function public.finalize_generation_without_output(
  target_generation_id uuid,
  target_owner_id uuid,
  target_status text,
  settled_cost_micros bigint,
  target_failure_code text,
  target_failure_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.generation_records%rowtype;
begin
  if target_status not in ('failed', 'cancelled', 'submission_unknown') then
    raise exception 'Unsupported generation terminal status';
  end if;
  if not exists (select 1 from public.app_owners where user_id = target_owner_id) then
    raise exception 'Configured StudioFlow owner not found';
  end if;

  select * into target
  from public.generation_records
  where id = target_generation_id
    and owner_id = target_owner_id
    and execution_mode = 'managed'
  for update;
  if not found then raise exception 'Managed generation not found'; end if;
  if target.operational_status in ('completed', 'failed', 'cancelled') then return false; end if;

  if target_status = 'submission_unknown' then
    settled_cost_micros := null;
  elsif settled_cost_micros is null or settled_cost_micros < 0 or settled_cost_micros > target.reserved_max_cost_micros then
    raise exception 'Settled generation cost must fit inside its reservation';
  end if;

  if settled_cost_micros is not null then
    insert into public.cost_entries (
      owner_id, episode_id, source_generation_id, category, amount_cents,
      provider, note, occurred_on
    ) values (
      target.owner_id,
      target.episode_id,
      target.id,
      target.media_kind::public.cost_category,
      round(settled_cost_micros / 10000.0)::integer,
      target.provider,
      'Managed provider charge recorded once without a saved output.',
      current_date
    )
    on conflict (source_generation_id) where source_generation_id is not null do nothing;
  end if;

  update public.generation_records
  set operational_status = target_status,
      calculated_cost_micros = settled_cost_micros,
      cost_cents = coalesce(round(settled_cost_micros / 10000.0)::integer, cost_cents),
      reserved_max_cost_micros = case when target_status = 'submission_unknown' then reserved_max_cost_micros else 0 end,
      reserved_output_bytes = case when target_status = 'submission_unknown' then reserved_output_bytes else 0 end,
      failure_code = target_failure_code,
      failure_message = target_failure_message,
      completed_at = case when target_status = 'submission_unknown' then completed_at else now() end,
      next_poll_at = null
  where id = target.id and owner_id = target.owner_id;
  return true;
end;
$$;

revoke all on function public.finalize_generation_without_output(uuid, uuid, text, bigint, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.finalize_generation_without_output(uuid, uuid, text, bigint, text, text)
  to service_role;

create trigger generation_input_assets_set_updated_at
before update on public.generation_input_assets
for each row execute function public.set_updated_at();

create trigger generation_budget_settings_set_updated_at
before update on public.generation_budget_settings
for each row execute function public.set_updated_at();

alter table public.generation_input_assets enable row level security;
alter table public.generation_events enable row level security;
alter table public.generation_budget_settings enable row level security;

revoke all on public.generation_input_assets from anon, authenticated;
revoke all on public.generation_events from anon, authenticated;
revoke all on public.generation_budget_settings from anon, authenticated;

grant select, insert, update, delete on public.generation_input_assets to authenticated;
grant select, insert on public.generation_events to authenticated;
grant select, insert, update on public.generation_budget_settings to authenticated;

create policy generation_input_assets_owner_access
on public.generation_input_assets
for all to authenticated
using (owner_id = (select auth.uid()) and (select private.is_app_owner()))
with check (owner_id = (select auth.uid()) and (select private.is_app_owner()));

create policy generation_events_owner_select
on public.generation_events
for select to authenticated
using (owner_id = (select auth.uid()) and (select private.is_app_owner()));

create policy generation_events_owner_insert
on public.generation_events
for insert to authenticated
with check (owner_id = (select auth.uid()) and (select private.is_app_owner()));

create policy generation_budget_settings_owner_select
on public.generation_budget_settings
for select to authenticated
using (owner_id = (select auth.uid()) and (select private.is_app_owner()));

create policy generation_budget_settings_owner_insert_disabled
on public.generation_budget_settings
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (select private.is_app_owner())
  and generation_enabled = false
);

create policy generation_budget_settings_owner_update_disabled
on public.generation_budget_settings
for update to authenticated
using (owner_id = (select auth.uid()) and (select private.is_app_owner()))
with check (
  owner_id = (select auth.uid())
  and (select private.is_app_owner())
  and generation_enabled = false
);

comment on table public.generation_input_assets is
  'Ordered private input references for managed AI generations; reference URLs are never stored.';
comment on table public.generation_events is
  'Append-only lifecycle history for managed generation work.';
comment on table public.generation_budget_settings is
  'Owner-scoped hard generation limits. Browser clients cannot enable real provider execution.';
comment on function public.claim_generation_submission(uuid, uuid, uuid) is
  'Atomically claims one managed generation after enforcing owner, spending, concurrency, and storage limits.';
comment on function public.recover_stale_generation_claims() is
  'Internal-only recovery for expired submission claims; ambiguous provider submissions require owner attention.';
comment on function public.complete_generation_ingest(uuid, uuid, text, text, bigint, text) is
  'Internal-only atomic metadata completion after a bounded provider output has been copied to private B2.';
comment on function public.finalize_generation_without_output(uuid, uuid, text, bigint, text, text) is
  'Internal-only idempotent settlement for failed, cancelled, or ambiguous managed provider work.';
comment on function public.protect_managed_generation_control_fields() is
  'Prevents authenticated browser clients from bypassing server-owned managed-generation claims, budgets, and lifecycle state.';
