# StudioFlow Codex Manual

## Purpose and authority

This file is the permanent repository-level instruction manual for Codex. Read it before inspecting, editing, generating, testing, configuring, publishing, or deploying StudioFlow.

These rules apply to every coding session. A direct instruction from the project owner can override a rule for that specific task, but Codex must identify the override and keep it as narrow as possible. If an instruction is unclear or two instructions conflict, stop and ask a concise clarifying question before changing files. If more than two questions are required, ask them through an interactive question flow.

Honor stopping points exactly. When the owner asks for one step, checkpoint, audit, or bounded slice, complete and verify only that slice, report the result, and stop. Do not automatically begin the next phase.

## Project purpose and vision

StudioFlow is a private production operating system for building recurring AI-video series. It preserves the complete creative and production chain:

```text
idea -> script history -> production memory -> scenes -> shots -> prompts
     -> generations -> media -> editing handoff -> publication -> time and cost
```

StudioFlow initially serves one owner. Its purpose is to support a sustainable AI-entertainment workflow while providing a long-running coding and learning project. Revenue is expected to come from the content library, not from forcing StudioFlow into an early subscription product.

The public repository may contain code, schemas, fictional demo data, tests, and documentation. Real projects, scripts, prompts, media, production history, exports, backups, identifiers, and credentials remain private.

## Product scope

The production core includes:

- Projects, series, episodes, production stages, and quick capture.
- Characters, locations, props, styles, and reusable prompt fragments.
- Immutable script and prompt versions.
- Ordered scenes and shots, including a reusable 60–90 second sitcom structure.
- Private image, audio, and video metadata and lifecycle management.
- Generation provenance without requiring AI-provider calls.
- Time, cost, publication, export, backup, and restore records.
- Desktop and iPad workspaces with a focused phone quick-capture experience.

Unless the owner explicitly starts a later phase, do not add:

- A full timeline editor.
- AI-provider execution.
- Automatic social posting or analytics imports.
- Customer accounts, teams, subscriptions, billing, or enterprise features.
- Cloudflare infrastructure.

## Required reading before changing code

Before any meaningful change:

1. Read this `CODEX.md` completely.
2. Read any applicable `AGENTS.md` from the repository or parent workspace.
3. Read `README.md`, `package.json`, and `.gitignore`.
4. Inspect `git status` and preserve unrelated or user-authored changes.
5. Read the files directly involved in the task and their existing tests.
6. Read the additional documents required by the change:

| Change area                                | Required documents                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Active feature implementation              | The matching `docs/features/*_STATE.md` file                                 |
| Architecture, storage, data flow           | `docs/ARCHITECTURE.md`                                                       |
| Authentication, RLS, secrets, private data | `docs/SECURITY.md` and `SECURITY.md`                                         |
| Supabase or B2 setup                       | `docs/SETUP.md`                                                              |
| Database schema or policies                | Current migrations, generated database types, and `supabase/tests/database/` |
| Backup, export, or restore                 | `docs/BACKUP-RESTORE.md`                                                     |
| Milestones or scope                        | `docs/BUILD-PLAN.md`                                                         |
| Preview or production release              | `docs/PRODUCTION-RELEASE.md`                                                 |

Do not infer the current repository state from an old conversation, plan, or generated output. Verify it from the working tree.

## Architecture standards

StudioFlow is a single TypeScript repository using:

- React and Vite for the browser application.
- React Router for application routing.
- TanStack Query for remote server state.
- Zod at untrusted data boundaries.
- Tailwind-backed design tokens and shared UI components.
- Vitest for unit and component tests.
- Playwright for responsive workflow tests.
- Supabase GitHub authentication, PostgreSQL, row-level security, generated APIs, and Edge Functions.
- Private Backblaze B2 storage for media and encrypted metadata backups.
- Netlify for the static application shell and approved branch previews.

Maintain these boundaries:

- Supabase stores metadata, relationships, histories, costs, time, and publication records.
- B2 stores private media bytes and encrypted backups.
- The browser stores temporary UI state and fictional demo data only.
- Large media uploads directly between the browser and B2 using short-lived signed URLs. Do not proxy large files through Netlify or Supabase.
- Generated provider outputs have one narrow exception: an internal-only Edge Function may stream one bounded result directly from an exact approved provider host into private B2. It accepts only a stored generation ID, never a caller-supplied URL, never follows redirects, never buffers the complete object, and never stores or returns the temporary provider URL.
- Cloudflare is deliberately excluded.
- The public web shell is not a security boundary. Authentication, the singleton owner allowlist, RLS, authenticated Edge Functions, and private B2 objects provide security.

Every owner-scoped database record must carry an indexed `owner_id`. Anonymous and non-owner access must be denied at the database layer, not only hidden in the interface. Browser-started Edge Functions using privileged credentials must repeat owner verification. Scheduled generation recovery is the only internal-service exception: it uses a separate server-only secret, accepts no caller-supplied owner/job/storage identifiers, selects due records itself, and remains scoped to the singleton owner.

