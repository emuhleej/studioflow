create extension if not exists pgcrypto with schema extensions;

create type public.episode_status as enum (
  'idea', 'scripting', 'shot_planning', 'generating', 'editing', 'ready', 'published', 'archived'
);
create type public.beat_type as enum ('hook', 'setup', 'escalation', 'payoff', 'tag', 'custom');
create type public.entity_kind as enum ('character', 'location', 'prop', 'style');
create type public.asset_kind as enum ('image', 'audio', 'video');
create type public.asset_review_status as enum ('unreviewed', 'selected', 'rejected');
create type public.cost_category as enum ('image', 'video', 'voice', 'music', 'editing', 'other');
create type public.platform_name as enum ('tiktok', 'youtube', 'facebook', 'instagram');

create table public.app_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index app_owners_singleton_idx on public.app_owners ((true));

create or replace function public.is_app_owner(candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_owners where user_id = candidate);
$$;

revoke all on function public.is_app_owner(uuid) from public;
grant execute on function public.is_app_owner(uuid) to authenticated, service_role;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  accent text not null default '#b894f6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  premise text not null default '',
  format text not null default 'short_series' check (format in ('short_series', 'long_form', 'campaign', 'other')),
  orientation text not null default '9:16' check (orientation in ('9:16', '16:9', '1:1')),
  target_duration_seconds integer not null default 75 check (target_duration_seconds between 1 and 14400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  number integer not null check (number > 0),
  title text not null check (char_length(title) between 1 and 200),
  idea text not null default '',
  status public.episode_status not null default 'idea',
  target_duration_seconds integer not null default 75 check (target_duration_seconds between 1 and 14400),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  unique (series_id, number)
);

create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null default '',
  content text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  unique (episode_id, version)
);

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  title text not null,
  beat public.beat_type not null default 'custom',
  summary text not null default '',
  position integer not null check (position >= 0),
  location_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  title text not null,
  position integer not null check (position >= 0),
  duration_seconds numeric(8,2) not null default 5 check (duration_seconds > 0 and duration_seconds <= 600),
  framing text not null default '',
  action text not null default '',
  dialogue text not null default '',
  prompt text not null default '',
  status text not null default 'planned' check (status in ('planned', 'generated', 'selected')),
  character_ids uuid[] not null default '{}',
  asset_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind public.entity_kind not null,
  name text not null check (char_length(name) between 1 and 160),
  summary text not null default '',
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  prompt_fragment text not null default '',
  reference_asset_ids uuid[] not null default '{}',
  accent text not null default '#b894f6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

