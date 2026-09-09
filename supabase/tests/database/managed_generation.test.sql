begin;
select plan(26);

select has_table('public', 'generation_input_assets', 'managed inputs table exists');
select has_table('public', 'generation_events', 'managed lifecycle events table exists');
select has_table('public', 'generation_budget_settings', 'generation budget table exists');
select has_column('public', 'generation_records', 'reserved_max_cost_micros', 'cost reservations are persisted');
select has_column('public', 'generation_records', 'reserved_output_bytes', 'output reservations are persisted');
select has_column('public', 'assets', 'source_generation_id', 'generated assets have an idempotency source');
select has_column('public', 'cost_entries', 'source_generation_id', 'managed costs have an idempotency source');
select has_function('public', 'claim_generation_submission', array['uuid', 'uuid', 'uuid'], 'atomic submission claim exists');
select has_function('public', 'recover_stale_generation_claims', array[]::text[], 'scheduled claim recovery exists');
select has_function('public', 'complete_generation_ingest', array['uuid', 'uuid', 'text', 'text', 'bigint', 'text'], 'atomic output completion exists');

insert into auth.users (id, email, aud, role)
values
  ('70000000-0000-4000-8000-000000000001', 'managed-owner@example.test', 'authenticated', 'authenticated'),
  ('70000000-0000-4000-8000-000000000002', 'managed-other@example.test', 'authenticated', 'authenticated');
insert into public.app_owners (user_id) values ('70000000-0000-4000-8000-000000000001');
insert into public.generation_budget_settings (owner_id)
values ('70000000-0000-4000-8000-000000000001');
insert into public.projects (id, owner_id, title)
values
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'Managed project'),
  ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 'Other project');
