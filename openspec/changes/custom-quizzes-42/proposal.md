# Proposal

## Why

[Issue #42](https://github.com/tuanvipandpro/quiz-app/issues/42) requires persistent personal quizzes so users can continue studying on another device. The app currently supports upload/preview, validates 1–100 questions and keeps uploads in the tab; it does not yet persist quizzes in Firestore, enforce a three-quiz quota or manage cloud content.

## What Changes

- Add an account-private quiz list, a 0/3 quota indicator and a save flow after preview.
- Support rename, JSON replacement and deletion with explicit slot, version and progress rules.
- Enforce quota, account isolation and valid counts through Rules; use transactions for concurrent writes and stale tabs.
- Reuse Practice/Exam and the validator, distinguish bank/custom IDs, and preserve local guest uploads; cloud saving requires sign-in and an explicit save action.
- Add requirement-specific service/unit, Emulator and E2E tests.

This is a **feature proposal**, not an implementation in the setup PR. The setup PR adds only OpenSpec, the user-supplied Rules baseline, Emulator runner/tests and CI. It does not deploy Rules, migrate data or automatically save existing uploads to the cloud.

## Capabilities

### New Capabilities

- `custom-quizzes`: ownership, quota, validation, quiz management, identity/progress, mobile experience and error handling.

### Modified Capabilities

The `user-profile-access` contract is unchanged: existing profile/checkpoint permissions must be preserved. Custom-quiz subcollection permissions will be added separately.

## Impact

- Expected changes affect MyQuizzes, App routing/loading, a new custom-quiz service/hook/config and Rules/tests.
- Proposed storage is `users/{uid}/customQuizzes/{slotId}`, separate from the profile containing AI settings.
- Out of scope: public sharing, a question editor, auth-provider changes, Quiz Bank redesign, bank-question edits and study-guide review.
- Merging the setup PR permits planning review; feature tasks and issue #42 closure remain pending. An ordinary feature uses one MR; SDD does not require two MRs for every change.