Prefer small vertical feature slices. Reuse existing types, domain helpers, state patterns, shared components, and design tokens before adding new abstractions or dependencies. Do not introduce a new service, framework, state library, database, storage provider, or paid dependency without explicit approval.

## Coding standards

- Use TypeScript with strict types. Avoid `any`; isolate and justify it when an external boundary makes it unavoidable.
- Validate external input, imported JSON, function payloads, URLs, identifiers, file metadata, and environment-dependent values.
- Keep domain calculations in testable pure functions.
- Keep components focused. Move repeated controls and behavior into shared components or helpers.
- Preserve immutable script and prompt histories. Add new versions instead of editing history in place.
- Keep database migrations deterministic and reviewable. Never silently rewrite an already-applied production migration.
- Regenerate `src/lib/database.types.ts` after verified schema changes when the local Supabase stack is available.
- Use project-local dependencies and existing npm scripts. Do not install global tools unless the owner approves it.
- Do not add dependencies when the existing platform or a small local helper is sufficient.
- Follow existing naming, import, formatting, and file-location conventions.
- Keep fictional demo content clearly fictional and safe for a public repository.
- Do not leave commented-out implementations, unexplained temporary workarounds, debug logging, or dead files.
- Preserve explicitly requested code even if it is not currently used.

## Design and UX principles

StudioFlow should feel cinematic, compact, calm, and production-focused. It is a working studio, not a generic administration dashboard.

- Use the existing dark palette, typography, spacing scale, tokens, panels, fields, buttons, badges, and status components.
- Keep layouts clear and concise. Buttons, text, inputs, and action rows must look congruent.
- Avoid oversized empty areas, uneven gaps, detached controls, and unnecessary decorative surfaces.
- Maintain a clear hierarchy: page purpose, current production context, primary action, then supporting detail.
- Use progressive disclosure for advanced or destructive controls.
- Support desktop, iPad landscape, iPad portrait, and a 390 x 844 phone viewport.
- Phone work should prioritize quick capture and essential review rather than shrinking the full desktop workspace.
- Prevent horizontal overflow, clipped dialogs, inaccessible controls, and accidental layout shifts.
- Interactive targets must be at least 44 x 44 CSS pixels where practical.
- Preserve keyboard navigation, visible focus, semantic labels, useful empty states, and sufficient contrast.
- Confirm before irreversible deletion. Trash and restore should precede permanent deletion when supported.

When changing a visible interface, inspect the complete affected screen at every relevant viewport. Passing compilation alone is not visual verification.

## Testing expectations

Testing should match the risk and scope of the change. Add or update tests with the implementation, not afterward.

Minimum checks for ordinary code changes:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

`npm run verify` runs that standard sequence.

Also run:

- `npm run test:e2e` for workflows, navigation, dialogs, responsive layout, touch targets, or other visible behavior.
- `npm run supabase:test` for migrations, constraints, functions that depend on schema behavior, RLS, or owner-access changes.
- Focused tests first when diagnosing failures; run the broader relevant suite before declaring completion.

Database tests require an isolated Supabase stack and must never run their mutating fixtures against the hosted owner project. On the current desktop, use the GitHub Actions database-security job rather than installing Docker; `npm run supabase:test` remains available for an approved capable host. If a required test cannot run in either environment, do not claim it passed. Report exactly what passed, what failed, and what remains environmentally blocked.

Critical behaviors requiring regression coverage include:

- Anonymous and non-owner denial.
- Script and prompt immutability.
- Scene and shot ordering and duration totals.
- Time and cost totals.
- Media type, size, quota, privacy, trash, restore, and permanent-deletion rules.
- Interrupted multipart-upload recovery when that workflow changes.
- No horizontal overflow or clipped interactions at supported viewports.

Do not weaken, skip, delete, or rewrite tests merely to make a failing build green.

## Security and privacy rules

Never commit, paste into source, or expose in logs, screenshots, issues, pull requests, test fixtures, or chat:

- `.env` files or secrets.
- OAuth credentials, service-role keys, B2 keys, encryption keys, tokens, or signed URLs.
- AI-provider credentials, provider-only signed reference URLs, or temporary generated-output URLs.
- The production owner UUID or other private account identifiers.
- Real scripts, prompts, story ideas, generation records, or publication history.
- Real media, database exports, encrypted backups, or decrypted backup contents.
- Sensitive error payloads or form contents.

Use placeholders in `.env.example`. Keep B2 buckets private. Signed preview and download URLs must remain short-lived and purpose-specific. Do not rely on obscurity, client-side route guards, or the Netlify shell to protect data.

Maintain the media safeguards unless the owner explicitly approves a reviewed change:

