# Design

## Context

See [proposal](proposal.md). Exam sessions currently persist the shuffled question snapshot and answers only in sessionStorage. finishExam is the shared terminal transform, while one late-answer branch also ends an expired exam. Profile documents and three custom-quiz slots use Firestore; their current production-policy provenance still needs #79 reconciliation. The owner chose Exam-only history for M1.

## Goals / Non-Goals

**Goals:** durable private exam results, exact historical grading context, bounded list/storage behavior and data-safe retry.

**Non-Goals:** record Practice events, migrate #52 storage, build a leaderboard, backfill old completed tabs, archive AI outputs/keys or introduce automatic retention deletion.

## Decisions

### 1. Firestore through a dedicated history boundary

Propose examHistoryRepository/store/hook and pure examHistory helpers, with injected storage/clock/service dependencies. ExamMode observes terminal state and requests capture through the hook; components do not call Firebase. App only composes routes. Use explicit owner descendants rather than the profile's general field map:

| Path under users/{uid}           | Purpose                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| examAttempts/{attemptId}         | Immutable small summary, source identity and payload fingerprint            |
| examAttemptSnapshots/{attemptId} | Immutable allowlisted question/answer snapshot, fetched only for review     |
| examHistoryState/quota           | Bounded count/revision and the attempt/operation coupled to each mutation   |
| examAttemptReceipts/{attemptId}  | Private saved/deleted lifecycle receipt preventing stale-draft resurrection |

This reuses current infrastructure without waiting for Cloudflare migration or expanding the AI Worker into a history API. Separate summary/payload documents keep list and dashboard reads small.

### 2. Stable terminal capture

Add attemptId, startedAt and grading-policy version to newly created exam sessions. Preserve the same ID across resume/refresh, assign an additive ID to resumed legacy active drafts, and never auto-backfill legacy terminal drafts. New-session identity must work in supported production/dev contexts using a shared secure ID helper/fallback rather than a new dependency.

Unify manual submit, timer expiry and late-answer expiry into one terminal snapshot contract. Store final answer completeness/correctness from the shared scorer, the shuffled question/option context, mode, counts, end reason and elapsed time. For expiry use the absolute deadline as the end; for a legacy draft with unknown start time display duration unavailable rather than inventing it. Persist grading-policy version and the original pass result; history is personal learning data, not an official exam credential.

Capture only bank exams or private quizzes explicitly saved to the current owner. Unsaved local uploads retain their existing local-only promise. Account/session ownership is captured before async work; signing in from a guest exam follows the existing reset/setup behavior rather than migrating its draft.

### 3. Atomic idempotency and bounded defaults

Proposed named limits in a focused history-limits module: 50 retained attempts/account, 20 list summaries/page, 100 questions/snapshot and a conservative 750 KiB serialized snapshot envelope. The account cap requires explicit deletion at capacity; no silent pruning.

Create summary, snapshot and quota transition in one online transaction. First check for the same attempt: identical canonical payload succeeds idempotently even at capacity; a different payload conflicts. New creates increment quota once; confirmed deletion atomically removes both archive documents and decrements quota. Rules require the paired transition via getAfter/existsAfter checks, immutable fields and explicit owner/schema/limit constraints; quota cannot be reset or independently deleted. Demonstrate the 49→50 race and forged direct-SDK transitions in the emulator.

Review correction: couple a lifecycle receipt to the same transaction. A saved receipt binds the payload fingerprint; deletion removes summary/snapshot and replaces the receipt with only deleted state and timestamps, dropping the fingerprint. Receipt identity is the random attempt ID, with owner-only get and no client deletion/reset/listing. A stale retry or refreshed terminal draft of a deleted attempt returns a deleted/local-only state and cannot recreate it. Save A → Delete A → retry/refresh A must leave both content documents absent and quota unchanged. The 50 cap bounds retained full attempts; tiny non-content receipts grow with completed/deleted attempts. Disclose that retention trade-off rather than claiming deletion erases its anti-replay marker. No question/answer/AI/key data remains in a deleted receipt.

Use a canonical JSON snapshot string with an allowlisted schema and preserved per-question outcomes, plus a SHA-256 fingerprint shared by its immutable summary and receipt. Bound UTF-8 payload bytes in Rules and the conservative serialized envelope on the client. Read validation checks stored structural/count consistency without regrading under the current policy. Source fingerprints reuse the existing question-fingerprint contract; private creation rechecks current instance/contentVersion inside the transaction. Metadata queries use actual 20-item pages; retained statistics gather the bounded metadata pages without fetching snapshots.

Detailed question/scoring validation stays in pure client/domain helpers; Rules do not pretend to validate every nested answer semantic. The 750 KiB envelope is a conservative client budget; the service still handles platform document-limit rejection honestly. Keep payload fields exempt from unnecessary indexing and merge any required query indexes into the complete production configuration.

### 4. Query, review and deletion semantics

List summaries by endedAt plus attempt ID for stable pagination. Aggregate last/best score and attempt counts from the bounded retained summaries, clearly labelling that scope; do not compute totals from only the visible page. Group bank aliases canonically and private quizzes by instance ID, retaining source version/title at capture. #75 provides the account-workspace entry; propose #/history and #/history/{attemptId} routes.

