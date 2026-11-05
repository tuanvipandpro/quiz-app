# Proposal

## Why

The production review twice observed a ResizeObserver reading a detached dock ref when leaving study for Summary. Tracking: [#74](https://github.com/tuanvipandpro/quiz-app/issues/74); planning coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87). Fix the remaining lifecycle error after the already-merged UI work in #76.

## What Changes

- Give the dock measurement callback a safe element lifetime and deterministic teardown.
- Prove that late observer delivery cannot throw or change the next screen's dock padding.
- Add route/resize regressions that capture uncaught page errors; retain existing navigation, timer, safe-area and focus behavior.
- Implementation remains open; planning does not complete the production-smoke gate.

## Capabilities

### New Capabilities

- `study-controls`: lifetime-safe measurement and cleanup of persistent study controls.

### Modified Capabilities

None. Existing exam-feedback and public-home changes remain the reference for their original behaviors.

## Impact

Bugfix, low code scope and medium UI risk. Primary owner: src/components/StudyNavigation.jsx; regressions: tests/e2e/studyLayout.spec.js and shared browser error observation. No service, data, permission or dependency change. One focused implementation PR for #74, followed by required CI/merge/deployed navigation smoke.