alter table public.scenes
  add constraint scenes_location_id_fkey foreign key (location_id) references public.entities(id) on delete set null;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null,
  kind public.asset_kind not null,
  filename text not null,
  mime_type text not null,
  bytes bigint not null check (bytes > 0 and bytes <= 2000000000),
  duration_seconds numeric(12,3),
  width integer,
  height integer,
  storage_key text not null unique,
  review_status public.asset_review_status not null default 'unreviewed',
  source text not null default 'upload' check (source in ('upload', 'generation', 'demo')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  constraint assets_kind_mime_type_check check (
    (kind = 'image' and mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'))
    or (kind = 'audio' and mime_type in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg', 'audio/flac'))
    or (kind = 'video' and mime_type in ('video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'))
  )
);

create table public.asset_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null unique references public.assets(id) on delete cascade,
  target_type text not null check (target_type in ('project', 'series', 'episode', 'scene', 'shot', 'entity', 'generation')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  unique (asset_id, target_type, target_id)
);

create table public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  upload_id text,
  mode text not null check (mode in ('single', 'multipart')),
  part_size integer,
  state text not null default 'started' check (state in ('started', 'uploading', 'completed', 'cancelled', 'failed')),
  completed_parts jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  shot_id uuid references public.shots(id) on delete set null,
  version integer not null check (version > 0),
  purpose text not null check (purpose in ('image', 'video', 'voice', 'script', 'other')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  unique nulls not distinct (episode_id, shot_id, purpose, version)
);

create table public.generation_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  shot_id uuid references public.shots(id) on delete set null,
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  provider text not null,
  model text not null,
  cost_cents integer not null default 0 check (cost_cents >= 0),
  duration_seconds numeric(12,3),
  outcome public.asset_review_status not null default 'unreviewed',
  asset_ids uuid[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  category text not null check (category in ('idea', 'script', 'storyboard', 'generation', 'editing', 'publishing', 'other')),
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  note text not null default '',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  category public.cost_category not null,
  amount_cents integer not null check (amount_cents >= 0),
  provider text not null default '',
  note text not null default '',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  platform public.platform_name not null,
  url text not null,
  published_at timestamptz not null,
  views bigint check (views is null or views >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 5000),
  converted_to_episode_id uuid references public.episodes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  bytes bigint not null check (bytes >= 0),
  status text not null check (status in ('completed', 'failed')),
  created_at timestamptz not null default now()
);

create table public.error_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  context text not null default '',
  path text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects(owner_id);
create index series_owner_id_idx on public.series(owner_id);
create index series_project_id_idx on public.series(project_id);
create index episodes_owner_id_idx on public.episodes(owner_id);
create index episodes_series_status_idx on public.episodes(series_id, status);
create index script_versions_owner_episode_idx on public.script_versions(owner_id, episode_id, version desc);
create index scenes_owner_episode_position_idx on public.scenes(owner_id, episode_id, position);
create index shots_owner_scene_position_idx on public.shots(owner_id, scene_id, position);
create index entities_owner_project_kind_idx on public.entities(owner_id, project_id, kind);
create index assets_owner_project_idx on public.assets(owner_id, project_id);
create index assets_owner_episode_idx on public.assets(owner_id, episode_id);
create index assets_deleted_at_idx on public.assets(owner_id, deleted_at);
create index asset_links_owner_target_idx on public.asset_links(owner_id, target_type, target_id);
create index upload_sessions_owner_state_idx on public.upload_sessions(owner_id, state);
create index prompt_versions_owner_episode_idx on public.prompt_versions(owner_id, episode_id);
create index generation_records_owner_episode_idx on public.generation_records(owner_id, episode_id);
create index time_entries_owner_episode_idx on public.time_entries(owner_id, episode_id);
create index cost_entries_owner_episode_idx on public.cost_entries(owner_id, episode_id);
create index publications_owner_episode_idx on public.publications(owner_id, episode_id);
create index captures_owner_id_idx on public.captures(owner_id);
create index backup_runs_owner_created_idx on public.backup_runs(owner_id, created_at desc);
create index error_events_owner_created_idx on public.error_events(owner_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_version_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'StudioFlow version records are immutable';
end;
$$;

create or replace function public.enforce_asset_quota()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_bytes bigint;
begin
  select coalesce(sum(bytes), 0) into current_bytes
  from public.assets
  where owner_id = new.owner_id and id <> new.id;
  select current_bytes + coalesce(sum(bytes), 0) into current_bytes
  from public.backup_runs
  where owner_id = new.owner_id and status = 'completed';
  if current_bytes + new.bytes > 9000000000 then
    raise exception 'StudioFlow 9 GB media safety cap exceeded';
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'series', 'episodes', 'scenes', 'shots', 'entities', 'assets', 'asset_links',
    'upload_sessions', 'generation_records', 'time_entries', 'cost_entries', 'publications', 'captures'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end $$;

create trigger script_versions_are_immutable before update or delete on public.script_versions for each row execute function public.prevent_version_mutation();
create trigger prompt_versions_are_immutable before update or delete on public.prompt_versions for each row execute function public.prevent_version_mutation();
create trigger assets_enforce_quota before insert or update of bytes, owner_id on public.assets for each row execute function public.enforce_asset_quota();

alter table public.app_owners enable row level security;
revoke all on public.app_owners from anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'series', 'episodes', 'script_versions', 'scenes', 'shots', 'entities', 'assets',
    'asset_links', 'upload_sessions', 'prompt_versions', 'generation_records', 'time_entries',
    'cost_entries', 'publications', 'captures', 'backup_runs', 'error_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = auth.uid() and public.is_app_owner(auth.uid())) with check (owner_id = auth.uid() and public.is_app_owner(auth.uid()))',
      table_name || '_owner_access', table_name
    );
  end loop;
end $$;

comment on table public.app_owners is 'Exactly one configured StudioFlow owner; populate after the first GitHub OAuth sign-in.';
comment on table public.assets is 'Metadata only. Media bytes live in a private Backblaze B2 bucket.';
comment on table public.script_versions is 'Append-only script history.';
comment on table public.prompt_versions is 'Append-only prompt history.';
