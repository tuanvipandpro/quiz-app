# Design

## Context

See proposal.md and the capability delta for goals. MyQuizzes currently keeps one upload in sessionStorage; App uses ID `custom`, and bank checkpoints live in `users/{uid}.quizProgress`. The validator supports multiple choice, yes/no and dropdown rows/inline. Browser tests currently replace auth/profile services and do not establish real Rules enforcement.

The user-supplied baseline is preserved in `firebase/baseline/firestore.rules` with its original hash checked. It permits only the owning UID's profile and grants no customQuizzes access. `firebase/firestore.rules` is the feature's candidate policy, not evidence of deployment. The baseline was supplied by the user as the published policy, not exported through the management API.

## Goals / Non-Goals

**Goals:** isolate personal content, enforce quota through Rules, prevent concurrent/stale-tab writes, preserve progress identity/version and reuse study UI.

**Non-Goals:** change bank checkpoint structure, add public sharing/an editor, or introduce a backend server when client transactions and Rules meet the stated requirements. Setup neither deploys nor enables the feature.

## Decisions

### D1 — Three fixed slot documents

Store content at `users/{uid}/customQuizzes/slot-1|slot-2|slot-3`. Rules allowlist the three IDs and check `request.auth.uid == uid`. Quota is the count of occupied slots. Share constants/contracts in the app; Rules carry the corresponding list, with Emulator tests enforcing consistency.

Compared with a profile counter, fixed slots avoid counter drift and leave the profile containing keys/bank checkpoints untouched. Arbitrary document IDs with UI-only counting do not satisfy CQ-02. Separate content prevents the profile document from growing with quiz data.

### D2 — Instance, revision and content version

Proposed envelope: `instanceId`, `title`, `questions`, `questionCount`, `contentVersion`, `revision`, `createdAt`, `updatedAt`, `checkpoint`.

- `instanceId`: UUID generated before the transaction, new whenever a quiz is created in a slot; rename/replace do not change it.
- `revision`: increments on each metadata/content mutation to detect stale edits.
- `contentVersion`: increments when questions change; rename preserves it.
- `checkpoint`: null or `{ instanceId, contentVersion, questionId, questionIndex, savedAt }`, stored in the same document so replacement/deletion resets progress atomically.

Reusing a slot creates a new UUID and null checkpoint. A slot ID alone is not quiz identity. Co-locating the checkpoint reduces orphan risk; the trade-off is that checkpoint transactions read a document containing questions. A maximum of three quizzes and loading only on My quizzes/deep links bound costs.

### D3 — Transactions and operation identity

The create transaction reads three slots, returns an existing instance for the same operation/instance ID on retry, or writes an empty slot. Do not generate the UUID inside the transaction callback. Different candidates competing for the last slot must follow Firestore retries, with one receiving quota/conflict.

If the same operation ID has different title/content from its previous commit, the service returns conflict rather than claiming the new content was saved. A candidate retains its UUID across errors/retries; selecting a new file creates a new operation.

Rename/replace/delete receive expected instanceId + revision, read the slot in a transaction and compare before mutation. Checkpoint saves compare instanceId + contentVersion so rename preserves progress. Rules keep instanceId immutable on update and validate fields/types/version transitions; transaction read preconditions protect stale deletes. Owner deletion through the SDK is intentional authority, not a mechanism preventing malicious owners from deleting their own data.

### D4 — Validation and size budget

Reuse the validator on parse and stored reads. Rules enforce allowed fields, slots, ownership, a questions-list length of 1–100 and questionCount equal to list size; do not assume Rules traverse and understand every nested question format.

Proposed technical defaults: `MAX_CUSTOM_QUIZ_BYTES = 750 * 1024` for the full save candidate's UTF-8 JSON, with a trimmed title of at most 160 characters. This is a conservative budget, not exact Firestore sizing. Verify boundaries in the Emulator and handle server size rejection while retaining the preview for retry. The existing raw-file limit does not replace document-size validation.

### D5 — State and integration boundaries

Add a custom-quiz service and hook/store with account/request generations like quizProgressStore. Components receive only state/actions. Cache by UID + instanceId + contentVersion; cancel/discard old requests on account changes. Load custom documents only on My quizzes or custom deep links; bank routes do not depend on these requests.

Route/loaded-quiz identity needs `bank`, `tab-upload` and `cloud-custom` discriminators with slot/instance mapping; draft keys include UID, instanceId, contentVersion and mode. Check the slot's instance/version before mounting study. Preserve existing bank endpoints/IDs. Do not write cloud-custom checkpoints into the bank checkpoint map.

Cloud routes use `cloud:<slotId>:<instanceId>` with `version` in the query. Links lacking a version are canonicalized against the server version before mounting study. The hook loads only on personal routes, uses server reads and a listener that ignores cached snapshots, drops old responses by UID/request generation and refreshes when the tab regains focus. Another tab's mutation invalidates the matching instance's draft; metadata-only rename does not reset it.

Rename updates only title/revision. Replacement atomically writes questions/count, increments revision/contentVersion and sets checkpoint to null; the old local draft is invalidated by version. Deletion removes the checkpoint and clears cache/drafts for that instance. Other tabs recheck slot/version before saving/resuming instead of trusting stale snapshots.

### D6 — Mobile workflow

Guests retain tab-local upload/practice; the cloud-save CTA requires sign-in and explicit saving. Login does not automatically migrate guest uploads/drafts. Owners see quota, at most three quizzes and preview before save. At capacity, offer replace/delete without silent overwrite. Replacement/deletion confirmations explain progress loss; save errors retain the candidate. Follow AGENTS.md UI/UX criteria and the required widths/languages/themes.

### D7 — Verification and release

Setup verifies baseline owner profile, guest, cross-account and descendant access. The feature PR adds unit/service tests for validation/idempotency/version, Emulator tests for CQ-01..08 and E2E tests for CQ-09..12. verification.md distinguishes setup evidence from feature evidence not yet available.

Do not archive the change or close #42 merely because artifact validation passes. OpenSpec validation checks structure, not feature correctness.

## Risks / Trade-offs

- [Production Rules changed after the snapshot] → compare the latest published policy before rollout; preserve the profile contract and inspect recursive allow rules that could bypass new restrictions.
- [Many question fields exceed server size despite JSON fitting the budget] → test boundaries, use a conservative budget and handle server errors; do not report save success before commit.
- [Listing reads question content] → read at most three documents on demand; do not prefetch from Quiz Bank. A future metadata-only design needs its own synchronized contract.
- [Index configuration has not been exported] → review current indexes before adding the `questions` exemption; do not deploy empty indexes that remove unrelated configuration.
- [Offline tab retains stale data] → provide explicit conflict/reload and versioned drafts; do not queue mutations that may silently overwrite.

## Migration Plan

1. Merge the setup PR after artifact/baseline-test review; do not enable cloud quizzes yet.
2. Implement the complete feature in a PR with tests/evidence; re-read production Rules/indexes to check drift.
3. After feature review/verification and rollout instructions, deploy compatible Rules first; verify they are effective before merging/enabling the client UI.
4. Do not automatically migrate local uploads or bank checkpoints. Owners explicitly save local candidates.
5. For rollback, disable/revert the cloud UI while preserving private data; check active-client compatibility before reverting Rules. Do not delete quizzes as rollback.

## Open Questions

No core product decision remains unspecified. The deployment operator and rollout time will be chosen after the feature PR has evidence. The 750 KiB budget is a technical default to verify through implementation boundary tests, not a change to the 3/100 quota.
