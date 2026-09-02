# StudioFlow Decision Register

This file is StudioFlow's long-term memory for durable decisions. Read it before proposing a different database, storage provider, hosting platform, state system, privacy model, product direction, or deployment workflow simply because another option is technically possible.

`CODEX.md` defines how agents work. `docs/ARCHITECTURE.md` describes how the application is structured. `docs/PROJECT_STATE.md` reports what is happening now. This file explains which important choices are settled and why.

## How to use this register

- Add an entry only when a choice will affect multiple features or future development sessions.
- Record the decision, rationale, consequences, and meaningful rejected alternatives.
- Do not add routine UI preferences, transient implementation details, bug fixes, daily progress, or task history.
- Do not delete an accepted decision when direction changes. Mark it **Superseded** and link to the replacing entry.
- A coding agent may investigate an alternative, but it must not reverse an accepted decision without explicit owner approval.

## DEC-001 — StudioFlow is a private creator operating system, not an initial SaaS

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Product direction

### Decision

StudioFlow initially serves one owner as a private production operating system for creating recurring AI-video series. Its primary business value is the content it helps produce. Subscription revenue from StudioFlow itself is optional future upside, not a production-core requirement.

### Rationale

The project needs to join three goals naturally: sustained coding practice, a real creative workflow, and the possibility of recurring revenue from published content. Designing for hypothetical customers immediately would divert work into onboarding, tenant management, permissions, billing, support, and generic configuration before the owner's production workflow is proven.

### Consequences

- Features optimize the owner's real production workflow first.
- Single-owner assumptions are intentional in the production core.
- Customer, team, billing, marketplace, and enterprise requirements do not shape the current data model or interface.
- A future SaaS phase requires a new explicit decision and architecture review.

### Rejected alternatives

- Launching StudioFlow first as a multi-tenant subscription product.
- Adding customer accounts or billing “for later” before a real owner workflow proves the need.

## DEC-002 — Public engineering repository, private production data

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Privacy and repository policy

### Decision

Code, schemas, tests, documentation, and clearly fictional demo data may live in a public repository. Real stories, ideas, scripts, prompts, media, generation records, costs, publication history, identifiers, exports, backups, and credentials must remain private.

### Rationale

The repository should document the coding journey without publishing the creative library, account details, or business data that StudioFlow exists to protect.

### Consequences

- Demo fixtures must be fictional and safe to expose.
- Real data must not appear in commits, issues, pull requests, screenshots, logs, or test fixtures.
- `.env`, media, exports, backups, and local provider state remain ignored.
- Public repository visibility does not make the application data public.

### Rejected alternatives

- Committing sanitized-looking copies of real prompts or scripts.
- Treating obscure URLs or a private Git branch as adequate data protection.
- Storing real media in Git or Git LFS.

## DEC-003 — Single-owner authorization is enforced by the backend

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Authentication and authorization

### Decision

GitHub OAuth establishes identity, but workspace access requires the authenticated UUID to match the singleton `app_owners` allowlist. Every owner-scoped table carries indexed `owner_id`, PostgreSQL RLS checks both identity and owner membership, and privileged Edge Functions repeat owner verification.

### Rationale

A route guard or hidden application URL cannot protect direct database and storage requests. The owner boundary must survive a modified browser client and direct API calls.

### Consequences

- `AuthGate` is an experience layer, not the security boundary.
- Anonymous and non-owner requests must fail at PostgreSQL and Edge Function boundaries.
- The owner UUID is configured in the database, not embedded in browser source.
- Multi-owner or team access requires a new authorization decision and migration.

### Rejected alternatives

- GitHub sign-in alone granting access.
- Client-side email or username allowlists.
- Hiding protected routes without RLS.
- Passing service-role or B2 credentials to the browser.

## DEC-004 — Two explicit persistence modes share one domain model

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Persistence

### Decision

StudioFlow has two intentional persistence modes:

- Fictional demo metadata uses localStorage and demo blobs use IndexedDB.
- The private online workspace uses Supabase PostgreSQL for metadata and private Backblaze B2 for media.

Both modes expose the same `WorkspaceData` model and application commands to the UI.

### Rationale

The demo must run safely without accounts, while the private production workspace must support authenticated access across desktop and iPad with durable media storage. A shared model prevents two separate applications from evolving.

### Consequences

- Demo mode must remain account-free and fictional.
- Browser-local persistence is not the production source of truth.
- Supabase is not introduced into page components as a parallel model.
- Features affecting persisted records must work coherently in both modes or explicitly document why they are private-mode only.

### Rejected alternatives

- Using localStorage as the permanent production database.
- Requiring cloud accounts merely to open the fictional demo.
- Building unrelated demo and production applications.
- Adding a third persistence system for records already represented in `WorkspaceData`.

