create or replace function public.validate_generation_result_assets()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  generation_project_id uuid;
begin
  if cardinality(new.asset_ids) <> (
    select count(distinct result.asset_id)::integer
    from unnest(new.asset_ids) as result(asset_id)
  ) then
    raise exception 'Generation result assets cannot contain duplicates';
  end if;

  select series.project_id
  into generation_project_id
  from public.episodes
  join public.series on series.id = episodes.series_id and series.owner_id = episodes.owner_id
  where episodes.id = new.episode_id and episodes.owner_id = new.owner_id;

  if generation_project_id is not null and exists (
    select 1
    from unnest(new.asset_ids) as result(result_asset_id)
    left join public.assets
      on assets.id = result.result_asset_id
      and assets.owner_id = new.owner_id
      and assets.project_id = generation_project_id
    where assets.id is null
  ) then
    raise exception 'Generation result assets must belong to the same owner and project';
  end if;

  return new;
end;
$$;

drop trigger if exists generation_records_validate_results on public.generation_records;
create trigger generation_records_validate_results
before insert or update of owner_id, episode_id, asset_ids on public.generation_records
for each row execute function public.validate_generation_result_assets();

create or replace function public.sync_generation_result_links_from_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.asset_links (owner_id, asset_id, target_type, target_id)
  select new.owner_id, result.result_asset_id, 'generation', new.id
  from unnest(new.asset_ids) as result(result_asset_id)
  on conflict (asset_id, target_type, target_id) do nothing;

  delete from public.asset_links
  where owner_id = new.owner_id
    and target_type = 'generation'
    and target_id = new.id
    and not (asset_id = any(new.asset_ids));

  return new;
end;
$$;

drop trigger if exists generation_records_sync_result_links on public.generation_records;
create trigger generation_records_sync_result_links
after insert or update of owner_id, asset_ids on public.generation_records
for each row execute function public.sync_generation_result_links_from_record();

create or replace function public.sync_generation_record_from_result_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.generation_records
    set asset_ids = array_remove(asset_ids, old.asset_id)
    where id = old.target_id
      and owner_id = old.owner_id
      and old.target_type = 'generation'
      and old.asset_id = any(asset_ids);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.target_type = 'generation' then
    update public.generation_records
    set asset_ids = array_remove(asset_ids, old.asset_id)
    where id = old.target_id
      and owner_id = old.owner_id
      and old.asset_id = any(asset_ids);
  end if;

  if new.target_type = 'generation' then
    update public.generation_records
    set asset_ids = array_append(asset_ids, new.asset_id)
    where id = new.target_id
      and owner_id = new.owner_id
      and not (new.asset_id = any(asset_ids));
  end if;

  return new;
end;
$$;

drop trigger if exists asset_links_sync_generation_result on public.asset_links;
create trigger asset_links_sync_generation_result
after insert or update of owner_id, asset_id, target_type, target_id or delete on public.asset_links
for each row execute function public.sync_generation_record_from_result_link();

create or replace function public.validate_asset_link_target()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_table text;
  target_exists boolean;
begin
  if not exists (
    select 1 from public.assets where id = new.asset_id and owner_id = new.owner_id
  ) then
    raise exception 'Asset link must reference an asset owned by the same workspace';
  end if;

  target_table := case new.target_type
    when 'project' then 'projects'
    when 'series' then 'series'
    when 'episode' then 'episodes'
    when 'scene' then 'scenes'
    when 'shot' then 'shots'
    when 'entity' then 'entities'
    when 'generation' then 'generation_records'
  end;

  execute format(
    'select exists(select 1 from public.%I where id = $1 and owner_id = $2)',
    target_table
  ) into target_exists using new.target_id, new.owner_id;

  if not target_exists then
    raise exception 'Asset link target must exist in the same owner workspace';
  end if;

  if new.target_type = 'generation' and not exists (
    select 1
    from public.assets
    join public.generation_records on generation_records.id = new.target_id
      and generation_records.owner_id = new.owner_id
    join public.episodes on episodes.id = generation_records.episode_id
      and episodes.owner_id = generation_records.owner_id
    join public.series on series.id = episodes.series_id
      and series.owner_id = episodes.owner_id
    where assets.id = new.asset_id
      and assets.owner_id = new.owner_id
      and assets.project_id = series.project_id
  ) then
    raise exception 'Generation result asset must belong to the same project';
  end if;

  return new;
end;
$$;

insert into public.asset_links (owner_id, asset_id, target_type, target_id)
select generation_records.owner_id, result.result_asset_id, 'generation', generation_records.id
from public.generation_records
cross join lateral unnest(generation_records.asset_ids) as result(result_asset_id)
join public.assets on assets.id = result.result_asset_id and assets.owner_id = generation_records.owner_id
join public.episodes on episodes.id = generation_records.episode_id and episodes.owner_id = generation_records.owner_id
join public.series on series.id = episodes.series_id and series.owner_id = generation_records.owner_id
where assets.project_id = series.project_id
on conflict (asset_id, target_type, target_id) do nothing;

comment on function public.validate_generation_result_assets() is
  'Keeps generation result assets unique and inside the generation project.';
comment on function public.sync_generation_result_links_from_record() is
  'Maintains explicit generation asset links when compatible result arrays are imported or updated.';
comment on function public.sync_generation_record_from_result_link() is
  'Keeps the backward-compatible generation asset array synchronized with explicit result links.';