insert into public.series (id, owner_id, project_id, title)
values ('72000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'Managed series');
insert into public.episodes (id, owner_id, series_id, number, title)
values ('73000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 1, 'Managed episode');
insert into public.scenes (id, owner_id, episode_id, title, position)
values ('74000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'Managed scene', 0);
insert into public.shots (id, owner_id, scene_id, title, position)
values ('75000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000001', 'Managed shot', 0);
insert into public.prompt_versions (id, owner_id, episode_id, shot_id, version, purpose, content)
values ('76000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', '75000000-0000-4000-8000-000000000001', 1, 'image', 'Managed prompt');
insert into public.assets (id, owner_id, project_id, episode_id, kind, filename, mime_type, bytes, storage_key)
values
  ('78000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', 'image', 'reference.png', 'image/png', 100, 'test/reference.png'),
  ('78000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', null, 'image', 'other.png', 'image/png', 100, 'test/other.png');

insert into public.generation_records (
  id, owner_id, episode_id, shot_id, prompt_version_id, execution_mode, media_kind,
  operational_status, client_request_id, provider, model, request_settings,
  estimated_cost_micros, pricing_snapshot, estimated_output_bytes
) values (
  '77000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  '76000000-0000-4000-8000-000000000001',
  'managed', 'image', 'draft', '79000000-0000-4000-8000-000000000001',
  'studioflow-fake', 'fake-image-v1',
  '{"aspectRatio":"9:16","qualityTier":"draft","outputCount":1}'::jsonb,
  0, '{"provider":"studioflow-fake"}'::jsonb, 2048
);

select lives_ok(
  $$insert into public.generation_input_assets (owner_id, generation_id, asset_id, role, position) values ('70000000-0000-4000-8000-000000000001', '77000000-0000-4000-8000-000000000001', '78000000-0000-4000-8000-000000000001', 'reference_image', 0)$$,
  'same-project private image can be attached as input'
);
select throws_ok(
  $$insert into public.generation_input_assets (owner_id, generation_id, asset_id, role, position) values ('70000000-0000-4000-8000-000000000001', '77000000-0000-4000-8000-000000000001', '78000000-0000-4000-8000-000000000002', 'reference_image', 1)$$,
  'P0001',
  'Generation reference must be an active image from the same project and no larger than 16 MB',
  'cross-project input is denied'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$update public.generation_records set operational_status = 'submitting' where id = '77000000-0000-4000-8000-000000000001'$$,
  'P0001', 'Managed generation control fields are server-owned', 'owner browser cannot bypass the server-owned lifecycle'
);
select throws_ok(
  $$select public.claim_generation_submission('77000000-0000-4000-8000-000000000001', '79000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'owner browser cannot execute the atomic service claim directly'
);
reset role;

set local role service_role;
select is(
  public.claim_generation_submission(
    '77000000-0000-4000-8000-000000000001',
    '79000000-0000-4000-8000-000000000010',
    '70000000-0000-4000-8000-000000000001'
  ),
  true,
  'free fake work receives one atomic claim'
);
select is(
  public.claim_generation_submission(
    '77000000-0000-4000-8000-000000000001',
    '79000000-0000-4000-8000-000000000011',
    '70000000-0000-4000-8000-000000000001'
  ),
  false,
  'repeated claim cannot submit the same prepared intent twice'
);
select is(
  public.mark_generation_submission_started(
    '77000000-0000-4000-8000-000000000001',
    '79000000-0000-4000-8000-000000000010',
    '70000000-0000-4000-8000-000000000001'
  ),
  true,
  'matching claim records the provider-request marker'
);

update public.generation_records
set submission_claim_expires_at = now() - interval '1 minute'
where id = '77000000-0000-4000-8000-000000000001';
select is(public.recover_stale_generation_claims(), 1, 'stale marked submission is recovered once');
select results_eq(
  $$select operational_status, reserved_output_bytes from public.generation_records where id = '77000000-0000-4000-8000-000000000001'$$,
  $$values ('submission_unknown'::text, 2048::bigint)$$,
  'ambiguous submission keeps its storage reservation and requires attention'
);

select lives_ok(
  $$update public.generation_records set operational_status = 'failed', calculated_cost_micros = 0, reserved_max_cost_micros = 0, reserved_output_bytes = 0 where id = '77000000-0000-4000-8000-000000000001'$$,
  'unknown fake submission can be closed without a charge'
);
select throws_ok(
  $$update public.generation_events set message = 'rewrite history' where generation_id = '77000000-0000-4000-8000-000000000001'$$,
  'P0001', 'StudioFlow generation events are append-only', 'lifecycle history cannot be rewritten'
);

insert into public.generation_records (
  id, owner_id, episode_id, shot_id, prompt_version_id, execution_mode, media_kind,
  operational_status, client_request_id, provider, model, provider_job_id, request_settings,
  estimated_cost_micros, pricing_snapshot, estimated_output_bytes, reserved_max_cost_micros,
  reserved_output_bytes, calculated_cost_micros
) values (
  '77000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000001',
  '73000000-0000-4000-8000-000000000001',
  '75000000-0000-4000-8000-000000000001',
  '76000000-0000-4000-8000-000000000001',
  'managed', 'image', 'saving', '79000000-0000-4000-8000-000000000002',
  'studioflow-fake', 'fake-image-v1', 'fake-job-2',
  '{"aspectRatio":"9:16","qualityTier":"draft","outputCount":1}'::jsonb,
  0, '{"provider":"studioflow-fake"}'::jsonb, 2048, 0, 2048, null
);
select is(
  public.complete_generation_ingest(
    '77000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000001',
    'generated.png', 'image/png', 1024,
    'owners/70000000-0000-4000-8000-000000000001/media/77000000-0000-4000-8000-000000000002/generated.png'
  ),
  '77000000-0000-4000-8000-000000000002'::uuid,
  'bounded ingest completes with a deterministic generated asset'
);
select is(
  public.complete_generation_ingest(
    '77000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000001',
    'generated.png', 'image/png', 1024,
    'owners/70000000-0000-4000-8000-000000000001/media/77000000-0000-4000-8000-000000000002/generated.png'
  ),
  '77000000-0000-4000-8000-000000000002'::uuid,
  'repeated completion returns the same asset without duplication'
);
select results_eq(
  $$select (select count(*) from public.assets where source_generation_id = '77000000-0000-4000-8000-000000000002'), (select count(*) from public.cost_entries where source_generation_id = '77000000-0000-4000-8000-000000000002'), (select count(*) from public.asset_links where target_type = 'generation' and target_id = '77000000-0000-4000-8000-000000000002')$$,
  $$values (1::bigint, 1::bigint, 1::bigint)$$,
  'duplicate reconciliation creates exactly one asset, cost, and link'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
select results_eq(
  $$select count(*)::bigint from public.generation_events$$,
  $$values (0::bigint)$$,
  'non-owner cannot read generation lifecycle history'
);
select throws_ok(
  $$insert into public.generation_budget_settings (owner_id) values ('70000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'non-owner cannot create generation budget settings'
);

select * from finish();
rollback;
