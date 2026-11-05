# Tasks

## 1. Separate panel entry from generated requests

- [x] 1.1 Refactor the explanation orchestration contract into reference-only opening and explicit generation; add tests proving CQ-EXPLAIN-01 causes no action-triggered key/profile/usage/inference calls for guest or signed-in readers.
- [x] 1.2 Render included/missing-reference state and the explicit AI action with source labels and current sanitizer; verify CQ-EXPLAIN-04 on long/unsafe Markdown and document the new Explain → Generate AI flow.
- [x] 1.3 Update appAi/byok regressions to request generation explicitly; verify CQ-EXPLAIN-02 retains quota/cache/retry, no-key setup, cancellation and reference readability on failure.

## 2. Preserve mode and interaction boundaries

- [x] 2.1 Verify CQ-EXPLAIN-03 with all formats in active/submitted Standard and Learning exams, question navigation and account changes; add regressions for stale responses and close/reopen focus.
- [x] 2.2 Inspect the phone/desktop, language/theme and reduced-motion matrix, including an already-open off-screen panel; record actual source-label, focus, geometry and error-state evidence in the design matrix.

## 3. Integrate and release

- [x] 3.1 Run yarn verify and relevant E2E, review/secret-scan the diff, open one #77 PR and record latest-head CI with acceptance status.
- [ ] 3.2 After owner-requested merge and master deploy, smoke included-only reading without live inference and verify no setup/quota request is needed; close #77 only with evidence.

## Workflow follow-up

- Sync/archive after acceptance; retain app-ai-worker's independent model-quality/rollout state.
