# Tasks

## 1. Domain contract and durable identity

- [x] 1.1 Add the focused history model/limits and immutable snapshot validation using the shared scorer; verify CQ-HISTORY-01 and CQ-HISTORY-04 with all formats, source eligibility, unknown legacy duration and archived grade/version cases, and document the schema/retention defaults.
- [x] 1.2 Add stable attempt/start/grading metadata to new sessions and additive active-draft restoration; unify every terminal path and verify CQ-HISTORY-02 with manual submit, expiry, late answers, refresh and StrictMode duplication while preserving old drafts/deadlines.

## 2. Repository and enforced policy

- [x] 2.1 Implement injected summary/snapshot/quota/receipt transactions and deletion; verify CQ-HISTORY-02 and CQ-HISTORY-03 through real demo-emulator SDK tests for idempotency, conflicting payload, lost response, Save/Delete/stale retry, owner/Bob/guest, forged pair/quota/receipt/reset writes and the fiftieth-slot race.
- [x] 2.2 Add explicit descendant Rules and complete-index reconciliation notes, with no profile-access regression; run baseline plus candidate Rules tests and verify snapshot payload rejection/index assumptions against the declared service contract.
- [x] 2.3 Add the account-scoped store/capture hook with disabled-by-default rollout setting; verify CQ-HISTORY-01 and CQ-HISTORY-05 source gating, zero Practice/guest/unsaved-upload writes, same-ID retry and discarded stale account responses in fixtures.

## 3. History and dashboard UI

- [x] 3.1 Build paginated summaries and per-bank retained-history statistics; verify CQ-HISTORY-06 stable order, full retained totals, aliases/instance grouping, empty/error/full states and source-status copy.
- [x] 3.2 Build read-only archived review and confirmed deletion, including the saved-quiz archive-retention disclosure; verify CQ-HISTORY-04 and CQ-HISTORY-06 changed/deleted source, missing images, slot reuse, cancel, failure and complete snapshot removal.
- [x] 3.3 Wire guarded History routes/account entry and result save/retry states; verify CQ-HISTORY-05 and CQ-HISTORY-06 with offline/permission/size/quota failures, active-exam navigation, account switches and the full UI matrix; document user-visible retention/local-only behavior and update the design matrix.

## 4. Integrate and release safely

- [ ] 4.1 Run yarn verify, test:rules and E2E; inspect the disabled-client build for fixture leakage, review/secret-scan one #80 feature PR and wait for latest-head required CI, recording actual acceptance evidence.
- [ ] 4.2 Use #79's reconciled baseline plus the new history policy/index contract; publish/verify compatible policy through the authorized release procedure before enabling history, and record source revisions/rollback rather than deploying a fragment.
- [ ] 4.3 After owner-requested merge/enablement and master CI/deploy, perform bounded designated-account save/reload/read/delete smoke, confirm unrelated bank/custom progress remains compatible and close #80 only after actual rollout acceptance.

## Workflow follow-up

- Sync/archive after feature acceptance. Practice history and M2 revision queues are separate changes using this stable result contract.