## DEC-005 — `StudioProvider` owns client workspace state and commands

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Client architecture and state ownership

### Decision

`StudioProvider` is the application command layer and owner of the in-memory `WorkspaceData` aggregate. Pages and components read and mutate workspace records through `useStudio()`. `remote-repository.ts` owns metadata persistence translation; domain calculations remain in pure helpers.

### Rationale

Centralizing commands keeps demo and private modes consistent, provides one place for optimistic state and persistence behavior, and prevents pages from inventing competing data-access patterns.

### Consequences

- Pages do not independently query or upsert existing workspace tables.
- New global stores are not added for the same data.
- TanStack Query may support server state, but moving workspace ownership into query hooks requires an intentional repository-wide migration.
- CamelCase-to-snake_case translation remains in the repository adapter rather than being repeated throughout the UI.

### Rejected alternatives

- A second Redux, Zustand, context, or ad hoc singleton store for workspace records.
- Direct Supabase calls scattered across page components.
- A custom GraphQL layer added without a demonstrated domain requirement.
- Maintaining separate record types for every screen.

## DEC-006 — Supabase stores metadata; private B2 stores media

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Storage architecture

### Decision

Structured metadata, relationships, histories, time, costs, and publications live in Supabase PostgreSQL. Image, audio, video, and encrypted metadata-backup bytes live in a private Backblaze B2 bucket.

The browser transfers media directly to or from B2 using short-lived, purpose-specific signed URLs issued by authenticated Supabase Edge Functions.

### Rationale

PostgreSQL provides relational integrity and owner-scoped policies for metadata. B2 provides object storage suited to large media. Direct signed transfer avoids Netlify and Supabase bandwidth, memory, and request-size bottlenecks.

### Consequences

- Database assets contain metadata and storage keys, not media bodies.
- Large files never pass through the Netlify shell or Supabase database/API process.
- B2 credentials remain server-side.
- Media previews and downloads expire and are not durable public URLs.
- Provider replacement would require coordinated metadata, Edge Function, migration, backup, and lifecycle changes.

### Rejected alternatives

- Base64 media in PostgreSQL.
- Supabase or Netlify proxy endpoints carrying large upload bodies.
- Public B2 objects.
- Durable unsigned media URLs.
- Git or localStorage as production media storage.

## DEC-007 — Netlify, Supabase, and B2 are the selected providers; Cloudflare is excluded

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Hosting and provider boundaries

### Decision

The selected architecture uses Netlify for the static React shell, Supabase for authentication/database/Edge Functions, and Backblaze B2 for private object storage. Cloudflare Workers, Pages, D1, and R2 are deliberately excluded from StudioFlow.

### Rationale

StudioFlow must not consume or complicate the Cloudflare account-level allowances and infrastructure used by Habib Hub. The selected providers also preserve a clean split between static hosting, relational metadata, authenticated server operations, and object storage.

### Consequences

- Do not add Wrangler configuration or Cloudflare bindings.
- Cloudflare is not a fallback for upload jobs, storage, analytics, redirects, or hosting.
- Adding or replacing a provider requires owner approval, current pricing/limit research, and an architecture decision that supersedes this entry.

### Rejected alternatives

- R2 merely because it has an S3-compatible interface.
- D1 as a second metadata database.
- Workers as an additional Edge Function runtime.
- Cloudflare Pages as a parallel deployment target.

## DEC-008 — Script and prompt histories are immutable

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Production memory and data integrity

### Decision

Saved script and prompt versions are append-only. Revisions create new version records. PostgreSQL triggers prevent updating or deleting historical versions in place.

### Rationale

StudioFlow's core value is production memory: knowing which creative inputs produced each result. Mutable history would destroy provenance and make previous production decisions impossible to reconstruct.

### Consequences

- Editors use working drafts before saving a version.
- Corrections to a saved version create another version rather than rewriting history.
- UI convenience must not bypass database immutability.
- Import and migration procedures must preserve version ordering and identity.

### Rejected alternatives

- Keeping only the latest script or prompt.
- Editing old versions in place.
- Deleting inconvenient history during cleanup.

## DEC-009 — Stored data changes are backward compatible and non-destructive

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Compatibility and migrations

### Decision

Schema, domain-model, export, and import changes must preserve existing stored data or provide an explicit migration or normalization path. Unknown record fields should survive validation and import when they do not violate security or integrity rules. Applied production migrations are never silently rewritten.

### Rationale

The creative library becomes more valuable over time. A feature change must not strand or erase prior stories, history, media links, costs, or exports.

### Consequences

