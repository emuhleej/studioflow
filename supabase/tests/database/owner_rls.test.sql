begin;
select plan(16);

select has_table('public', 'projects', 'projects table exists');
select has_table('public', 'assets', 'assets table exists');
select has_table('public', 'script_versions', 'script_versions table exists');
select has_column('public', 'episodes', 'owner_id', 'episodes are owner scoped');
select has_column('public', 'assets', 'deleted_at', 'assets support recoverable trash');
select has_function('public', 'current_user_is_app_owner', array[]::text[], 'safe owner self-check exists');
select hasnt_function('public', 'is_app_owner', array['uuid'], 'candidate-based public owner lookup was removed');

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000002', 'other@example.test', 'authenticated', 'authenticated');
insert into public.app_owners (user_id) values ('00000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is(
  public.current_user_is_app_owner(),
  true,
  'configured owner passes the public self-check'
);
select throws_ok(
  $$select * from public.app_owners$$,
  '42501',
  null,
  'configured owner cannot read the private allowlist table'
);
select lives_ok(
  $$insert into public.projects (id, owner_id, title) values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Owner project')$$,
  'configured owner can create a project'
);
select results_eq(
  $$select count(*)::bigint from public.projects$$,
  $$values (1::bigint)$$,
  'configured owner can read own project'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is(
  public.current_user_is_app_owner(),
  false,
  'non-owner fails the public self-check'
);
select results_eq(
  $$select count(*)::bigint from public.projects$$,
  $$values (0::bigint)$$,
  'non-owner cannot read owner project'
);
select throws_ok(
  $$insert into public.projects (owner_id, title) values ('00000000-0000-4000-8000-000000000002', 'Intruder project')$$,
  '42501',
  null,
  'non-owner cannot create records'
);

set local role anon;
select throws_ok(
  $$select public.current_user_is_app_owner()$$,
  '42501',
  null,
  'anonymous role cannot execute the owner self-check'
);
select throws_ok(
  $$select * from public.projects$$,
  '42501',
  null,
  'anonymous role has no table access'
);

select * from finish();
rollback;
