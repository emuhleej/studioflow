# Ten-week build and learning rhythm

Each week follows the same loop: complete one vertical feature slice, walk through how it works, make one meaningful owner-coded modification, review it, then refactor.

| Week | Slice | Repository state |
| --- | --- | --- |
| 1 | Repository, tools, CI, templates, secret scanning | Implemented; Docker deliberately skipped on the current desktop, with hosted Supabase plus CI selected instead |
| 2 | Responsive shell, Creator HQ, auth gate, fictional demo | Implemented |
| 3 | Schema, RLS, seed strategy, projects and series | Implemented |
| 4 | Character, location, prop, and style memory | Implemented |
| 5 | Episode stages, immutable scripts, scenes, shots, sitcom template | Implemented |
| 6 | Private/resumable media lifecycle | Steps 6A–6D implemented; private B2 upload, preview/download, trash/restore, multipart pause/resume, provider cancellation, and cleanup live-verified; isolated pgTAP passed in CI |
| 7 | Prompt and generation provenance | Milestones 7A–7D implemented and application-tested; hosted generation migrations are applied; isolated pgTAP passed in CI; live AI-provider execution remains later scope |
| 8 | Time, cost, publication records, and dashboard totals | Implemented |
| 9 | Real episode trial and device polish | Account-free fictional rehearsal and browser-size polish complete; private owner episode and physical-device review remain pending configured services/devices |
| 10 | Export, encrypted backup, restore guide, quota, logging, release review | 10A–10E complete; 10F auth stabilization, private preview deployment, route/console review, and all supported responsive checks pass. Production auto-publish locking, a fresh preview login cycle, and a tiny preview-origin media lifecycle check remain; production approval is separate |

Budget 6–10 hours for each learning week. A repository feature being present is not a substitute for the walkthrough and owner-coded modification.

On the current desktop, application verification runs locally while hosted Supabase handles reviewed schema application, type generation, and advisor checks. GitHub Actions retains the isolated pgTAP database-security gate.
