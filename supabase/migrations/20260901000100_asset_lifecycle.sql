alter table public.asset_links drop constraint if exists asset_links_asset_id_key;

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
  return new;
end;
$$;

drop trigger if exists asset_links_validate_target on public.asset_links;
create trigger asset_links_validate_target
before insert or update of owner_id, asset_id, target_type, target_id on public.asset_links
for each row execute function public.validate_asset_link_target();

create or replace function public.delete_asset_metadata(target_asset_id uuid, target_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.assets
    where id = target_asset_id and owner_id = target_owner_id and deleted_at is not null
  ) then
    raise exception 'Media must be in trash before permanent deletion';
  end if;

  update public.shots
  set asset_ids = array_remove(asset_ids, target_asset_id)
  where owner_id = target_owner_id and target_asset_id = any(asset_ids);

  update public.entities
  set reference_asset_ids = array_remove(reference_asset_ids, target_asset_id)
  where owner_id = target_owner_id and target_asset_id = any(reference_asset_ids);

  update public.generation_records
  set asset_ids = array_remove(asset_ids, target_asset_id)
  where owner_id = target_owner_id and target_asset_id = any(asset_ids);

  delete from public.assets where id = target_asset_id and owner_id = target_owner_id;
end;
$$;

revoke all on function public.delete_asset_metadata(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_asset_metadata(uuid, uuid) to service_role;
