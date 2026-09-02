# Prompt and Generation History — Implementation State

Last updated: 2026-09-01

## Status

**ACTIVE**

Current checkpoint: **Milestones 7A and 7B complete**

## Purpose

Prompt and generation history preserves how each attempted result was made. It keeps exact prompt revisions, their episode or shot context, provider details, costs, output assets, and review decisions available without rewriting prior production history.

## Approved V1 Scope

- Immutable prompt versions grouped by episode, optional shot, and purpose.
- Manual generation records for work performed in external AI tools.
- Provider, model, prompt-version reference, cost, duration, notes, and result assets.
- Selected, rejected, and unreviewed decisions.
- Responsive use across desktop, iPad, and phone layouts.

## Explicitly Out of Scope

- Calling image, video, voice, or text generation APIs.
- Background generation jobs, provider authentication, retries, or usage imports.
- Automatic prompt rewriting or optimization.
- Video editing, automatic publishing, or social-performance analytics.
- Provider/account setup or production deployment.

## Files Involved

### Browser application

- `src/components/prompt-history-panel.tsx`
- `src/components/prompt-history-panel.test.tsx`
- `src/components/generation-history-panel.tsx`
- `src/components/generation-history-panel.test.tsx`
- `src/lib/prompt-history.ts`
- `src/lib/prompt-history.test.ts`
- `src/lib/generation-history.ts`
- `src/lib/generation-history.test.ts`
- `src/pages/episode.tsx`
- `src/state/studio-store.tsx`
- `src/types.ts`
- `src/data/demo.ts`
- `tests/e2e/workspace.spec.ts`

### Database

- `supabase/migrations/20260831000100_studioflow_core.sql`
- `supabase/migrations/20260901000200_prompt_history_integrity.sql`
- `supabase/migrations/20260901000300_generation_record_integrity.sql`
- `supabase/tests/database/production_rules.test.sql`
- `supabase/tests/database/prompt_history.test.sql`
- `supabase/tests/database/generation_history.test.sql`

## Data / Persistence

- `prompt_versions` stores append-only exact prompt text with owner, episode, optional shot, purpose, and version number.
- Version chains are unique by episode, optional shot, purpose, and version.
- Browser demo versions persist in the existing local workspace. Private-workspace versions use the existing Supabase repository adapter.
- A prompt shot must belong to the prompt's episode and owner. Blank prompt content is rejected in both the browser workflow and database.
- Existing prompt records remain backward compatible; no destructive migration or stored-data rewrite is used.
- `generation_records` stores manual provider and model provenance, optional prompt and shot context, cost in cents, optional duration, and notes.
- Generation records use the existing workspace persistence paths and initialize result assets and review state for the later 7C workflow without exposing 7C controls.
- Provider and model names cannot be blank. Cost cannot be negative, duration must be positive when supplied, and episode/shot/prompt relationships must remain owner-consistent.

## Integration Status

| Integration | State |
| --- | --- |
| Episode-wide prompt versions | Implemented and tested |
| Shot-specific prompt versions | Implemented and tested |
| Independent purpose/version chains | Implemented and tested |
| Copy old version into a new draft | Implemented and tested |
| Immutable database history | Implemented; pgTAP execution pending Docker |
| Manual generation records | Implemented and tested |
| Result-asset decisions | Existing foundation only; Milestone 7C not verified or completed |

## Complete

- Milestone 7A immutable prompt history.
- Episode-wide or shot-specific prompt selection.
- Independent version sequencing by episode, shot, and purpose.
- Exact prompt-text preservation.
- Blank-prompt and cross-episode-shot rejection.
- Read-only version cards without edit or delete controls.
- “Use as next draft” behavior that copies content without mutating history.
- Database integrity migration and focused pgTAP coverage.
- Unit, component, production-build, and responsive browser verification.
- Milestone 7B manual generation records.
- Provider and model capture for work performed in external tools.
- Optional immutable prompt-version reference and episode/shot context.
- Cost, duration, and notes capture and display.
- Automatic shot matching for shot-specific prompt versions.
- Browser and database integrity validation for provider, model, cost, duration, owner, episode, shot, and prompt context.
- Clear interface language that StudioFlow records external work but does not call the provider.

## Partially Implemented

- Existing demo generation records include result references and decisions, but Milestone 7C has not verified the full workflow.

## Not Started

- Milestone 7C result assets and selected/rejected decisions.
- Milestone 7D full provenance verification and polish.
- Live Supabase prompt- and generation-history exercise.

## Broken / Needs Verification

- Docker is not installed in the verified shell environment, so the prompt- and generation-history migrations and pgTAP tests cannot run locally.
- The migration does not change browser-facing table row shapes, so generated database types do not require a source edit; regeneration remains part of the later approved local Supabase exercise.
- Supabase and the owner account are not configured, so remote prompt and generation persistence have not been exercised live.

## Locked Decisions

- Prompt versions are immutable and append-only.
- A new revision always creates a new record and version number.
- Version chains are scoped by episode, optional shot, and purpose.
- Prompt history uses the existing workspace persistence paths; no second storage system is permitted.
- Prompt text is preserved exactly after nonblank validation.
- AI provider execution remains outside production-core Milestone 7.
- Account configuration and deployment remain separate approval gates.
- A generation may omit a prompt reference when the external attempt did not use a saved StudioFlow prompt; when supplied, the reference must belong to the same episode and any shot-specific prompt must match the generation shot.
- Generation records default to an empty result-asset list and `unreviewed`; result linking and decision controls belong to Milestone 7C.

## Known Risks

- Concurrent remote saves can compute the same next version client-side; the database uniqueness rule safely rejects the duplicate, but conflict-specific retry UX is not included in 7A.
- Existing records whose shot was removed can display “Unknown shot”; immutable prompt content remains preserved.
- The new database context trigger remains unexecuted until Docker/Supabase is available.
- Existing generation records remain mutable at the data layer because 7C must add result assets and review decisions; 7B provides creation only and does not expose record editing.

## Remaining Verification

- Apply all migrations and run `prompt_history.test.sql` and `generation_history.test.sql` after local Supabase/Docker setup.
- Regenerate database types after the verified migration run.
- Exercise owner-only remote prompt and generation creation plus direct non-owner denial against configured Supabase.

## Exact Next Implementation Task

Implement Milestone 7C result-asset links and selected/rejected decisions with focused tests. Do not begin Milestone 7D verification and polish.

## Remaining Implementation Order

1. Milestone 7C — result assets and selected/rejected decisions.
2. Milestone 7D — complete provenance verification and responsive polish.

## Update Rule

Update this file after every meaningful prompt/generation-history implementation unit. Replace stale status and next-task text rather than appending a diary. Keep exactly one **Exact Next Implementation Task**.