Historical review renders the archived snapshot read-only, without regrading current content or issuing AI calls. Image URLs remain references: missing images get a useful unavailable state. Saved private-quiz history is an independent archive; make that retention clear when saving/deleting a quiz, label deleted/replaced source content, and provide confirmed history deletion. A reused slot never owns an older instance's history. A new save for a stale private source must fail safely rather than claim the current occupant as its source.

### 5. Failure, account and release state

Online transactions can fail offline. Keep a failed terminal result in the same account's existing tab draft and expose Retry with the same attempt ID. Do not queue unbounded background uploads or silently save an unsaved upload. Logout clears tab/private UI according to the current policy; late results cannot populate another account. Loading/error/empty/full-history states retain Library/Practice access.

The client capture/list entry stays disabled behind one centrally owned public feature setting until compatible new Rules/indexes are published and verified. That setting is rollout control, not authorization. #79 reconciles baseline production evidence; this feature adds its own policy release checklist and emulator scenarios.

Persist capture eligibility and the owner in new/actively resumed sessions. Completed drafts created while history was disabled, guests/unsaved uploads and pre-history completed drafts are not backfilled after enablement. Legacy active drafts get an additive stable ID and unknown start time without resetting deadline/order/answers. One shared finalization transform records endedAt/end reason for manual, timer and late-answer paths.

## Risks / Trade-offs

- More retained snapshots mean storage/read cost → bounded cap, small metadata queries, payload-on-open and explicit deletion; no plan or billing change is implied.
- Deleting a quiz can be confused with deleting archives → disclose independent history retention and expose a direct deletion path; do not cascade silently.
- Rules access-call limits can reject an otherwise valid transaction → keep the mutation to summary/snapshot/quota/receipt and verify the full atomic policy with real client SDK contexts, including private-source revalidation.
- Historical content may outlive a bank asset → freeze text/answers and label unavailable assets/source versions.

## Verification matrix

| Requirement   | Local acceptance evidence                                                                                                                                                     | Release status                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| CQ-HISTORY-01 | Domain source/terminal gates and UI guest/Practice/unsaved-upload zero-write checks passed.                                                                                   | Client default disabled; no production capture. |
| CQ-HISTORY-02 | Stable manual/absolute-deadline/late-answer finalization, legacy restoration, actual React StrictMode, response-loss idempotency and deleted-attempt anti-replay passed.      | Integration/CI and rollout pending.             |
| CQ-HISTORY-03 | Real demo-emulator SDK owner/Bob/guest, orphan/forged quota/receipt/reset, immutable payload/UTF-8 bound and 49→50 concurrency cases passed; metadata pages 20/20/5 verified. | Complete candidate Rules/indexes not published. |
| CQ-HISTORY-04 | All five formats in both modes, stored future-grade replay, changed/deleted/reused source and missing-image review passed without AI.                                         | Designated-account persistence smoke pending.   |
| CQ-HISTORY-05 | Offline/permission/size/quota recovery, same-ID retry, delayed save/read ownership gates and auth transitions passed in domain/store/UI fixtures.                             | Real account rollout pending.                   |
| CQ-HISTORY-06 | Full retained totals, alias/instance grouping, stable pagination, empty/full/error states and delete Cancel/failure/focus passed; responsive matrix inspected.                | Post-merge acceptance pending.                  |

Local evidence: `yarn verify` passed 220 Node tests and production build/isolation; real SDK Rules suite passed 27 cases; History E2E passed 32 cases with no page errors. The full-app run and focused failure diagnoses are recorded in [the maintained contract](../../../docs/exam-history.md). Disposable traces/screenshots remain ignored. UI/IO fixture results are not production acceptance.

The History UI requires #74's dock correction. Recorded local integration used foundation `f3cf76982bded136d640f0af94dd504d02d64ae6` plus History `599a5ec`. Workflow migration #97 replays the unchanged #80 runtime/tests on the original #80 plan so the issue-only MR targets `work/release-m1-20261106`; its source no longer inherits #74. First accept governance MR #99 into develop and synchronize that baseline into the existing release through a checked PR; land #89 there, then update #92 and require current-base CI. Preserve #75's account/menu changes and reconcile #79 policy before enablement. Production acceptance remains after the milestone's develop/production promotion, not merely an issue merge into the release.

## Migration Plan

One #80 feature PR after #75 (with the history entry gated) and the #79 baseline reconciliation. Implement additive schema/Rules locally, run yarn verify, test:rules and E2E, and land a disabled client if policy publication is still pending. Reconcile the current complete production Rules/indexes; publish/verify compatible policy before enabling capture through the verified frontend release. Use a designated account for bounded save/reload/read/delete smoke only when authorized. Roll back the client setting first; preserve archived data and compatible read policies.

## Primary technical references

- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions): retries, atomic writes and offline failure behavior.
- [Rules atomic-state functions](https://firebase.google.com/docs/reference/rules/rules.firestore): projected-document checks for coupled writes/deletes.
- [Firestore limits](https://firebase.google.com/docs/firestore/quotas): document and rule-access constraints; implementation must verify against the current platform.
