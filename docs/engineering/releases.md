# Web artifacts and future deployment

Hosting has not been selected. The release workflow builds a **static frontend artifact**, not a running production service. The AI/import routes are currently Vite development middleware and are absent from this archive. Native packages are not built or released by this workflow.

Every pull request, push to `main`, or manual workflow run for a selected ref performs the secret scan, frozen dependency installation, lint, application/tooling tests and production build before packaging. Actions are pinned by commit, permissions are read-only, and no deployment or AI credentials are supplied. A failed gate prevents artifact upload. PR archives are review artifacts from GitHub's tested merge commit; merging remains a human decision.

The uploaded artifact expires after 14 days and contains `unibalance-web.tar.gz`, `manifest.json`, and `SHA256SUMS`. The manifest records the exact Git commit, toolchain, and SHA-256/size of every built file. The archive contains only `web/` and the manifest; source files and environment files are excluded. Packaging rejects symlinks, hidden files, source maps and common credential filenames. These checks do not prove that arbitrary application code cannot embed a secret. Checksums detect changes; they are not signed provenance attestations.

For a local artifact, use the pinned Node/pnpm versions in a clean checkout, run all CI checks, then `pnpm build && pnpm release:artifact`. The packager requires committed tracked changes and a fresh `release/` directory. It does not build or execute tests itself: its commit field identifies the checkout, not proof that an arbitrary pre-existing local `dist` came from it. CI provides the fresh-checkout/build sequence. To inspect a downloaded artifact:

```sh
shasum -a 256 -c SHA256SUMS
tar -tzf unibalance-web.tar.gz
```

Before adding deployment, select a host and implement the secured production API (authentication, quotas, request limits/timeouts and safe URL egress). Verify browser-to-API workflows, privacy requirements, backup/export and recovery. Configure a protected production environment and a separate least-privilege deployment identity. Promote the reviewed commit/artifact; do not rebuild a floating branch during promotion. Test a rollback to the previous artifact and define who owns incident response.

The live `main-review-and-history` repository ruleset protects the default branch (`main`) with one required approval, dismissal of stale approvals, approval of the latest push, conversation resolution, and blocked deletion/force-push. Its bypass list is empty. These settings were saved and verified during this batch. A different GitHub reviewer must approve; agent review notes do not count as a GitHub approval by another account.

Required status checks are the remaining bootstrap step: after the baseline and workflow PRs are merged in order, add `Quality checks` and `Verify and package web` from GitHub Actions to this ruleset and require the branch to be up to date. They are not enforced yet because the earlier baseline PRs predate the workflows and cannot emit those checks. During bootstrap, reviewers must inspect the final stack's successful runs and rerun checks after retargeting. Do not add a bypass or fake a passing status to solve this sequencing issue. Workflow YAML alone does not enforce merge checks.
