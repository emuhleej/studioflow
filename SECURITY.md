# Security policy

Please report a vulnerability through GitHub's private vulnerability-reporting feature rather than a public issue.

Never include real StudioFlow prompts, scripts, media URLs, OAuth callback URLs, access tokens, UUIDs, provider credentials, or temporary signed preview URLs in a report. A fictional reproduction is preferred.

The current security model is documented in [docs/SECURITY.md](docs/SECURITY.md). Generated-video transfer uses bounded sequential parts and sanitized failures. Encrypted restore accepts no caller-supplied records, reads only the current owner's private backup, preserves existing rows, and keeps generation disabled. This repository contains no production secrets or user data.
