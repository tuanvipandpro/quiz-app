# Tasks

These checkboxes track implementation and rollout for #42. The setup PR left every task open; this implementation marks only tasks backed by actual evidence. Production comparison/deployment remains separate and is not completed merely because local tests pass.

## 1. Contracts and validation

- [x] 1.1 Define custom-quiz identity/envelope, constants and error contracts from D1–D4 (CQ-02, CQ-04, CQ-08, CQ-09); verify instance/version/byte-budget boundaries with unit tests and update the design if defaults change.
- [x] 1.2 Reuse the validator for imports/stored reads (CQ-03); verify valid 1/100 and invalid 0/101 boundaries, duplicate IDs, malformed JSON and all formats with unit tests.
- [x] 1.3 Add serialization-size checks and retry-safe candidates (CQ-04, CQ-05); verify below/above-budget fixtures and server-size rejection without losing the preview.

## 2. Rules and persistence service

- [x] 2.1 Add explicit customQuizzes slot Rules, ownership/field/type/list-count checks and version transitions (CQ-01, CQ-02, CQ-03, CQ-08); verify direct-SDK adversarial cases in the Emulator and preserve every baseline profile test.
- [x] 2.2 Implement transactional creation with a stable operation/instance ID (CQ-02, CQ-05); verify two uploads competing for the final slot, response-loss retries and double submission without overwrite/duplication.
- [x] 2.3 Implement transactional rename/replace/delete (CQ-06, CQ-07, CQ-08); verify stale revisions, deleted/reused slots, cancellation without mutation, replacement preserving quota and deletion releasing quota.
- [x] 2.4 Implement checkpoint updates bound to instance/contentVersion (CQ-07, CQ-09); verify rename preserves progress, replacement resets atomically, deletion removes progress and bank checkpoints remain unchanged.
- [x] 2.5 Add service documentation near the API and review the questions index exemption (CQ-04, CQ-12); verify no out-of-scope index configuration is deployed and record cost/size trade-offs.

## 3. Account state and study integration

- [x] 3.1 Add a custom-quiz hook/store with account/request generations and lazy loading (CQ-01, CQ-11); verify late responses after logout/account switches and private-loading errors that do not block the bank.
- [x] 3.2 Integrate route/loaded identity and draft keys with discriminator/instance/version (CQ-08, CQ-09); verify deep links, reload, stale cache, shuffle/answers/flags/deadline preservation and replacement invalidation.
- [x] 3.3 Preserve guest-local uploads and add an explicit save transition (CQ-12); verify login does not automatically migrate uploads/progress and bank aliases/checkpoints remain unchanged.

## 4. Management UI

- [x] 4.1 Add list/quota and preview-save flows (CQ-02, CQ-03, CQ-10); verify quota 0/3..3/3, loading/empty/success, full quota and every failure state with E2E tests.
- [x] 4.2 Add rename, replace, delete and confirmations (CQ-06, CQ-07, CQ-08, CQ-10); verify Cancel preserves data, conflicts guide reload and errors retain candidates.
- [x] 4.3 Reuse Practice/Exam and capability-appropriate Quick Summary availability (CQ-09); verify formats, resume, submission and missing guides with E2E tests.
- [x] 4.4 Review UI against AGENTS.md (CQ-10): 320/390/412/768/1280px, VN/EN, light/dark, focus/safe-area/long text; retain screenshots and distinguish emulation from real devices.

## 5. Acceptance and rollout

- [x] 5.1 Run the full CQ-01..CQ-12 acceptance matrix and `yarn verify:all`, review scope and update verification.md with actual evidence; do not treat planningComplete as feature-completion evidence.
- [ ] 5.2 Compare published Rules/indexes and inspect drift against the supplied baseline (CQ-01, CQ-12); record verified source/hash/revision before rollout.
- [ ] 5.3 Prepare release/rollback and perform owner-directed rollout (CQ-01, CQ-12); verify compatible Rules are effective before enabling the client and record actual production status.

## Workflow follow-up

- Archive the change and sync main specs only after implementation/evidence review and explicit rollout status.
- Close issue #42 only when acceptance criteria are actually met; the setup PR does not close it.
