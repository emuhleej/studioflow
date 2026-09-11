# Backup and restore

## What is backed up

The `metadata-backup` Edge Function reads every owner-scoped production record, including asset links, managed generation inputs, append-only lifecycle events, generation budget settings, and generation-linked costs, packages an import-compatible version 2 `workspace` plus upload-session infrastructure metadata, encrypts it with AES-256-GCM, and writes it to the private B2 bucket. Media objects remain in place and are referenced by their storage keys. Provider credentials, signed reference URLs, and temporary provider output URLs are never part of the backup model.

The encrypted envelope is:

```text
12-byte random nonce | ciphertext | 16-byte authentication tag
```

The key is never stored with the backup.

The Settings **Rehearse B2 restore** action calls `metadata-restore`. That function authenticates the singleton owner, selects only the latest completed backup row for the same owner, verifies its private B2 prefix and bounded ciphertext size, and decrypts it with the server-held key. The browser cannot supply workspace records or a storage key. The rehearsal checks existing IDs first, inserts only missing rows, never deletes or overwrites records, and forces generation settings off.

## Download and decrypt a backup

1. Download the `.json.aesgcm` object from the authenticated B2 console.
2. Retrieve `BACKUP_ENCRYPTION_KEY` from the password manager.
3. In PowerShell, set the key only for the current process and decrypt:

   ```powershell
   $env:BACKUP_ENCRYPTION_KEY = Read-Host "Backup key"
   npm run backup:decrypt -- "C:\path\studioflow-backup.json.aesgcm" "C:\path\studioflow-workspace.json" --workspace
   Remove-Item Env:BACKUP_ENCRYPTION_KEY
   ```

4. Inspect only record counts and representative fictional/test rows. Do not paste real contents into tickets or chat.

## Restore rehearsal

1. Sign in to the private workspace as the configured owner.
2. Select **Back up to B2** and wait for the encrypted version 2 confirmation.
3. Select **Rehearse B2 restore**. The server decrypts the latest owner backup and checks or inserts records non-destructively.
4. Verify project, series, episode, script, prompt, generation, generation-input, generation-event, generation-budget, media metadata, asset-link, time, cost, and publication counts remain correct.
5. Confirm `generation_enabled=false`, no managed job is active, and the reconciliation scheduler is inactive.
6. Generate a private preview URL for one existing media object and confirm it still loads.
7. Confirm a signed-out and a non-owner request cannot read metadata or obtain a media URL.

For a destructive disaster-recovery cutover, still restore into a fresh Supabase test project first and obtain separate approval before replacing production data. The in-place rehearsal is deliberately not a deletion, overwrite, or cutover tool.

Never overwrite the production database as the first restore attempt.

## Verified rehearsal

On 2026-09-02, StudioFlow created an encrypted backup from a fictional one-project workspace with two generated media records. The encrypted object was downloaded from the private bucket, decrypted locally, validated as an import-compatible version 1 workspace, and restored with the same non-destructive upsert ordering used by Settings. Project, asset, and upload-session counts matched after restore. The disposable records, B2 objects, decrypted file, encrypted local copy, and temporary credential transport were then permanently removed.

On 2026-09-10, the hosted backup writer was upgraded to schema version 2 and a new encrypted backup was retained in the private owner prefix. The deployed `metadata-restore` function decrypted and validated that object, checked all version 2 workspace collections plus upload sessions, and completed the in-place rehearsal without deleting or overwriting records. A read-only database check confirmed stable record counts, the completed five-second video and its settled cost/history, disabled generation, zero active managed jobs, and an inactive scheduler. No provider request or Netlify deployment occurred.

Weekly scheduling remains disabled until the owner stores an independent copy of `BACKUP_ENCRYPTION_KEY` in a password manager. The server-side Supabase secret is enough to create backups but is not a substitute for an owner-held disaster-recovery copy.
