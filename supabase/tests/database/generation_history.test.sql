begin;
select plan(16);

insert into auth.users (id, email, aud, role)
values ('30000000-0000-4000-8000-000000000001', 'generation-owner@example.test', 'authenticated', 'authenticated');
insert into public.app_owners (user_id)
values ('30000000-0000-4000-8000-000000000001');
insert into public.projects (id, owner_id, title)
values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Generation project'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Other project');
insert into public.series (id, owner_id, project_id, title)
values ('32000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 'Generation series');
insert into public.episodes (id, owner_id, series_id, number, title)
values
  ('33000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 1, 'First episode'),
  ('33000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 2, 'Second episode');
insert into public.scenes (id, owner_id, episode_id, title, position)
values ('34000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'Generation scene', 0);
insert into public.shots (id, owner_id, scene_id, title, position)
values ('35000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', 'Generation shot', 0);
insert into public.prompt_versions (id, owner_id, episode_id, shot_id, version, purpose, content)
values ('36000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001', 1, 'video', 'Generation prompt');
insert into public.assets (id, owner_id, project_id, episode_id, kind, filename, mime_type, bytes, storage_key)
values
  ('38000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'video', 'result.mp4', 'video/mp4', 100, 'test/result.mp4'),
  ('38000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000002', null, 'image', 'other.png', 'image/png', 100, 'test/other.png');

select lives_ok(
  $$insert into public.generation_records (id, owner_id, episode_id, provider, model, cost_cents, duration_seconds, notes) values ('37000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'Example Video', 'cinema-v2', 0, 6, 'No prompt attached')$$,
  'manual provenance can be saved without a prompt reference'
);
select lives_ok(
  $$insert into public.generation_records (id, owner_id, episode_id, shot_id, prompt_version_id, provider, model, cost_cents, duration_seconds, notes) values ('37000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', 'Example Video', 'cinema-v2', 125, 6.5, 'Complete provenance')$$,
  'manual provenance can reference the matching prompt and shot'
);
select throws_ok(
  $$insert into public.generation_records (owner_id, episode_id, provider, model) values ('30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', ' ', 'cinema-v2')$$,
  '23514', null, 'blank provider names are rejected'
);
select throws_ok(
  $$insert into public.generation_records (owner_id, episode_id, provider, model) values ('30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'Example Video', ' ')$$,
  '23514', null, 'blank model names are rejected'
);
select throws_ok(
  $$insert into public.generation_records (owner_id, episode_id, provider, model, duration_seconds) values ('30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 'Example Video', 'cinema-v2', 0)$$,
  '23514', null, 'zero duration is rejected'
);
select throws_ok(
  $$insert into public.generation_records (owner_id, episode_id, prompt_version_id, provider, model) values ('30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000002', '36000000-0000-4000-8000-000000000001', 'Example Video', 'cinema-v2')$$,
  'P0001', 'Generation prompt must belong to the same episode and owner', 'prompt references cannot cross episodes'
);
select throws_ok(
  $$insert into public.generation_records (owner_id, episode_id, prompt_version_id, provider, model) values ('30000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', 'Example Video', 'cinema-v2')$$,
  'P0001', 'Generation shot must match the selected prompt version', 'shot-specific prompts require the matching generation shot'
);

select lives_ok(
  $$update public.generation_records set asset_ids = array['38000000-0000-4000-8000-000000000001']::uuid[], outcome = 'selected' where id = '37000000-0000-4000-8000-000000000002'$$,
  'a generation can record a same-project result and selected decision'
);
select results_eq(
  $$select asset_id from public.asset_links where target_type = 'generation' and target_id = '37000000-0000-4000-8000-000000000002'$$,
  $$values ('38000000-0000-4000-8000-000000000001'::uuid)$$,
  'result arrays create explicit provenance links'
);
select lives_ok(
  $$delete from public.asset_links where target_type = 'generation' and target_id = '37000000-0000-4000-8000-000000000002' and asset_id = '38000000-0000-4000-8000-000000000001'$$,
  'an explicit result link can be removed'
);
select results_eq(
  $$select asset_ids from public.generation_records where id = '37000000-0000-4000-8000-000000000002'$$,
  $$values (array[]::uuid[])$$,
  'removing a result link synchronizes the compatible result array'
);
select throws_ok(
  $$update public.generation_records set asset_ids = array['38000000-0000-4000-8000-000000000002']::uuid[] where id = '37000000-0000-4000-8000-000000000002'$$,
  'P0001', 'Generation result assets must belong to the same owner and project', 'cross-project result arrays are rejected'
);
select throws_ok(
  $$update public.generation_records set asset_ids = array['38000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001']::uuid[] where id = '37000000-0000-4000-8000-000000000002'$$,
  'P0001', 'Generation result assets cannot contain duplicates', 'duplicate result assets are rejected'
);
select lives_ok(
  $$insert into public.asset_links (owner_id, asset_id, target_type, target_id) values ('30000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000001', 'generation', '37000000-0000-4000-8000-000000000001')$$,
  'a same-project asset can be linked directly to a generation'
);
select results_eq(
  $$select asset_ids from public.generation_records where id = '37000000-0000-4000-8000-000000000001'$$,
  $$values (array['38000000-0000-4000-8000-000000000001']::uuid[])$$,
  'direct result links synchronize the compatible result array'
);
select throws_ok(
  $$insert into public.asset_links (owner_id, asset_id, target_type, target_id) values ('30000000-0000-4000-8000-000000000001', '38000000-0000-4000-8000-000000000002', 'generation', '37000000-0000-4000-8000-000000000001')$$,
  'P0001', 'Generation result asset must belong to the same project', 'cross-project result links are rejected'
);

select * from finish();
rollback;