- Warn at 8 GB.
- Block new uploads above the 9 GB safety cap.
- Limit individual files to 2 GB.
- Count active and trashed current media toward quota.
- Cancel unfinished multipart uploads after three days.
- Remove hidden prior B2 versions after one day.
- Never automatically delete current owner media.

Maintain managed-generation safeguards unless the owner explicitly approves a reviewed change:

- Keep the server-owned `generation_enabled` switch false until the separately approved first paid test.
- Recalculate and atomically reserve the maximum request cost and expected output bytes before any provider request.
- Allow only one active managed job, one immutable prepared-intent ID, one linked generated asset, and one generation-linked cost entry.
- Keep provider calls, credentials, reference URLs, and temporary output URLs outside the browser, database, exports, logs, screenshots, and chat.
- Treat lost submission responses and uncertain cancellation charges as `submission_unknown`; do not retry a potentially charged request automatically.
- Do not configure a provider account, key, scheduler secret, paid balance, live function deployment, or production release as part of AI-1 or AI-2.

If a secret or private value may have been exposed, stop, avoid repeating it, explain the scope without quoting it, and recommend rotation or containment.

## Repository and file safety

- Preserve unrelated working-tree changes. Existing changes belong to the owner unless proven otherwise.
- Never use destructive Git or filesystem commands such as `git reset --hard`, broad recursive deletion, or checkout-based file replacement without explicit approval.
- Resolve exact paths before moving, overwriting, or deleting files.
- Do not commit generated output or local state: `node_modules/`, `dist/`, coverage, Playwright reports, `test-results/`, `.netlify/`, `.supabase/`, logs, or local environment files.
- Do not commit real media, exports, backups, or credentials.
- Do not add a license without explicit approval. Default copyright remains intentional.
- Do not publish the repository, create or merge pull requests, change repository settings, or push branches unless requested.

## Deployment and external-service boundaries

Local implementation and testing do not authorize external configuration or deployment.

The following require separate, explicit owner approval:

- Creating, connecting, or modifying GitHub, Supabase, Backblaze, Netlify, OAuth, DNS, or other provider resources.
- Adding or rotating secrets.
- Enabling paid services, automatic upgrades, or overages.
- Creating a public repository or pushing local code.
- Creating a Netlify branch preview when external configuration is required.
- Deploying or promoting to production.
- Adding a custom domain.

A request to implement or test code is not permission to deploy it. A preview approval is not production approval.

Before any approved production release, follow `docs/PRODUCTION-RELEASE.md`. Do not call StudioFlow live until the exact production URL has been verified signed out, as a non-owner, and as the owner; private media access and URL expiry must also be checked. Record the deployed commit and protected URL in release notes.

## Working style and communication

- Lead with the outcome and keep updates concise.
- State assumptions that materially affect the work.
- Audit existing implementation before adding code so completed work is not rebuilt.
- Make the smallest coherent change that satisfies the requested slice.
- Explain blockers with evidence and distinguish code failures from unavailable local prerequisites.
- Never claim a test, deployment, backup, restore, or external action succeeded without verification.
- For learning slices, provide a short walkthrough and identify a meaningful owner-coded modification when requested.
- Ask before making a materially different product, architecture, privacy, cost, or deployment decision.

## Files to update after meaningful work

Keep documentation synchronized with behavior. Update only documents affected by the change, but do not leave known contradictions.

- `README.md`: current capabilities, prerequisites, commands, or repository status.
- `docs/BUILD-PLAN.md`: milestone state or scope completion.
- `docs/features/*_STATE.md`: active feature scope, implementation state, verification, and the one exact next task.
- `docs/ARCHITECTURE.md`: architecture, provider, boundary, storage, or data-flow decisions.
- `docs/SECURITY.md` and `SECURITY.md`: authentication, authorization, secrets, privacy, threat assumptions, or reporting behavior.
- `docs/SETUP.md`: environment variables, local prerequisites, provider setup, or configuration steps.
- `docs/BACKUP-RESTORE.md`: export, encryption, backup, restore, or rehearsal procedures.
- `docs/PRODUCTION-RELEASE.md`: preview, release, rollback, or live-verification procedures.
- `.env.example`: names and safe placeholders for newly required variables; never real values.
- `src/lib/database.types.ts`: generated database types after verified migration changes.
- Relevant unit, component, Playwright, and pgTAP tests.

If a change does not affect a document, do not create noisy documentation edits merely to mark activity. If a planned document or source file is missing, report that fact instead of silently inventing a conflicting structure.

## Completion checklist

Before reporting a meaningful slice complete:

1. Confirm the requested scope and stopping boundary were honored.
2. Review the final diff and preserve unrelated changes.
3. Run the relevant verification commands.
4. Check that no secrets, private data, generated output, or real media were added.
5. Verify responsive and accessible behavior when UI changed.
6. Update affected documentation and tests.
7. Report files changed, checks passed, checks not run, and any remaining blocker.
8. Stop. Do not begin the next milestone without a new instruction.
