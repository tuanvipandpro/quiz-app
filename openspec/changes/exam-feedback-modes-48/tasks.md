# Tasks

## 1. Session contract

- [x] 1.1 Add the registry and feedbackMode to session creation/restoration; update caller/test contracts and verify legacy/invalid modes, resumed draft/deadline preservation and account/quiz isolation with Node tests (CQ48-01, CQ48-04, CQ48-05).

## 2. Exam behavior

- [x] 2.1 Add mode selection, navigation configuration, Resume notices, feedback and active/result mode labels; add E2E coverage for both modes, five question formats, edit/submit/expiry and refresh/start-new/account isolation; functional tests must pass (CQ48-01 through CQ48-05).

## 3. Integrated acceptance

- [x] 3.1 Complete responsive/accessibility work and translations; verify 320/390/412/768/1280px, landscape, VN/EN and light/dark, focus/keyboard, before/after evidence and new-control geometry regressions (CQ48-06).
- [x] 3.2 Run yarn verify and yarn test:e2e, review the diff/PR checklist, update the verification matrix and README with actual results; open a PR with evidence/limitations, without merging or archiving (all requirements).

## Workflow follow-up

- Merge when requested; confirm production after deployment, then archive/sync specs and close #48 once acceptance/rollout is explicit.
- Keep #42 and every custom-quizzes-42 task unchanged and pending.
