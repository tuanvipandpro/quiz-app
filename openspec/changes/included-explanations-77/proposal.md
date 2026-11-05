# Proposal

## Why

The catalog review found 1,036 non-empty included explanations among 4,389 questions, but a guest without keys is sent to AI Settings before reading them. Tracking: [#77](https://github.com/tuanvipandpro/quiz-app/issues/77); coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87).

## What Changes

- Let Explain open a reference-first explanation panel in Practice and submitted-exam review.
- Generate AI explanations only after an explicit AI action, preserving source choice, quota, retries, cancellation and language policy.
- Show a useful no-reference state and keep included content labelled as bank-supplied, rather than independently verified.
- Preserve the current rule that active Standard and Learning exams do not expose an Explain action.

## Capabilities

### New Capabilities

- `question-explanations`: explanation entry, source separation, answer-visibility gates and reference-only reading.

### Modified Capabilities

None. The in-flight app-ai-explanations contract continues to own generated explanations and provider/quota behavior.

## Impact

Feature, medium risk. Owners: ExplanationDialogs, useExplanation, StudyNavigation and the two study modes. Reuse questionExplanation, the sanitized Markdown renderer, translations and current AI services. Update the AI/guest/browser tests to distinguish opening a panel from requesting generation. No bank-answer rewrite, key migration, backend rollout or new dependency. Deliver one feature PR with UI and network evidence.
