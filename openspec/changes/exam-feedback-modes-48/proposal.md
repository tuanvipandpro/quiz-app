# Proposal

## Why

[Issue #48](https://github.com/tuanvipandpro/quiz-app/issues/48) requires two Mock exam experiences: a standard exam that reveals answers only at completion, and an exam with per-question feedback for learning while answering. ExamMode currently enables feedback only after submission; Practice already has suitable renderers and validators to reuse.

## What Changes

- Add Standard exam (default) / Learning exam selection to exam setup, with VN/EN descriptions.
- Learning shows feedback when an answer is complete; answers remain editable before submission, while timer/randomization/flags are preserved and grading uses final answers.
- Store the mode in the draft and show it during the exam and in results. Resume retains saved settings; changing mode requires starting a new exam.
- Treat legacy drafts/URLs as Standard while preserving account/quiz isolation.
- Verify question formats, responsive layouts, themes/languages, resume, submission and expiry.

## Capabilities

### New Capabilities

- `exam-feedback`: select, communicate and preserve the Mock exam answer-visibility policy.

### Modified Capabilities

No existing capability changes. `user-profile-access` is outside this change.

## Impact

Affects QuizMode, ExamMode, App orchestration, session helpers, translations and study styles; reuses Question/StructuredQuestion. Adds no dependencies, Firebase Rules changes, bank/checkpoint changes or #42 implementation. OpenSpec/Emulator bootstrapping was completed in #47; this change implements feature #48 in one PR, merged only when requested. It does not expand AI Explain or add anti-cheating features.
