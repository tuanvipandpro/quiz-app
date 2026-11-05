# Tasks

## 1. Reproduce and correct the lifetime

- [x] 1.1 Add the real-app route/resize regression and a delayed observer delivery case; demonstrate CQ-DOCK-01 fails on the old component with an uncaught page error or stale CSS write.
- [x] 1.2 Implement the bounded measurement/teardown correction in StudyNavigation; verify old callbacks are inert after unmount and after a replacement dock mounts, and keep the regression with the fix.

## 2. Verify reachable controls and delivery

- [x] 2.1 Verify CQ-DOCK-02 through the existing UI matrix, timer submit/remove, reduced motion and focus checks; retain relevant rendered evidence and update the design matrix with actual results.
- [x] 2.2 Run yarn verify and relevant E2E; review/secret-scan outgoing changes, open one #74 PR and wait for latest-head required CI, recording its links/results in the issue.
- [ ] 2.3 After owner-requested merge, verify master CI/deploy and error-free Practice/Exam → Summary/Library smoke on production before closing #74.

## Workflow follow-up

- Sync/archive only after actual feature acceptance; planning completion does not complete these tasks.
