begin;
select plan(6);

insert into auth.users (id, email, aud, role)
values ('20000000-0000-4000-8000-000000000001', 'prompt-owner@example.test', 'authenticated', 'authenticated');
insert into public.app_owners (user_id)
values ('20000000-0000-4000-8000-000000000001');
insert into public.projects (id, owner_id, title)
values ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Prompt project');
insert into public.series (id, owner_id, project_id, title)
values ('22000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Prompt series');
insert into public.episodes (id, owner_id, series_id, number, title)
values
  ('23000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 1, 'First episode'),
  ('23000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 2, 'Second episode');
insert into public.scenes (id, owner_id, episode_id, title, position)
values ('24000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'Prompt scene', 0);
insert into public.shots (id, owner_id, scene_id, title, position)
values ('25000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'Prompt shot', 0);

select lives_ok(
  $$insert into public.prompt_versions (id, owner_id, episode_id, version, purpose, content) values ('26000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 1, 'video', 'Episode-wide version one')$$,
  'an episode-wide prompt version can be saved'
);
select lives_ok(
  $$insert into public.prompt_versions (id, owner_id, episode_id, shot_id, version, purpose, content) values ('26000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', 1, 'video', 'Shot version one')$$,
  'a shot-specific prompt version can be saved'
);
select lives_ok(
  $$insert into public.prompt_versions (id, owner_id, episode_id, shot_id, version, purpose, content) values ('26000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', 2, 'video', 'Shot version two')$$,
  'a new immutable version can be appended to the same chain'
);
select throws_ok(
  $$insert into public.prompt_versions (owner_id, episode_id, shot_id, version, purpose, content) values ('20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', 2, 'video', 'Duplicate version')$$,
  '23505',
  null,
  'a prompt chain cannot reuse a version number'
);
select throws_ok(
  $$insert into public.prompt_versions (owner_id, episode_id, version, purpose, content) values ('20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 2, 'video', '   ')$$,
  '23514',
  null,
  'blank prompt content is rejected'
);
select throws_ok(
  $$insert into public.prompt_versions (owner_id, episode_id, shot_id, version, purpose, content) values ('20000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000001', 1, 'video', 'Wrong episode')$$,
  'P0001',
  'Prompt shot must belong to the same episode and owner',
  'a prompt cannot attach to a shot from another episode'
);

select * from finish();
rollback;
