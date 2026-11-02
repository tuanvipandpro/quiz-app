# Design

## Context

See proposal.md. QuizMode owns local configuration; App passes settings through the URL; useStudySession restores one exam draft per account/quiz. Question and StructuredQuestion already suppress feedback for incomplete answers. ExamMode enables feedback only after submission.

## Goals / Non-Goals

**Goals:** add a feedback policy to the same lifecycle, preserve compatibility and verify it through the real app with service fixtures.

**Non-Goals:** create a second exam engine, grade first attempts, enable AI before submission, write to Firebase or implement #42.

## Decisions

- Registry `src/data/examModes.js` owns IDs, labels, descriptions and per-question feedback properties; unknown values resolve to Standard. Do not scatter conditional strings across the UI.
- Add `feedbackMode` to drafts; query parameter `feedback` configures new sessions only. On restoration, the session is authoritative rather than URL/props. Add a field instead of changing the session key so legacy URLs/drafts keep working.
- `createExamSession` accepts an options object containing clock/random/feedbackMode; update internal callers and tests. QuizMode also passes a configuration object instead of adding more positional arguments.
- New exams always default to Standard. If a draft exists, its notice shows the saved mode and explains that Resume preserves old settings while the new selection applies only to Start a new exam. QuizMode's key includes the account to prevent settings leaking between accounts.
- Wait for a stable account before mounting study components. An account change during an exam returns to setup before creating the new account's session; initial auth hydration still restores deep links/drafts normally. Regression testing found the old render/auth ordering could create an unintended guest draft during logout, so App handles it as the owner of navigation and cleanup.
- ExamMode enables feedback after submission or for a complete answer in Learning. During an active exam, the navigator shows only answered/flagged status, as in Practice. AI Explain remains available only after submission; its service is unchanged.
- Use one labelled radio group with descriptions in exam setup, with native or Ant Design semantics matching existing selections. Reuse study tokens, responsive grids, focus styles and a 44px minimum height. Include the mode label in active/results headings; Learning explains final-answer grading.
- UI/UX Pro Max query `input labels` returned Forms — Input Labels and Accessibility — Form Labels; apply visible/accessibility labels. Native-only recommendations do not automatically apply to the web.

## Risks / Trade-offs

- [Resume differs from a new selection] → distinguish the saved mode from new configuration in the notice; test reload/Back/Resume/start-new and legacy URLs.
- [Legacy drafts/invalid values] → normalize to Standard at create/read boundaries without resetting a valid deadline or question set.
- [Learning permits edits after viewing answers] → label results as Learning and grade final answers, as scoped by the issue; do not treat this as an independent exam score.
- [Browser storage unavailable] → retain the session in memory and the draft-unavailable notice, without claiming a successful cloud save.
- [Expiry/input race] → retain deadline checks in handlers and idempotent finishExam; cover both modes with regressions.

## Migration Plan

Run unit/E2E tests and review screenshots using service fixtures, then open one PR containing spec/code/evidence. Do not change Rules or production data. Only a requested merge triggers website CI deployment. Code rollback returns to Standard; the added field does not affect old readers. #42 remains pending. Archive/sync specs and confirm production after review/rollout; planning completion alone does not close the issue.
