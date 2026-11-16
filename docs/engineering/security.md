# Credential handling and the local secret gate

Run `pnpm check:secrets` (or `node scripts/check-secrets.mjs`) before sharing a change. The scanner uses only Node built-ins and local Git; it does not contact providers or validate credentials. Run its regression tests with `node --test scripts/check-secrets.test.mjs`.

## Scope and output

The scanner enumerates paths in the Git index and reads their **current working-tree contents**, including unstaged edits and newly staged files. It never recursively discovers files and never opens ignored or untracked `.env` files. A tracked `.env` or `.env.*` path is rejected without reading its contents. Only `.env.example` is permitted, and its contents are still scanned. Use obvious placeholders such as `your_anthropic_api_key`; do not put realistic-looking fake keys into examples.

Displayed findings contain only a repository-relative path, a one-based line number, and a rule ID. They never contain the matched credential, source excerpt, or raw Git/filesystem error. Credential-shaped values in displayed filenames are replaced with `[REDACTED]` using the same rules; filenames are then JSON-quoted so control characters cannot add terminal lines. Internal scan results retain the actual path for locating the file, so callers must use `formatFinding` when displaying a result. For a blocked filename or a scan error, line 1 identifies the whole-file finding. Exit codes are 0 for no findings, 1 for findings or incomplete file reads, and 2 when the Git working tree cannot be enumerated.

Patterns cover recognizable Anthropic/OpenAI keys, GitHub tokens, Slack tokens, Stripe secret/restricted keys, Google API keys, AWS access-key IDs and explicitly named AWS secret-key assignments, and PEM/OpenSSH private-key headers. An AWS access-key ID alone is not the secret half of an AWS credential; its presence still warrants checking for an accidentally committed credential pair. Only a small set of unmistakable demonstration values is exempted, including repeated `x`/`0` bodies and canonical AWS documentation examples.

## Limits

This is a finite pattern gate, not a guarantee that a repository contains no secrets. It does not detect every provider, arbitrary passwords, generic bearer tokens, encrypted/encoded credentials, or credentials split across strings or files. It does not establish whether a matching credential is valid, revoked, or exploitable. It does not inspect Git history or the staged blob separately from the working tree: check what is staged before committing, and run the gate again on the actual checked-out commit in CI.

Symlinks and paths through symlinked directories are skipped to avoid opening local/ignored files through a tracked alias. Binary files containing NUL bytes, deleted working-tree files, and Git submodule directories are also skipped and counted. Archives, images, native build artifacts, and submodule contents need separate review; the scanner does not decompress or inspect them. Non-UTF-8 text that is not recognized as binary fails the gate as unreadable. Files larger than 8 MiB fail the gate rather than silently receiving partial inspection. Read errors and files changing during inspection also fail the gate. The scanner has no blanket path allowlist or inline suppression mechanism for source secrets.

Because file enumeration is index-based, newly created files must be staged before this gate will include them. A clean result does not approve an ignored local file for upload. Never paste credentials into reviews, test snapshots, logs, screenshots, retrieval indexes, or issue descriptions. Tests generate dummy token-shaped values at runtime and use disposable local repositories.

## The previously exposed Anthropic credential

The audit found an Anthropic credential-shaped value in the tracked `.env.example`. Replacing that value with a placeholder prevents another copy from the current file. **It does not revoke the credential, remove historical copies, or prove the account is safe.**

The account owner must revoke/rotate the exposed value in Anthropic's account controls, review relevant provider activity, and securely distribute a replacement only to the intended runtime. Do not use this scanner to test the old credential. Review shared repository history, forks, logs and artifacts for historical exposure; coordinate any history rewrite with repository collaborators. Rewriting history is not a substitute for revocation, and this script performs neither action.

Until provider-side rotation is confirmed, treat that incident as unresolved. The scanner's success means only that its current-file rules did not find another match in the files it could examine.

## Broader API security

This gate addresses accidental credential commits only. Authentication, authorization, quotas, SSRF restrictions, upload/request limits, privacy disclosures, and production monitoring remain separate items in the code audit. Keep paid provider credentials server-side and do not expose the development proxy as a production service.
