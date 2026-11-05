# Proposal

## Why

Current sessionStorage keeps a tab draft and cloud checkpoints keep positions; there is no durable cross-session result history. The owner selected Exam history first for M1, with Practice retaining its current draft/checkpoint behavior. Tracking: [#80](https://github.com/tuanvipandpro/quiz-app/issues/80); coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87).

## What Changes

- Archive completed/expired Standard and Learning exams for signed-in learners using stable attempt IDs and immutable scored snapshots.
- Add paginated history, read-only historical review, per-bank summary trends and confirmed history deletion.
- Use the existing Firestore stack through a dedicated history service/store, with explicit descendant Rules and emulator tests before cloud enablement.
- Retain failed saves for same-account retry in the tab; guest and unsaved-upload results remain tab-local. Explicitly saved custom quizzes use instance/version-scoped history.
- Proposed bounded defaults: 50 saved attempts/account, 20 summaries/page and a conservative 750 KiB snapshot envelope. A full history prompts explicit deletion rather than silent eviction.

## Capabilities

### New Capabilities

- `exam-history`: immutable attempt storage, ownership/quota, historical review and dashboard/deletion behavior.

### Modified Capabilities

None. Existing profile access and draft/checkpoint contracts remain in force; history descendants require additive explicit authorization.

## Impact

Feature, high persisted-data risk. Owners: studySession/history domain helpers, a dedicated repository/store/hook, history/dashboard pages, ExamMode finalization and routing. Keep Firebase IO out of presentation. #79 supplies baseline rollout provenance; history still requires its own compatible policy/index verification. #52's Cloudflare custom-quiz migration is outside M1 and is not a dependency. One feature PR may land with the client feature disabled until matching Rules are published and verified. No old-tab draft backfill, Practice event logging, AI calls or production writes occur in this planning change.
