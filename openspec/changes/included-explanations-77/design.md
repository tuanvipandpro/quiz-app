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

| Requirement   | Planned evidence                                                                                                               | Status  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------- |
| CQ-EXPLAIN-01 | Included/no-reference fixtures; zero action-triggered credential/profile/usage/inference calls for guest and signed-in readers | Pending |
| CQ-EXPLAIN-02 | appAi/byok regressions for explicit generation, no-key setup, loading, cache, quota, retry and cancellation                    | Pending |
| CQ-EXPLAIN-03 | examFeedback running/submitted gates for all formats; account/question switch and focus restoration                            | Pending |
| CQ-EXPLAIN-04 | Long/unsafe Markdown, source labels, reference language, keyboard/phone rendering and contrast                                 | Pending |

Use the repository UI matrix (320–1280px plus landscape, VN/EN, themes, reduced motion) and local fixtures only. UI guidance: error recovery retry returned Error Recovery, Error Messages and Error Placement; apply actionable role=alert errors near generation while preserving readable reference content.

## Migration Plan

One #77 feature PR after the #74 lifecycle correction, with yarn verify and relevant E2E. There is no data migration or backend rollout. After owner-requested merge and master deploy, smoke reference-only reading on a public question without calling AI. Revert the UI/hook change if needed; no keys or quota ledgers change.
