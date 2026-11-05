# Proposal

## Why

The account dropdown currently offers AI Settings and Sign out; learners lack a profile overview and a discoverable record of bank additions/updates. Tracking: [#75](https://github.com/tuanvipandpro/quiz-app/issues/75); coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87).

## What Changes

- Add an authenticated Profile route showing Google identity and QuizMos settings, as selected by the owner.
- Add Profile and Manage quizzes menu entries, reusing My quizzes and the existing guarded navigation.
- Add a public quiz-update view with reviewed dates, change kind, summary, source revision and bank links.
- Proposed MVP: language/theme settings retain existing device-local persistence; AI settings keep their current service boundary. Google identity is read-only. History navigation can be added by #80 without blocking this feature.

## Capabilities

### New Capabilities

- `account-workspace`: profile/settings entry and account navigation.
- `quiz-updates`: reviewed public catalog-change discovery.

### Modified Capabilities

None. The baseline user-profile-access policy remains unchanged: no new cloud profile fields or Google identity mutation are introduced by this MVP.

## Impact

Feature, medium UI/navigation risk. Owners: AccountMenu, AppHeader/App routing, navigation utilities, preferences, translations and a dedicated update registry/page. Keep App.jsx as route orchestration. Existing My quizzes owns private CRUD and its errors. Initial update entries must be reviewed from actual bank changes in Git, not UI builds. One feature PR; no migration, sharing, notification delivery or new dependency.
