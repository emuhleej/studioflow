alter table public.prompt_versions
  add constraint prompt_versions_content_not_blank check (char_length(btrim(content)) > 0);

create or replace function public.validate_prompt_version_context()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.episodes
    where id = new.episode_id and owner_id = new.owner_id
  ) then
    raise exception 'Prompt episode must belong to the same owner';
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
    raise exception 'Prompt shot must belong to the same episode and owner';
  end if;

  return new;
end;
$$;

create trigger prompt_versions_validate_context
before insert on public.prompt_versions
for each row execute function public.validate_prompt_version_context();

comment on function public.validate_prompt_version_context() is
  'Keeps immutable prompt versions inside their owner, episode, and optional shot chain.';
