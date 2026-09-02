begin;
select plan(7);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-8000-000000000021', 'media-owner@example.test', 'authenticated', 'authenticated');
insert into public.app_owners (user_id) values ('00000000-0000-4000-8000-000000000021');
insert into public.projects (id, owner_id, title)
values ('21000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'Media project');
insert into public.series (id, owner_id, project_id, title)
values ('22000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', '21000000-0000-4000-8000-000000000001', 'Media series');
insert into public.episodes (id, owner_id, series_id, number, title)
values ('23000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', '22000000-0000-4000-8000-000000000001', 1, 'Media episode');
insert into public.scenes (id, owner_id, episode_id, title, position)
values ('24000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', '23000000-0000-4000-8000-000000000001', 'Media scene', 0);
insert into public.shots (id, owner_id, scene_id, title, position, asset_ids)
values ('25000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', '24000000-0000-4000-8000-000000000001', 'Media shot', 0, array['26000000-0000-4000-8000-000000000001']::uuid[]);
insert into public.assets (id, owner_id, project_id, episode_id, kind, filename, mime_type, bytes, storage_key, deleted_at)
values ('26000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', '21000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'video', 'linked.mp4', 'video/mp4', 100, 'test/linked.mp4', now());

select lives_ok(
  $$insert into public.asset_links (owner_id, asset_id, target_type, target_id) values ('00000000-0000-4000-8000-000000000021', '26000000-0000-4000-8000-000000000001', 'episode', '23000000-0000-4000-8000-000000000001')$$,
  'an asset can link to an episode'
);
select lives_ok(
  $$insert into public.asset_links (owner_id, asset_id, target_type, target_id) values ('00000000-0000-4000-8000-000000000021', '26000000-0000-4000-8000-000000000001', 'shot', '25000000-0000-4000-8000-000000000001')$$,
  'the same asset can link to another production record'
);
select throws_ok(
  $$insert into public.asset_links (owner_id, asset_id, target_type, target_id) values ('00000000-0000-4000-8000-000000000021', '26000000-0000-4000-8000-000000000001', 'episode', '23000000-0000-4000-8000-000000000001')$$,
  '23505',
  null,
  'an identical asset link remains unique'
);
select throws_ok(
  $$insert into public.asset_links (owner_id, asset_id, target_type, target_id) values ('00000000-0000-4000-8000-000000000021', '26000000-0000-4000-8000-000000000001', 'episode', '23000000-0000-4000-8000-000000000099')$$,
  'P0001',
  'Asset link target must exist in the same owner workspace',
  'a missing polymorphic target is rejected'
);

select lives_ok(
  $$select public.delete_asset_metadata('26000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021')$$,
  'permanent metadata deletion succeeds for trashed media'
);
select results_eq(
  $$select count(*)::bigint from public.assets where id = '26000000-0000-4000-8000-000000000001'$$,
  $$values (0::bigint)$$,
  'permanent deletion removes the asset and cascading links'
);
select results_eq(
  $$select asset_ids from public.shots where id = '25000000-0000-4000-8000-000000000001'$$,
  $$values (array[]::uuid[])$$,
  'permanent deletion removes embedded shot references'
);

select * from finish();
rollback;
