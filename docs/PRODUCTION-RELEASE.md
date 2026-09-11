# Production release gate

No approved StudioFlow production release exists. Repository setup produced one protected, nonfunctional production-context shell; CI does not deploy or promote production.

## Current Netlify lock

- The Netlify project is `studioflowhq` and remains private.
- `[context.production] ignore = "exit 0"` in `netlify.toml` is intended to skip ordinary `main` builds.
- If Netlify bypasses the ignore check, the production-context command runs `scripts/netlify-production-guard.mjs` and fails closed unless the separately managed `STUDIOFLOW_PRODUCTION_RELEASE_COMMIT` value is a full 40-character SHA exactly matching Netlify's current `COMMIT_REF`.
- The Supabase browser URL, anon key, and `VITE_DEMO_MODE=false` are configured only for the Deploy Previews context.
- Netlify provider-level Auto Publishing is locked and must remain locked.
- Do not remove the production guard, add production-context values, or change project visibility without separate owner approval.

The original repository ignore rule did not prevent Netlify from publishing the initial `main` build at commit `6c18ece` while the site was being created. That build remains behind Netlify access control and has no production browser values, so it cannot open the private StudioFlow workspace. It is not an approved production release. The later fail-closed production command and the verified provider-level Auto Publishing lock guard against the same bypass recurring; the repository guards remain defense in depth.

## Current Milestone 10F preview

- Last functionally reviewed guarded Deploy Preview: deployment `6a98ade0b248ff000843f8f0` at commit `294acc8`; later documentation-only commits do not change the reviewed application bundle.
- Creator HQ opened successfully, and `/library` plus `/media` survived direct navigation and refresh.
- The browser console showed no warnings or errors.
- Responsive review passed at 1440 × 900, 1194 × 834, 834 × 1194, and 390 × 844.
- `npm run verify` passed with 69 unit/component tests and a production build; Playwright passed all 32 scenarios.
- A fresh GitHub sign-out/sign-in returned to the exact preview as the owner; three subsequent reloads preserved owner authorization.
- A 522-byte PNG completed private upload, 16 × 16 preview, matching-hash download, trash, restore, and permanent deletion. The delete function returned HTTP 200 after its awaited B2 deletion path, every queried temporary hosted record returned to zero, and the browser remained free of warnings and errors.
- Netlify Auto Publishing is locked.
- Documentation-only closeout deployment `6a98b784104acf0008957b1c` at commit `faef374` completed, the canonical preview still opened the owner workspace with no browser warnings or errors, and all seven PR checks concluded without failure: six successful and one neutral. Final PR head `3d850db` was merged into `main` as `0914fd9`; Netlify canceled the merge-triggered production attempt while Auto Publishing remained locked, and the published production shell remained at `6c18ece`.

Milestone 10F preview verification and the PR #5 repository gate are complete. The merge did not authorize or publish a production release.

## AI-1/AI-2 repository gate

- Netlify Deploy Preview #6 built the reviewed head `2c49ebbefe0a0cc8b5e1a94f2810f0d0a634f26c` successfully.
- Final-head StudioFlow CI run `33787517971` concluded successfully.
- PR #6 was merged into `main` as `2d6b5df70593bef82065137553de248f7f7b121e` on 2026-09-09.
- At the PR #6 post-merge checkpoint, checks confirmed `generation_enabled=false`, one disabled generation-settings row, and only the eight existing media/backup Edge Functions. The later, separately approved AI-3 deployment gate added four generation functions while reconfirming the switch remained false; it did not authorize or trigger a Netlify production release.
- Netlify still reports **Auto Publishing Locked**. The preview retains a separate **Publish deploy** action, which was not used.
- The merge did not authorize or publish a production release.

AI-3 Gate 3 later completed exactly one private Runway still-image request and returned `generation_enabled` to false. The provider request, Supabase function repair, and private B2 verification did not create a Netlify deploy and do not authorize production release. GitHub OAuth now uses PKCE; release verification must never inspect a callback URL before session exchange and URL cleanup complete.

The memory-safe generated-video transfer is deployed in `generation-ingest` version 10. One confirmed 497,698-byte MP4 completed through the bounded single-payload branch with authenticated playback, one canonical link, one $0.25 cost entry, released reservations, disabled generation, and an inactive scheduler. Multipart remains pending because the output was below 8 MiB. AI-5 shot handoff and complete-attempt detail are implemented locally. None of these actions authorizes a Netlify production release.

The final encrypted recovery prerequisite is complete. Hosted `metadata-backup` now writes schema version 2, and owner-authenticated `metadata-restore` completed a non-destructive live rehearsal from the latest private B2 object while preserving record counts and leaving generation plus its scheduler off. The next release action is preparation and review of one exact candidate commit; production publish still requires action-time confirmation for that exact reviewed candidate.

## Weekly preview

1. Open a pull request and wait for CI.
2. Review the Netlify branch preview at desktop, iPad landscape, iPad portrait, and 390×844.
3. Exercise one complete fictional workflow and inspect browser errors.
4. Review Supabase and B2 free-tier dashboards. Confirm paid overages remain disabled.
5. Merge only when the preview, tests, and privacy checks pass.

## Production approval and one-commit release procedure

A production deploy requires a separate explicit approval after the milestone preview. That approval must identify the exact reviewed commit; it does not authorize later commits.

1. Confirm Netlify auto publishing is locked and leave it locked.
2. Record the exact reviewed 40-character commit SHA in the release approval.
3. Add the exact production origin to the Supabase Auth redirect allowlist, Edge Function `APP_ORIGINS`, and B2 CORS. Wildcards are prohibited.
4. Add the Supabase URL, Supabase anon key, and `VITE_DEMO_MODE=false` only to Netlify's Production deploy context. These are required runtime configuration and remain while that production release is active; remove them only when rolling back to the protected shell or decommissioning production.
5. Add `STUDIOFLOW_PRODUCTION_RELEASE_COMMIT` only to Netlify's Production deploy context, with the exact approved SHA. This is a one-commit build authorization, not ongoing runtime configuration.
6. As part of the same approved release, create and invoke a one-time Netlify build hook for the production branch. Netlify documents that build hooks bypass the ordinary ignore command; the fail-closed production command must report that the approved SHA matches `COMMIT_REF`.
7. Delete the one-time build hook and remove `STUDIOFLOW_PRODUCTION_RELEASE_COMMIT` immediately after the candidate build completes. Verify auto publishing remains locked and confirm a retry or later commit fails closed again.
8. Review the unpublished production candidate, then manually publish that exact candidate only after reconfirming the approval and commit.

After the manual publish:

1. Open the exact Netlify production URL in a signed-out session and verify only the login shell is visible.
2. Sign in as a non-owner test account and verify the denial screen.
3. Sign in as the owner through the PKCE flow without capturing the callback URL, then verify one record from every major area.
4. Confirm a copied media URL expires and cannot be generated by the non-owner.
5. Record the deployed commit and protected URL in the release notes.

Do not call the release live until the one-commit approval has been cleared and all five post-publish checks pass.
