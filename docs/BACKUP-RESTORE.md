# Backup and restore

## What is backed up

The `metadata-backup` Edge Function reads every owner-scoped production record, including asset links, packages an import-compatible `workspace` plus upload-session infrastructure metadata, encrypts it with AES-256-GCM, and writes it to the private B2 bucket. Media objects remain in place and are referenced by their storage keys.

The encrypted envelope is:

```text
12-byte random nonce | ciphertext | 16-byte authentication tag
```

The key is never stored with the backup.

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

1. Create a fresh Supabase test project and apply the migration.
2. Configure a disposable owner with the same UUID represented in the export, or use the Settings import in the authenticated workspace; Settings normalizes each imported `ownerId` to the currently signed-in owner.
3. Import `studioflow-workspace.json` through Settings.
4. Verify project, series, episode, script, prompt, media metadata, asset-link, time, cost, and publication counts.
5. Generate a private preview URL for one test media object and confirm it loads.
6. Confirm a signed-out and a non-owner request cannot read metadata or obtain a media URL.
7. Record the rehearsal date and delete the disposable project.

Never overwrite the production database as the first restore attempt.

## Verified rehearsal

On 2026-09-02, StudioFlow created an encrypted backup from a fictional one-project workspace with two generated media records. The encrypted object was downloaded from the private bucket, decrypted locally, validated as an import-compatible version 1 workspace, and restored with the same non-destructive upsert ordering used by Settings. Project, asset, and upload-session counts matched after restore. The generated database records, B2 objects, decrypted file, encrypted local copy, and temporary credential transport were then permanently removed; the dedicated bucket returned to zero file versions.

Weekly scheduling remains disabled until the owner stores an independent copy of `BACKUP_ENCRYPTION_KEY` in a password manager. The server-side Supabase secret is enough to create backups but is not a substitute for an owner-held disaster-recovery copy.
