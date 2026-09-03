# Production release gate

No approved StudioFlow production release exists. Repository setup produced one protected, nonfunctional production-context shell; CI does not deploy or promote production.

## Current Netlify lock

- The Netlify project is `studioflowhq` and remains private.
- `[context.production] ignore = "exit 0"` in `netlify.toml` is intended to skip ordinary `main` builds.
- If Netlify bypasses the ignore check, the production-context command runs `scripts/netlify-production-guard.mjs` and fails closed unless the separately managed `STUDIOFLOW_PRODUCTION_RELEASE_COMMIT` value is a full 40-character SHA exactly matching Netlify's current `COMMIT_REF`.
- The Supabase browser URL, publishable key, and `VITE_DEMO_MODE=false` are configured only for the Deploy Previews context.
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
- Documentation-only closeout deployment `6a98b784104acf0008957b1c` at commit `faef374` completed, the canonical preview still opened the owner workspace with no browser warnings or errors, and all seven PR checks concluded without failure: six successful and one neutral. PR #5 remains unmerged pending a separate owner action.

Milestone 10F preview verification is complete. PR #5 still requires a separately approved description correction and merge after its documentation-only closeout head is green. Neither that merge nor Milestone 10F authorizes a production release.

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
4. Add the Supabase URL, Supabase publishable key, and `VITE_DEMO_MODE=false` only to Netlify's Production deploy context. These are required runtime configuration and remain while that production release is active; remove them only when rolling back to the protected shell or decommissioning production.
5. Add `STUDIOFLOW_PRODUCTION_RELEASE_COMMIT` only to Netlify's Production deploy context, with the exact approved SHA. This is a one-commit build authorization, not ongoing runtime configuration.
6. As part of the same approved release, create and invoke a one-time Netlify build hook for the production branch. Netlify documents that build hooks bypass the ordinary ignore command; the fail-closed production command must report that the approved SHA matches `COMMIT_REF`.
7. Delete the one-time build hook and remove `STUDIOFLOW_PRODUCTION_RELEASE_COMMIT` immediately after the candidate build completes. Verify auto publishing remains locked and confirm a retry or later commit fails closed again.
8. Review the unpublished production candidate, then manually publish that exact candidate only after reconfirming the approval and commit.

After the manual publish:

1. Open the exact Netlify production URL in a signed-out session and verify only the login shell is visible.
2. Sign in as a non-owner test account and verify the denial screen.
3. Sign in as the owner and verify one record from every major area.
4. Confirm a copied media URL expires and cannot be generated by the non-owner.
5. Record the deployed commit and protected URL in the release notes.

Do not call the release live until the one-commit approval has been cleared and all five post-publish checks pass.