- Prefer additive migrations and staged field transitions.
- Validate import envelopes while allowing compatible record evolution.
- Regenerate database types after verified schema changes.
- Destructive cleanup requires a backup, a tested migration, and explicit owner approval.
- Removal of a field or table requires a documented compatibility plan.

### Rejected alternatives

- Resetting the database because the application is still young.
- Replacing migration history after it has been applied.
- Dropping unknown imported fields without review.
- Requiring manual dashboard repair after ordinary upgrades.

## DEC-010 — Media safety uses quotas, lifecycle cleanup, and staged deletion

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Media safety and cost control

### Decision

StudioFlow enforces a 2 GB maximum per file, warns at 8 GB, and blocks new uploads above the 9 GB safety cap. Active and trashed current media count toward usage. Unfinished multipart uploads are cancelled after three days; hidden prior B2 versions are removed after one day. Current owner media is never automatically deleted, and permanent deletion requires trash first.

### Rationale

The project must preserve headroom below the selected storage allowance, prevent abandoned multipart objects from accumulating, and protect creative assets from accidental irreversible deletion.

### Consequences

- Client validation is backed by server/database enforcement.
- Trash is a recoverable state, not a quota bypass.
- Lifecycle rules may clean provider-created hidden versions and unfinished multipart uploads, but not current user assets.
- Raising limits or enabling overages requires explicit cost review and approval.

### Rejected alternatives

- Unlimited uploads with billing surprises handled later.
- Excluding trash from quota calculations.
- Automatic deletion of the oldest current media.
- One-click permanent deletion without a trash step.

## DEC-011 — Mobile and iPad are first-class, with phone-focused scope

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Product experience

### Decision

StudioFlow supports desktop, iPad landscape, iPad portrait, and a 390 x 844 phone viewport. iPad receives the complete workspace. Phone design prioritizes quick capture and essential review rather than compressing every desktop tool into a small screen.

### Rationale

The owner creates and reviews work across desktop and iPad and needs immediate idea capture from a phone. A nominally responsive desktop layout would not provide a reliable production workflow.

### Consequences

- Responsive behavior and touch targets are tested, not assumed.
- Controls remain congruent and layouts avoid large uneven gaps.
- Phone-specific scope may intentionally omit complex editing surfaces.
- New primary workflows must be reviewed at all supported viewports.

### Rejected alternatives

- Desktop-only production core.
- Treating mobile as a scaled-down afterthought.
- Building the full future timeline editor for phone before the desktop editor exists.

## DEC-012 — Production core records provenance but does not execute AI or social workflows

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Feature scope

### Decision

The production core records providers, models, prompt versions, references, costs, durations, results, review decisions, and publication links. It does not call AI-generation providers, automatically post to social networks, import performance analytics, or provide a multi-track editor.

### Rationale

The initial goal is to establish reliable production memory and workflow before adding expensive, failure-prone, provider-specific automation. Provenance remains valuable even when generation occurs in external tools.

### Consequences

- Provider names and models are metadata, not active integrations.
- No API-key workflow is required for production-core generation records.
- Later AI, editor, posting, or analytics phases require explicit checkpoints and architecture review.
- Production-core interfaces must not imply that these later capabilities already run automatically.

### Rejected alternatives

- Adding one provider-specific generator before a provider-neutral adapter design.
- Automatic posting bundled into publication records.
- Building the full editor before the production workflow is trialed.
- Advertising roadmap capabilities as current behavior.

## DEC-013 — Deployment and paid-service promotion are manual approval gates

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Deployment and cost control

### Decision

CI validates code but never deploys production. Branch previews, provider configuration, secret changes, paid services, overages, production promotion, and custom domains require explicit owner approval at the relevant gate. Preview approval does not authorize production.

### Rationale

Local implementation, external configuration, preview review, and production release have different risk and cost profiles. Combining them would allow a coding task to create public or billable state without informed approval.

### Consequences

- A successful build is not a deployment.
- Production release follows `docs/PRODUCTION-RELEASE.md` and includes signed-out, non-owner, owner, media-access, and URL-expiry checks.
- No workflow may automatically promote `main` to production.
- Live status is reported only after the exact protected URL is verified.

### Rejected alternatives

- Continuous production deployment on every merge.
- Treating “implement,” “finish,” or “test” as deployment authorization.
- Enabling automatic paid overages for convenience.
- Declaring a site live because a hosting build succeeded.

## DEC-014 — The repository intentionally has no license for now

- **Status:** Accepted
- **Recorded:** 2026-09-01
- **Area:** Repository policy

### Decision

Do not add an open-source or commercial license until the owner makes a separate decision about StudioFlow's future product direction. Default copyright remains intentional.

### Rationale

