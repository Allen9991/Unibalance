# Coordinated remediation plan

Scope approved for this batch: engineering workflow, local evidence retrieval for coding agents, CI/release artifacts, and critical credential/dependency/data-loss issues. Hosting selection, production deployment and the remaining product defects are deferred. No agent system can guarantee zero hallucinations.

## Change contracts and ownership

| PR unit | Owner and boundary | Required behavior / acceptance |
|---|---|---|
| Repository baseline | Coordinator; reviewed tracked snapshot | Align the older remote prototype with the audited root layout. Preserve remote history, exclude local credentials, personal files and generated builds. Do not publish the local commit history containing the credential. |
| Data preservation | Data-integrity implementer; persistence module/tests | Repeated browser/native-style saves and v0/v1/v2 hydration retain real courses and all related records. Storage failure preserves the prior store. No schema/API changes. Regression cases must fail on the original code. |
| Secret guardrail | Security implementer; scanner/tests/security guide | Scan tracked working files only, reject tracked env credentials and recognized key formats, redact findings, exclude ignored personal data. Credential revocation remains an external action. |
| Agent grounding | Knowledge/QA implementer; retrieval/tests/roles/docs | Return fresh local code citations/hashes from an explicit corpus, reject stale evidence and unsafe paths, return `no_evidence` on misses. No external indexing service. |
| CI/toolchain | Platform implementer; package/lock/lint/workflows | Frozen install with pinned toolchain, corrected pnpm configuration, patched Vite and compatible dependencies, correctness lint and application/tooling/secret gates. No PR secrets or write token. |
| Web artifacts | Coordinator; packager/tests/release workflow/docs | Rerun gates, archive only build output with exact commit/file hashes, reject unsafe artifacts, never deploy. |

The implementer does not supply their own independent review. Reviewers inspect the final diff, run relevant checks and return specific findings; the coordinator reconciles them before handoff. Keep the PRs separate and merge in their documented dependency order. A PR with an unmerged prerequisite is not an independent release candidate. Re-run required checks after retargeting or rebasing onto `main`.

## Audit backlog

IDs refer to the 15 November 2026 code audit. “Implemented” below describes this proposed batch, not a merged production fix. The full audit evidence remains the review's report; this table is the execution tracker.

| ID / severity | Problem | Status and next verification |
|---|---|---|
| C01 Critical | Credential in tracked example | Placeholder and scanner implemented. Owner must revoke/rotate the old credential and review usage; local history still requires remediation before any history push. |
| C02 Critical | Save/migration deletes real courses | Implemented; repeated sync/async save and legacy migration regressions. Already-deleted data cannot be reconstructed. |
| C03 Critical | Vulnerable network-exposed Vite | Patched locked Vite to 7.3.8; frozen install/build and current advisory comparison. |
| H01 High | Built frontend has no production API | Deferred with hosting. Requires H02–H04 before deployment. Verify built browser to deployed test API. |
| H02 High | No shared-API authentication/quotas | Backend/security next batch. Verify unauthorized, exhausted quota and cross-user cases. |
| H03 High | URL import permits internal targets | Backend/security next batch. Test DNS, redirects and private/link-local egress denials. |
| H04 High | Missing request size/concurrency/time limits | Backend/security next batch. Test bounded streamed input, provider timeout and cancellation. |
| H05 High | Inconsistent best-of grade calculation | Domain next batch. Use one grade contract with golden cases for both consumers. |
| H06 High | Completed and graded work conflated | Domain/UI after H05. Test grade entry, zero, unknown and completed-but-ungraded states. |
| H07 High | Tutorial title edit becomes zero/completed | Reducer next batch. Title-only edit must preserve marks/status. |
| H08 High | Reimport duplicates assessments | Import/reducer next batch. Test repeated import and existing manual edits. |
| H09 High | Failed AI parse invents assessment facts | AI/UI next batch. Failure must not mutate data; require explicit validated confirmation. |
| H10 High | Plans lack real future/deadline dates | Planner next batch. Verify no past/post-deadline blocks and date rollovers. |
| H11 High | Calendar loses fractional times/duration | Calendar next batch. Test 09:30 starts, overlapping and multi-hour events. |
| H12 High | Mobile sidebar leaves unusable content | UI next batch. Browser tests at phone/tablet widths and keyboard navigation. |
| H13 High | Native Capacitor advisory | npm packages refreshed; iOS Swift package remains 8.3.4. Native release blocked pending resolution/sync and device/build validation. |
| M01 Medium | Invalid academic inputs / zero handling | Domain validation after grading contract. Boundary and malformed-output cases. |
| M02 Medium | Invalid records bypass startup recovery | Persistence next batch. Schema validation and safe recoverable backup tests. |
| M03 Medium | ICS timezone/recurrence changed | Calendar import next batch. Explicit supported semantics and fixture matrix. |
| M04 Medium | UTC formatting changes local dates | Shared date utilities next batch. Timezone and DST boundary tests. |
| M05 Medium | Focus resets/counts ticks | Session/UI next batch. Navigation, suspension and elapsed-time tests. |
| M06 Medium | Impossible targets shown as 100% | Grade UI after H05. Unreachable targets must remain explicit. |
| M07 Medium | Friday hard-coded; stale clock data | Dashboard/date next batch. Day rollover/focus return tests. |
| M08 Medium | Lifetime totals labelled weekly | Analytics next batch. Date-window tests and honest empty trend UI. |
| M09 Medium | Block completion not idempotent | Reducer next batch. Repeated completion must not double-log. |
| M10 Medium | Unnamed controls | UI next batch. Accessible names, keyboard and browser accessibility checks. |
| M11 Medium | Concurrent AI submissions race | AI/UI next batch. Duplicate click, response order and cancellation tests. |
| M12 Medium | Invalid native notification IDs | Deferred native. Unique valid Android IDs and replacement/device tests. |
| M13 Medium | Dependency setup unreproducible | Implemented pin/workspace/lock/CI. Verify clean frozen installation. |
| M14 Medium | Main journeys lack meaningful tests | Tooling and persistence tests added; browser journey coverage still deferred. Prioritize create/import/edit/plan/grade/reload. |
| M15 Medium | Bundle/synchronous compute scale | Deferred. Measure current workload before splitting charts or changing algorithms. |
| L01 Low | Zero progress renders nonzero | UI backlog; verify 0/50/100 and accessibility semantics. |
| L02 Low | Revision scheduler is only text | Product backlog; either label planned or generate tested dated passes. |
| L03 Low | Provider/client errors conflated; little logging | Backend with H01–H04. Safe error categories/request IDs without payload logging. |
| L04 Low | Metadata loss, duplicated UI, stale native docs | Maintenance backlog; preserve import fields, share component and validate setup docs. |

Production remains blocked by credential response, the deferred API security and correctness defects, missing end-to-end/accessibility coverage, and untested recovery/operational procedures. CI gates and source-grounded context improve the development process; they do not remove these release conditions.
