# Design

## Context

See [proposal](proposal.md). useExplanation.explain currently opens the panel and immediately resolves credentials/quota/generation. ExplanationDialogs renders an included reference only inside that AI-driven visibility state. Both study modes share the hook and sanitized Markdown rendering.

## Goals / Non-Goals

**Goals:** make included reading useful without IO, preserve explicit AI consent and existing active-exam gates.

**Non-Goals:** change prompts/models/quotas, translate bank content, verify marked answers automatically or expose explanation controls during an active exam.

## Decisions

1. Separate opening from generating in the explanation orchestration contract. Explain opens reference-first state; Generate AI calls the existing request path. Keep cancellation/cache/source logic in the hook/services, not in the presentation component.
2. Keep the compact dock's single Explain entry. Inside the panel show Included explanation (expanded when present), a missing-reference state when absent and an explicit AI action/source label. Avoid adding another primary dock button.
3. Opening a reference must not call getKeys, profile/usage endpoints or inference. Existing app-wide auth hydration may already have occurred; network tests measure calls caused by the reference action after hydration settles.
4. Preserve questionExplanation and the existing sanitizer. Included text keeps its source language and supplied-content caveat; only generated output declares the existing Vietnamese policy.
5. AI failure leaves the reference visible. Question/account changes abort requests and reset stale state. Opening/closing retains the current focus/scroll contract; opening an already-visible panel should reveal its current content rather than accidentally generate again.

Alternative considered: show reference only after attempting AI. It retains the current unnecessary setup/quota dependency and fails CQ-EXPLAIN-01.

## Risks / Trade-offs

- Existing tests equate Explain with generation → update those tests to click Generate AI explicitly while retaining source/quota assertions.
- Learning mode reveals feedback after a complete answer but currently has no Explain action → keep that distinction until submission; cover it explicitly.
- A stale response could replace a new question's panel → preserve current cancellation/account checks and test navigation during generation.

## Verification matrix

| Requirement   | Planned evidence                                                                                                         | Status                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| CQ-EXPLAIN-01 | explanationAccess guest/signed-in IO instrumentation and missing-reference cases                                         | Local/CI pass; deploy pending |
| CQ-EXPLAIN-02 | appAi/byok explicit generation, no-key setup, loading, cached reopening, quota, retry and error-with-reference cases     | Local/CI pass; deploy pending |
| CQ-EXPLAIN-03 | examFeedback all five formats in both active/submitted modes; delayed question response, logout and close/reopen focus   | Local/CI pass; deploy pending |
| CQ-EXPLAIN-04 | Long tokens/unsafe HTML sanitized; reference language preserved; viewport/contrast matrix and rendered samples inspected | Local/CI pass; deploy pending |

Use the repository UI matrix (320–1280px plus landscape, VN/EN, themes, reduced motion) and local fixtures only. UI guidance: error recovery retry returned Error Recovery, Error Messages and Error Placement; apply actionable role=alert errors near generation while preserving readable reference content.

Local evidence: `yarn verify` passed (193 Node tests). Of 98 focused E2E cases, 96 passed initially; the two new navigation tests failed because adjacent CCAR-P questions happened to share the same reference, then passed with distinct reference fixtures and an awaited late delivery. The corrected explanationAccess suite passed all 12 cases, and the added contrast matrix passed both projects at 4.5:1 or better. Existing appAi/byok/examFeedback/studyLayout cases passed without changed production data or live API calls. Screenshots at 320px VN/dark, 1280px EN/light and landscape VN/dark were inspected; 390/412/768px and all language/theme combinations are covered by the matrix. Normal motion is exercised by the existing AI/settings suites, reduced motion by explanationAccess. Logs and initial failure evidence remain in ignored `artifacts/implement-m1/`. Latest-head CI and post-merge acceptance remain separate gates.

## Migration Plan

[Runtime-head CI](https://github.com/tuanvipandpro/quiz-app/actions/runs/42082906003) passed on `f3e3cbac3f5cc8cd64d848132796277138b262e1`, including verification, Rules, both full E2E shards and the aggregate gate. Staged/outgoing redacted scans were clean. This acceptance-only documentation update still requires latest-head CI. Production reading smoke remains pending owner-requested merge/deployment; #77 stays open.

One #77 feature PR after the #74 lifecycle correction, with yarn verify and relevant E2E. There is no data migration or backend rollout. After owner-requested merge and master deploy, smoke reference-only reading on a public question without calling AI. Revert the UI/hook change if needed; no keys or quota ledgers change.
