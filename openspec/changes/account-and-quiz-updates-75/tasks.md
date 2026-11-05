# Tasks

## 1. Account workspace and navigation

- [x] 1.1 Add Profile/updates route parsing and guarded entry callbacks; verify route/deep-link/fallback unit cases and CQ-ACCOUNT-02 active-exam Cancel/Leave/Resume tests.
- [x] 1.2 Build the readonly Google profile and existing local language/theme settings; verify CQ-ACCOUNT-01 missing fields/storage failure, preference persistence and zero new identity/cloud-profile writes, and document device-local scope.
- [x] 1.3 Add Profile/Manage quizzes menu entries and links to current AI Settings/My quizzes; verify CQ-ACCOUNT-02 and CQ-ACCOUNT-03 keyboard/touch focus, auth loading, guest sign-in failure, sign-out and account changes without private-state leakage.

## 2. Reviewed update discovery

- [x] 2.1 Implement a focused update registry/validator and inspect actual recent Git bank diffs before seeding at least one entry; verify CQ-UPDATES-01 dates/kinds/source IDs/canonical links and reject invalid metadata, documenting provenance.
- [x] 2.2 Build the public updates list and Quiz Bank/footer discovery; verify CQ-UPDATES-02 newest-first/empty states, guest access, Back/reload and bank navigation with the existing exam guard.
- [x] 2.3 Inspect all affected routes/menu states in the UI matrix, preserving left alignment, 44px targets and readable long labels; update the design matrix with rendered evidence and guidance decisions.

## 3. Integrate and release

- [x] 3.1 Run yarn verify/E2E, review and secret-scan, open one #75 feature PR and record latest-head CI and actual acceptance results.
- [ ] 3.2 After owner-requested merge, verify master CI/deploy and public/Profile/Manage entry smoke under the permitted account scope; close #75 only after its combined scope is accepted.

## Workflow follow-up

- Add History navigation through #80 only when that release gate is ready; sync/archive after feature acceptance.
