begin;
select plan(9);

select has_index('public', 'app_owners', 'app_owners_singleton_idx', 'only one StudioFlow owner can be configured');

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-8000-000000000011', 'rules-owner@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000012', 'rules-other@example.test', 'authenticated', 'authenticated');
insert into public.app_owners (user_id) values ('00000000-0000-4000-8000-000000000011');
insert into public.projects (id, owner_id, title)
values ('11000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'Rules project');
insert into public.series (id, owner_id, project_id, title)
values ('12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000001', 'Rules series');
insert into public.episodes (id, owner_id, series_id, number, title)
values ('13000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000001', 1, 'Rules episode');

select lives_ok(
  $$insert into public.script_versions (id, owner_id, episode_id, version, content) values ('14000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '13000000-0000-4000-8000-000000000001', 1, 'First draft')$$,
  'a first script version can be inserted'
);
select throws_ok(
  $$update public.script_versions set content = 'Rewritten in place' where id = '14000000-0000-4000-8000-000000000001'$$,
  'P0001',
  'StudioFlow version records are immutable',
  'script versions cannot be edited in place'
);

select lives_ok(
  $$insert into public.prompt_versions (id, owner_id, episode_id, version, purpose, content) values ('15000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '13000000-0000-4000-8000-000000000001', 1, 'video', 'First prompt')$$,
  'a first prompt version can be inserted'
);
select throws_ok(
  $$delete from public.prompt_versions where id = '15000000-0000-4000-8000-000000000001'$$,
  'P0001',
  'StudioFlow version records are immutable',
  'prompt versions cannot be deleted'
);

select throws_ok(
  $$insert into public.app_owners (user_id) values ('00000000-0000-4000-8000-000000000012')$$,
  '23505',
  null,
  'the owner allowlist rejects a second account'
);

select throws_ok(
  $$insert into public.assets (owner_id, project_id, kind, filename, mime_type, bytes, storage_key) values ('00000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000001', 'image', 'empty.png', 'image/png', 0, 'test/empty.png')$$,
  '23514',
  null,
  'database rejects empty media files'
);

select throws_ok(
  $$insert into public.assets (owner_id, project_id, kind, filename, mime_type, bytes, storage_key) values ('00000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000001', 'image', 'vector.svg', 'image/svg+xml', 100, 'test/vector.svg')$$,
  '23514',
  null,
  'database rejects unsupported media formats'
);

insert into public.assets (owner_id, project_id, kind, filename, mime_type, bytes, storage_key)
select
  '00000000-0000-4000-8000-000000000011',
  '11000000-0000-4000-8000-000000000001',
  'video',
  'quota-' || item || '.mp4',
  'video/mp4',
  2000000000,
  'test/quota-' || item
from generate_series(1, 4) as item;
insert into public.assets (owner_id, project_id, kind, filename, mime_type, bytes, storage_key)
values ('00000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000001', 'video', 'quota-tail.mp4', 'video/mp4', 900000000, 'test/quota-tail');

select throws_ok(
  $$insert into public.assets (owner_id, project_id, kind, filename, mime_type, bytes, storage_key) values ('00000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000001', 'video', 'over-cap.mp4', 'video/mp4', 100000001, 'test/over-cap')$$,
  'P0001',
  'StudioFlow 9 GB media safety cap exceeded',
  'database blocks media that would cross 9 GB'
);

select * from finish();
rollback;
