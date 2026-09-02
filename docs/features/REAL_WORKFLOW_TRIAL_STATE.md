# Real Workflow Trial — Implementation State

Last updated: 2026-09-02

## Status

**COMPLETE — account-free rehearsal**

## Purpose

Prove that one coherent episode can move through StudioFlow's production core without database-dashboard intervention, then repair only the friction exposed by that trial.

## Approved V1 Scope

- Run one public-safe fictional episode through brief, scripting, shot planning, generation history, media review, time, cost, and publication records.
- Verify that the completed workflow survives a browser reload.
- Correct trial-blocking workflow and accessibility friction.
- Verify desktop, iPad landscape, iPad portrait, and 390 × 844 phone layouts.

## Explicitly Out of Scope

- Real private stories, prompts, media, or publication activity.
- AI-provider calls, automatic social posting, or analytics imports.
- Supabase, Backblaze B2, GitHub OAuth, or Netlify account configuration.
- Physical-device testing or production deployment.
- Week 10 live backup, restore, or release authorization.

## Files Involved

- `src/lib/domain.ts`
- `src/lib/domain.test.ts`
- `src/pages/episode.tsx`
- `src/styles.css`
- `tests/e2e/workspace.spec.ts`
- `docs/PROJECT_STATE.md`
- `docs/BUILD-PLAN.md`
- `README.md`

## Data / Persistence

- The rehearsal used the existing fictional browser-local workspace.
- The trial episode was `The Vacuum Starts a Union`, a fictional 75-second episode created through the normal interface.
- The record included an immutable script, five ordered template scenes and shots, an exact prompt version, manual generation provenance, linked result media, a selected review decision, time, cost, and an `example.com` publication record.
- Reload verification confirmed the completed episode remained available through the existing local persistence path.
- No rehearsal content was added to source-controlled demo seed data.

## Integration Status

| Integration | State |
| --- | --- |
| Brief through publication workflow | Completed with fictional local data |
| Script and prompt immutability | Completed and reload-verified |
| 60–90 second scene/shot template | Completed at 75 seconds |
| Generation provenance and review | Completed without provider calls |
| Generation-result media in episode Media tab | Repaired and regression-tested |
| Time, cost, and publication records | Completed and reload-verified |
| Desktop and iPad layouts | Browser-verified |
| 390 × 844 phone layout | Browser-verified |
| Live private provider workflow | Pending accounts and separate authorization |
| Physical-device review | Pending owner devices |

## Complete

- Completed the account-free Milestone 9 production rehearsal through every existing episode tab.
- Confirmed generation result media now appears in the owning episode even when the asset is linked through a generation, scene, shot, or explicit episode relationship.
- Added one canonical episode-media lookup that reads current and backward-compatible relationships without duplicates.
- Replaced nested interactive shot rows with separate, keyboard-accessible edit and order controls.
- Added accessible names to scene titles and scene/shot order controls.
- Raised episode tabs and all scene/shot order controls to 44-pixel touch targets.
- Verified no page-level horizontal overflow at desktop, both iPad orientations, and 390 × 844 phone size.
- Verified the phone shot dialog stays inside the viewport and remains scrollable.

## Partially Implemented

- None within the approved account-free rehearsal boundary.

## Not Started

- Owner-private episode trial using live Supabase and Backblaze storage.
- Physical iPad and phone review.

## Broken / Needs Verification

- Docker is not installed, so the pgTAP database suite remains unexecuted locally.
- External service accounts are not configured, so private cloud persistence and signed media behavior remain untested live.
- The default combined unit run hit one five-second prompt-history timeout on the slow Windows/OneDrive host. The stable single-worker run with a ten-second per-test allowance then passed all 63 tests.
- Playwright completed the 28 existing scenarios and the four new shot-planning scenarios; its temporary local web server required manual termination after reporting the final passes on this Windows host.

## Locked Decisions

- A generation-linked result belongs in the episode Media view even when the asset's legacy direct `episodeId` points elsewhere or is absent.
- Episode media lookup must preserve legacy embedded asset IDs and current explicit asset links without returning duplicates.
- Trial records remain fictional and browser-local until private accounts and an owner workspace are explicitly configured.
- No production publication or deployment is implied by a fictional `example.com` publication record.

## Known Risks

- Provider-backed behavior may expose separate issues that a fictional local rehearsal cannot reproduce.
- Physical Safari/iPadOS and mobile-browser behavior still require owner-device review.
- The Windows/OneDrive test runner can be slow enough to trigger an isolated five-second unit-test timeout or delay local web-server shutdown.

## Remaining Verification

- Run the database suite after Docker is installed.
- Repeat the workflow with owner-approved private content after Supabase and B2 are configured.
- Perform final physical iPad and phone review before production approval.

## Exact Next Implementation Task

Open a separately authorized live-service readiness checkpoint to configure the owner-controlled Supabase and Backblaze resources, then run the existing private media and backup/restore verification. Do not deploy production.

## Remaining Implementation Order

1. Live owner-service setup and database/media verification after explicit authorization.
2. Physical iPad and phone review.
3. Netlify preview review.
4. Separately approved production deployment and protected-URL verification.