The repository may document a learning journey while the long-term product and distribution model remain unsettled. Adding a license prematurely grants rights that may not match that future direction.

### Consequences

- Dependency licenses must still be respected.
- Public visibility does not mean the project is open source.
- Adding a license requires explicit owner approval and a new decision entry.

### Rejected alternatives

- Automatically adding MIT because it is common for GitHub projects.
- Assuming public repository visibility grants reuse rights.

## DEC-015 — Failed cloud metadata writes retry once and roll back safely

- **Status:** Accepted
- **Recorded:** 2026-09-02
- **Area:** Client persistence and recovery

### Decision

Ordinary optimistic metadata writes retry once after a remote failure. If the second attempt also fails, StudioFlow removes or restores only the still-current optimistic record and presents an explicit failure notice. A rollback is guarded by record identity so it cannot overwrite a newer local edit.

Private metadata restore persists records before replacing the current workspace. A failed restore stops, reports the error, and attempts to reload remote state.

### Rationale

Leaving a rejected record visible makes the browser and PostgreSQL disagree. Blind rollback is also unsafe because a slow older failure could erase a newer owner edit. One retry handles brief interruptions; guarded rollback restores truthful state without adding a second persistence system.

### Consequences

- Pages keep synchronous commands and do not implement their own retry logic.
- `cloud-save.ts` owns retry and guarded rollback behavior.
- Remote constraints and RLS remain authoritative.
- Upload-task rehydration after a full browser restart remains a separate future improvement.
- Live failure behavior still requires verification after Supabase configuration.

### Rejected alternatives

- Leaving failed optimistic changes visible indefinitely.
- Retrying forever without telling the owner.
- Rolling back by record ID and overwriting a newer edit.
- Adding an unrelated offline database or background-sync service.

## DEC-016 — Explicit asset links are canonical for generation results

- **Status:** Accepted
- **Recorded:** 2026-09-02
- **Area:** Provenance and compatibility

### Decision

An `asset_links` record targeting a generation is the canonical relationship between result media and a generation attempt. The existing `generation_records.asset_ids` array remains as a backward-compatible projection for stored workspaces and exports. Browser commands update both views together, and PostgreSQL triggers synchronize them in either direction while rejecting duplicate and cross-project result references.

### Rationale

The explicit link system already represents media relationships consistently across projects, episodes, shots, entities, and generations. Keeping a second independently authoritative relationship would allow the same generation to show different results depending on which screen or export path was used.

### Consequences

- Generation result controls use the existing asset-link persistence path.
- Existing exports containing only generation result arrays remain readable.
- Private restore writes generation records before generation-targeted asset links.
- Permanent media deletion continues to remove both explicit and compatible embedded references.
- Database trigger verification remains pending until Docker/Supabase is available.

### Rejected alternatives

- Treating `asset_ids` and `asset_links` as unrelated sources of truth.
- Removing the result array destructively from existing records and exports.
- Allowing result media from a different project because the owner happens to be the same.

## Frequently re-proposed ideas that remain rejected

Future agents should not reopen these suggestions without new constraints or explicit owner direction:

| Suggestion | Existing decision |
| --- | --- |
| “Turn it into a SaaS now.” | DEC-001 |
| “Put a sample of the real creative library in the public repo.” | DEC-002 |
| “The route guard is enough security.” | DEC-003 |
| “Use localStorage for the real workspace.” | DEC-004 |
| “Add another global store and sync it later.” | DEC-005 |
| “Store video in PostgreSQL or proxy it through the app.” | DEC-006 |
| “Use Cloudflare because the account already exists.” | DEC-007 |
| “Make history editable; it is easier.” | DEC-008 |
| “Reset the database instead of migrating old data.” | DEC-009 |
| “Delete old media automatically when storage fills.” | DEC-010 |
| “We can fix mobile after desktop is finished.” | DEC-011 |
| “Add an AI provider, editor, posting, or analytics while touching nearby code.” | DEC-012 |
| “Deploy automatically after tests pass.” | DEC-013 |
| “Add MIT by default.” | DEC-014 |
| “Leave failed cloud saves visible and let the next refresh fix them.” | DEC-015 |
| “Keep generation result arrays and asset links independently editable.” | DEC-016 |

## When to update this document

Update `docs/DECISIONS.md` whenever a durable choice is made that future developers should understand rather than rediscover. Good triggers include:

- selecting or replacing a technology, provider, persistence model, or ownership boundary
- accepting a lasting privacy, compatibility, or deployment constraint
- deliberately excluding a recurring product or architecture proposal
- superseding an existing accepted decision

Do not use this file as a feature backlog, bug tracker, implementation diary, release log, or collection of minor interface preferences.
