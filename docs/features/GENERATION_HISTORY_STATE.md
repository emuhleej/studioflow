# Prompt and Generation History — Implementation State

Last updated: 2026-09-02

## Status

**COMPLETE**

Current checkpoint: **Milestones 7A–7D complete**

## Purpose

Prompt and generation history preserves how each attempted result was made. It keeps exact prompt revisions, episode or shot context, provider details, costs, output assets, and review decisions available without rewriting prior production history.

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
- `src/state/studio-context.ts`
- `src/state/studio-store.tsx`
- `src/state/workspace-persistence.ts`
- `src/types.ts`
- `src/data/demo.ts`
- `tests/e2e/workspace.spec.ts`

### Database

- `supabase/migrations/20260831000100_studioflow_core.sql`
- `supabase/migrations/20260901000200_prompt_history_integrity.sql`
- `supabase/migrations/20260901000300_generation_record_integrity.sql`
- `supabase/migrations/20260902000100_generation_results.sql`
- `supabase/tests/database/production_rules.test.sql`
- `supabase/tests/database/prompt_history.test.sql`
- `supabase/tests/database/generation_history.test.sql`

## Data / Persistence

- `prompt_versions` stores append-only exact prompt text with owner, episode, optional shot, purpose, and version number.
- Version chains are unique by episode, optional shot, purpose, and version.
- `generation_records` stores manual provider/model provenance, optional prompt and shot context, cost in cents, optional duration, review outcome, result IDs, and notes.
- Explicit `asset_links` rows targeting a generation are the canonical result-media relationship.
- The generation result-ID array remains a synchronized backward-compatible projection for prior workspaces and exports.
- Browser commands update both result representations together. PostgreSQL triggers synchronize either representation and reject duplicate or cross-project results.
- Only active media from the same project can be newly attached. Previously attached trashed media remains visible until restored or permanently deleted so provenance is not silently hidden.
- Private restore writes generations before asset links so generation targets exist before polymorphic link validation.
- Asset-link restore reconciles on the natural asset/target relationship so a trigger-created compatibility link cannot cause a duplicate-link failure.
- Prompt and generation records use the existing demo localStorage or Supabase repository path; no second persistence system was added.

## Integration Status

| Integration                                    | State                                                           |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Episode-wide and shot-specific prompt versions | Implemented and tested                                          |
| Independent purpose/version chains             | Implemented and tested                                          |
| Immutable database prompt history              | Implemented; isolated pgTAP passed in GitHub Actions            |
| Manual generation provenance                   | Implemented and tested                                          |
| Result-media attachment and removal            | Implemented and tested                                          |
| Selected/rejected/unreviewed decisions         | Implemented and tested                                          |
| Backward-compatible result synchronization     | Implemented; isolated pgTAP and hosted restore rehearsal passed |
| Hosted owner persistence and restore           | Verified with temporary fictional records; test data removed    |
| Desktop, iPad, and phone workflow              | Implemented and tested                                          |

## Complete

- Milestone 7A immutable prompt history and safe “Use as next draft” behavior.
- Milestone 7B manual provider attempts with provider, model, prompt, shot, cost, duration, and notes.
- Milestone 7C same-project result-media attachment/removal and explicit attempt decisions.
- Milestone 7D complete provenance validation, reload persistence, responsive layout, keyboard semantics, 44-pixel review controls, and overflow checks.
- Exact prompt preservation, version sequencing, and blank/cross-context rejection.
- Read-only historical prompt cards without edit or delete controls.
- Result lookup that reads both legacy result arrays and canonical generation asset links without duplicates.
- Database validation and two-way synchronization for generation results.
- Import ordering compatible with generation-targeted asset links.
- Clear interface language that StudioFlow records external work but does not call the provider.

## Partially Implemented

- None within the approved account-free Milestone 7 scope.

## Not Started

- Live provider-backed generation execution, which belongs to the later AI-adapter phase and requires a new approved checkpoint.

## Broken / Needs Verification

- None within the approved manual Milestone 7 scope. Docker remains intentionally absent on this desktop; isolated database tests run in GitHub Actions instead.
- Live AI-provider execution is not a missing Milestone 7 feature. It remains a separately proposed phase in `AI_GENERATION_PLAN.md`.

## Locked Decisions

- Prompt versions are immutable and append-only; a revision always creates a new version.
- Version chains are scoped by episode, optional shot, and purpose.
- Prompt text is preserved exactly after nonblank validation.
- A generation may omit a saved prompt; a supplied prompt must match the generation episode and shot context.
- Explicit generation-targeted asset links are canonical; result-ID arrays are retained and synchronized for compatibility.
- Newly linked result media must be active and belong to the generation project.
- Review decisions describe the generation attempt and do not silently change the media asset’s independent review status.
- AI-provider execution, account configuration, and deployment remain separate approval gates.

## Known Risks

- Concurrent prompt saves can compute the same next version client-side; database uniqueness safely rejects the duplicate, but conflict-specific retry UX is outside Milestone 7.
- Existing prompt records whose shot was removed can display “Unknown shot”; immutable content remains preserved.
- A private workspace created against an older database must apply all six reviewed migrations before relying on canonical result-link synchronization.
- Future managed AI jobs must preserve current manual, outputless generation records; the additive compatibility rules are specified in `AI_GENERATION_PLAN.md`.

## Remaining Verification

- None within Milestone 7. All six migrations are applied to hosted Supabase, generated types are current, the isolated pgTAP suite passed in GitHub Actions, and the live fictional restore rehearsal was cleaned up exactly.
- The first real AI-provider job and its paid-cost reconciliation belong to the separately approved AI plan, not this completed feature.

## Exact Next Implementation Task

No Milestone 7 implementation remains. If the owner explicitly starts AI work, follow `AI_GENERATION_PLAN.md` and implement AI-1 only with the fake provider and `generation_enabled=false`; do not create a provider account, configure a provider key, submit a paid request, or deploy production.

## Remaining Implementation Order

None for Milestone 7.

## Update Rule

Update this file only if prompt/generation behavior, persistence, verification status, or locked scope changes. Keep exactly one **Exact Next Implementation Task**.
