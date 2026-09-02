alter table public.generation_records
  add constraint generation_records_provider_not_blank check (char_length(btrim(provider)) > 0),
  add constraint generation_records_model_not_blank check (char_length(btrim(model)) > 0),
  add constraint generation_records_duration_valid check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 14400));

create or replace function public.validate_generation_record_context()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  prompt_shot_id uuid;
begin
  if not exists (
    select 1 from public.episodes
    where id = new.episode_id and owner_id = new.owner_id
  ) then
    raise exception 'Generation episode must belong to the same owner';
  end if;

  if new.shot_id is not null and not exists (
    select 1
    from public.shots
    join public.scenes on scenes.id = shots.scene_id
    where shots.id = new.shot_id
      and shots.owner_id = new.owner_id
      and scenes.owner_id = new.owner_id
      and scenes.episode_id = new.episode_id
  ) then
    raise exception 'Generation shot must belong to the same episode and owner';
  end if;

  if new.prompt_version_id is not null then
    select shot_id into prompt_shot_id
    from public.prompt_versions
    where id = new.prompt_version_id
      and owner_id = new.owner_id
      and episode_id = new.episode_id;

    if not found then
      raise exception 'Generation prompt must belong to the same episode and owner';
    end if;

    if prompt_shot_id is not null and new.shot_id is distinct from prompt_shot_id then
      raise exception 'Generation shot must match the selected prompt version';
    end if;
  end if;

  return new;
end;
$$;

create trigger generation_records_validate_context
before insert or update of owner_id, episode_id, shot_id, prompt_version_id on public.generation_records
for each row execute function public.validate_generation_record_context();

comment on function public.validate_generation_record_context() is
  'Keeps manual generation provenance inside its owner, episode, optional shot, and prompt context.';
