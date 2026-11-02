# Verification

Local verification on 2026-10-30. The feature has the acceptance evidence below; production rollout remains pending until the PR is merged/deployed.

PR review: [#49 — Add Standard and Learning modes to mock exams](https://github.com/tuanvipandpro/quiz-app/pull/49). Opened, not merged/archived. Task completion records implementation/local acceptance, not production rollout confirmation.

| Requirement | Evidence                                                                                                                                                                                                                    | Status                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| CQ48-01     | `studySession.test.js`: new exams default to Standard; E2E uploads and banks select both modes                                                                                                                              | Passed                          |
| CQ48-02     | E2E `standard exam feedback ...` across five formats: no feedback/styles/navigator correctness before submission; review and locked inputs after submit/expiry                                                              | Passed                          |
| CQ48-03     | E2E `learning exam feedback ...`: incomplete answers stay hidden, complete answers show feedback, deselecting a multiple choice hides feedback again, editing a correct single answer to incorrect produces final score 0/1 | Passed                          |
| CQ48-04     | Two E2E `bank exam keeps ...` cases: reload, Resume with different setup, cancel/start-new, native Back and legacy URLs retain mode/deadline/order/answers/flags; two expiry tests retain the deadline and lock answers     | Passed                          |
| CQ48-05     | Node legacy/invalid/account/quiz cases; E2E legacy/invalid values, sign-in/sign-out during exams, signed-in reload and storage failures remain usable with clear feedback                                                   | Passed                          |
| CQ48-06     | E2E keyboard arrows/focus and geometry across 24 viewport/language/theme combinations; visual review and screenshots below                                                                                                  | Passed within browser emulation |

Test sources: [Node session regressions](../../../tests/studySession.test.js), [browser feature regressions](../../../tests/e2e/examFeedback.spec.js), [existing application regressions](../../../tests/e2e/app.spec.js).

## Commands and findings

- `yarn verify`: passed — 117 Node tests, 48-file UI skill payload, strict OpenSpec 3/3, catalog of 20 banks, lint/format, production build and fixture isolation.
- `yarn test:e2e`: 56/56 passed, retries=0; 19 feature scenarios and 9 existing scenarios ran on desktop/phone Chromium.
- The first run found that auth transitions could create a guest draft before logout navigation finished. App now waits for a stable owner and returns to setup before mounting a new session; sign-in/sign-out tests verify both directions and signed-in reload.
- Initial locator failures were fixed by clicking Yes/No labels and scoping dropdowns through `aria-controls`, without force/sleep/retry bypasses. Original traces/screenshots remain local in ignored `artifacts/exam-feedback-48/first-e2e-failures/`.
- Four existing guide-review warnings and the bundle-size warning remain; bank content/hashes were not changed.
- Rules/emulator plumbing was unchanged, so `yarn test:rules` was not rerun locally for this feature; CI still runs the baseline suite.

## Visual and accessibility review

- Geometry: 320×844, 390×844, 412×915, 768×1024, 1280×900, 844×390; every EN/VN and light/dark combination has no horizontal overflow. New selection targets are at least 44×44px. E2E verifies native arrow-key selection and focus returning to Start a new exam after Cancel.
- Visually reviewed samples: setup desktop 1280 EN/light; 390 EN/dark; 320 VN/dark; 412 VN/light; 768 EN/light; long-question Learning 390 EN/dark; submit dialog 844×390 VN/dark; results and keyboard focus 390 VN/dark. These samples are not a full visual cross-product.
- Text/control labels use existing tokens. Contrast calculations for token pairs in the new section: text/hint at least 4.85:1; primary focus/selected border at least 5.65:1. [Token-based calculations](evidence/token-contrast.json) are not an application-wide contrast audit.
- UI/UX Pro Max `input labels` → Forms — Input Labels and Accessibility — Form Labels; radio groups have visible labels, linked accessible labels/descriptions, native keyboard semantics and focus rings. No new animation was added.

| Evidence                        | Before                                                         | After                                                   |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Desktop 1280×900, EN/light      | [Production baseline](evidence/before-setup-1280-en-light.png) | [Feature setup](evidence/after-setup-1280-en-light.png) |
| Phone viewport 390×844, EN/dark | [Production baseline](evidence/before-setup-390-en-dark.png)   | [Feature setup](evidence/after-setup-390-en-dark.png)   |

Before images were recaptured from production baseline `66f1a8f` because the browser tool's original full-page captures were faulty; after images use the real app on Vite E2E service fixtures at 5175. Only inspected and verified screenshots are included as evidence.

- [Controls 320px VN/dark](evidence/after-controls-320-vi-dark.png)
- [Keyboard focus 390px VN/dark](evidence/keyboard-focus-390-vi-dark.png)
- [Submit modal landscape VN/dark](evidence/submit-844x390-vi-dark.png)
- [Learning results 390px VN/dark](evidence/learning-results-390-vi-dark.png)

## Scope

No real accounts or paid AI were tested; service fixtures were used. Rules, banks and #42 implementation were unchanged. Physical iPhone/Samsung devices, Safari/WebKit, real virtual keyboards and a comprehensive screen-reader audit were not tested. This is browser emulation, not physical-device certification. No automatic merge/deploy/archive occurred on the feature branch.
