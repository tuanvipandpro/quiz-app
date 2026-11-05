# Verification — App AI #53

## Scope and status

The implementation uses Worker + D1; guests use BYOK, while signed-in users explicitly select App AI/BYOK. Workers Free was verified, with separate staging/production D1 databases. Production has prompt v6/quota 20 enabled, its Actions Variable configured and the website redeployed. Chrome production smoke used one authorized call, returned a complete four-part Vietnamese explanation and changed quota 19→18; VN/EN switches used no additional attempts. #64 merge and post-merge CI/deploy passed. #53 remains open for wider output quality; the CPU-boundary benchmark is **Deferred by owner**, not passed. The [acceptance matrix](../../../docs/m1-app-ai-acceptance-53.md) reviews the retained output and missing sample. See [rollout evidence](rollout.md#production-activation--2026-11-01) for historical versions and limitations.

## Scenario evidence

Acceptance preparation on 2026-11-06: the [public review pack](../../../tests/fixtures/appAiQualityCases.js) crosses the real local Worker/D1 request boundary with stubbed inference; all eight accepted inputs plus over-limit zero-dispatch rejection passed in the 18-test Worker suite. `yarn verify` passed 193 Node tests and build/isolation; Worker dry-run and docs/config checks passed. One retained v6 output was reviewed; eight missing outputs remain unsampled. Full findings and the bounded authorization protocol are in the acceptance matrix above. No new live calls were made.

| Requirement | Local evidence                                                                                                                                                                  | Staging / remaining acceptance                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| CQ-AI-01    | Worker integration: RSA signature, foreign key, expired/future/null claims, wrong audience/issuer/project, guest deny; JWK cache/rotation/outage tests                          | Live Firebase token accepted; unauthenticated 401 and disallowed origin 403 verified                       |
| CQ-AI-02    | Shared validator/all five formats, input cap, fixed model/output budget, Vietnamese prompt/output policy including legacy EN/VN requests; Worker dry-run bundle                 | Historical v6 single-answer smoke reviewed; wider quality pending, CPU boundary owner-deferred             |
| CQ-AI-03    | Actual Miniflare D1 triggers: user/global final slot concurrency, pending user guard, UTC reset and failure accounting                                                          | Historical staging 5→4→3; migration preserves usage/results; production 19→18 verified                     |
| CQ-AI-04    | Same-ID cached result, changed payload conflict, Bob isolation, failed/timeout retry without new inference, stale/expired ID cleanup                                            | Two live successful completions; failure/retry cases use local fixtures                                    |
| CQ-AI-05    | Browser guest BYOK round-trip with provider stub; signed-in HTTP Worker flow; explicit BYOK setting with no key fallback                                                        | Production v6 live signed-in App AI passed; no real BYOK key exercised                                     |
| CQ-AI-06    | Client reset/late-response unit case; browser logout during held response; UI locale switch preserves Vietnamese answer/pending attempt and quota; existing exam feedback tests | Production EN→VN→EN kept same answer/quota/question/progress; account-switch races remain fixture evidence |
| CQ-AI-07    | Source/settings/usage/errors and absent-URL guest/account BYOK through browser fixtures; widths 320/390/412/768/1280 and 844x390, VN/EN + light/dark                            | Physical devices not tested                                                                                |

Worker integration executes the actual fetch handler with signed test tokens and a real local Miniflare D1 database. AI inference is deterministic test data. Browser tests call this handler through a loopback HTTP fixture on 5176; neither the token endpoint nor test AI is deployed. The absent-URL fixture uses the real HTTP client with an empty base URL and confirms no Worker calls before or after sign-in. Production bundle isolation checks reject fixture endpoints and the missing-URL fixture marker. Current integration/CI results and retained failure diagnoses are tracked in [PR #54](https://github.com/tuanvipandpro/quiz-app/pull/54).

PR #63 merged at `c33295b` after **182 Node, 15 Worker/auth/migration, 17 Rules and 150 browser tests** passed, retries=0. Master [run 41312669951](https://github.com/tuanvipandpro/quiz-app/actions/runs/41312669951) passed and deployed; attempt 2 rebuilt with the production URL after activation. This follow-up changes only the deployment flag and maintained documentation: `yarn verify`, Worker dry-run, documentation links/anchors/format and live config/auth/CORS/Chrome checks passed. Local E2E was not rerun and no inference was added for documentation checks. The follow-up PR's own head CI remains a separate pre-merge gate.

## Implementation verification before staging changes

- `yarn verify`: passed 144 Node tests, OpenSpec 4/4, lint/format, catalog, production build and fixture isolation; one additional regeneration-cache regression test was then added and verified (145 total in the final run). Existing bundle-size warning and four guide-review warnings remain.
- `yarn test:worker`: 10 handler/D1 tests plus 2 certificate-cache tests passed in local runs; combined CI command added.
- `yarn worker:check`: dry-run bundle passed; no deploy or inference request.
- Full browser run: 107/114 passed; seven existing scenarios hit loading/layout timeouts while concurrent native suites were using the machine. Traces show module requests taking up to 5.7 seconds with HTTP 200 and no JS error. All seven passed with `playwright test --last-failed --workers=1`, unchanged assertions/timeouts and retries=0. Artifacts remain under `artifacts/app-ai/full-run-failures/`.
- Final App AI suite after dialog focus changes: 18/18 passed with two workers, covering both projects. CI runs the whole 114-test suite and is tracked separately in the PR.
- CI on `7125b45641311dfdad12659d46e0362343191a06` subsequently passed **145 Node, 12 Worker/auth, 17 Rules and all 114 browser tests**, retries=0: [run 41184291943](https://github.com/tuanvipandpro/quiz-app/actions/runs/41184291943). This predates the staging model/prompt/JWK changes; fresh verification is recorded separately.
- Production rollout remains incomplete in task 3.2; do not close #53 on local or staging evidence alone.

## Staging follow-up verification

- `yarn verify`: **147 Node tests**, lint/format, OpenSpec, catalog and production build/isolation passed after the localized prompt, SEA-LION adapter and JWK changes. The existing guide-review and bundle-size warnings remain.
- `yarn test:worker`: **14/14 passed**, including real RSA/JWK verification, key rotation/outage and rejection of empty/truncated/tool-call completions. No live account or model was used by these tests.
- `yarn worker:check`: production Worker dry-run passed with `APP_AI_ENABLED=false`; no deployment or inference.
- `yarn test:e2e tests/e2e/appAi.spec.js --workers=2`: **18/18 passed**, retries=0, both phone and desktop with VN/EN and light/dark. Full-suite CI for the new commit is tracked on PR #54; the earlier 114-test CI pass is not attributed to these changes.
- Production assets were checked to exclude the staging URL and fixture API. The real app on local 5173 returned HTTP 200 and remains connected to staging only through the ignored development env file.
- Live staging used the two owner-authorized calls only. The [rollout record](rollout.md) separates actual model/account evidence from fixture tests and records pending production acceptance.

## UI evidence and skill use

### Master integration — 2026-11-01

Integrated `origin/master` at `acf5fb5` (CTFL #55 and QuizMos domain/branding #56) into the App AI branch. CTFL data and the catalog remain byte-for-byte identical to master; this synchronization does not edit question content.

The sole conflict was in `scripts/check-build.mjs`: retain master's base-path/CNAME check API together with App AI guards for `__test/token` and `127.0.0.1:5176`. Added two guard regressions; all seven build-artifact tests passed. The production Worker allowlist adds `https://quizmos.runs-at.dev` and retains the GitHub origin for rollback; `APP_AI_ENABLED=false` and the database placeholder remain unchanged, without deployment.

`VITE_BASE=/ yarn verify` passed **154 Node tests** and production build/isolation; **14 Worker/auth tests** and Worker dry-run passed. The post-sync browser suite has 130 cases; full-run and merge-commit CI results are recorded in the PR. Master's branding test waits for the Google button to become enabled before focus/Escape, matching App AI's modal-readiness guard.

The local full run passed 128/130; two branding cases used tests loaded before the readiness assertion was added. The trace shows focus but no enabled-state wait. Both cases passed when rerun against the updated tests.

[Merge commit 894e0ee CI](https://github.com/tuanvipandpro/quiz-app/actions/runs/41233214467) passed 154 Node, 14 Worker/auth, 17 Rules and 129/130 browser tests; the phone cloud-management case measured overflow about 10 ms after resizing 320→390. The trace shows viewport metrics still changing; the subsequent screenshot shows no overflow in the visible area. The assertion now polls the actual `scrollWidth <= clientWidth` condition after resize, retaining the timeout and adding no overflow-hiding CSS. Rerunning with `--repeat-each=2` on desktop/phone passed 4/4; the next commit's full CI is recorded separately in the PR. Original artifacts remain in ignored `artifacts/master-sync/ci-responsive/`.

UI review retains shared `appBrand`, the QuizMos logo and BASE_URL-based asset paths. Query `consistent navigation branding` was not sufficiently relevant; the narrower `decorative icon aria hidden` query matched **Guideline / icon-context-accessibility**. Retain the brand button's accessible name and decorative logo without changing icon libraries. BYOK, shared sign-in and reduced-motion lifecycle fixes were preserved during automatic merging.

### CI reduced-motion regression

[CI run 41227218604](https://github.com/tuanvipandpro/quiz-app/actions/runs/41227218604) on `da186ca` passed 147 Node, 14 Worker/auth and 17 Rules tests but only 123/126 browser tests. Three cases failed while closing Help under reduced motion: desktop EN/dark, desktop VN/light and phone VN/dark. Logs retain the modal in `ant-zoom-leave-active` after 8 seconds; this is distinct from the earlier local selector failure and is not green CI.

Code review compared `src/App.css` with the installed rc-dialog/rc-motion and `ConfigProvider/MotionWrapper`: zero-duration CSS did not synchronize the library's motion state, so modal closing could await an end event already missed. `useReducedMotion` passes the media preference into Ant Design's `motion` token and updates live on preference changes. Initializing with motion disabled keeps MotionProvider mounted from startup and avoids losing form state as preferences change; controls retain normal motion when reduced motion is not requested.

UI skill query `reduced motion animation` matched **Animation / Reduced Motion**; the library API now applies the media preference. The corrected BYOK suite passed **14/14**: preserving all 3 failed CI assertions and adding startup preferences/live changes with Help open, key-draft preservation, Help/Sign in/Settings close and focus return. No timeout increases, weakened assertions, forced clicks or retries were used. Full CI for the fix is recorded separately in the PR; local passes do not replace exact-head CI.

### BYOK simplification follow-up — 2026-11-01

The user requested less persistent information and consistent sign-in. Settings previously rendered two provider cards with repeated descriptions/instructions, and Sign in invoked OAuth directly. The revision uses one selected-provider editor, preserves each key's draft across provider changes, moves setup/storage/quota guidance to Help and keeps errors/results near the input. Save/Test and the 44px clear button keep primary actions compact; clearing requires confirmation. Provider tabs select only the key editor, without changing model routing.

The header and AI Settings share `SignInModal` and `useSignIn`; opening the dialog does not invoke OAuth. Cancellation/failure preserves input and returns focus to Sign in; only Continue with Google initiates authentication. Failed key loading disables writes and offers Retry. Quota, quiz data and the production Worker are unchanged.

- UI skill query `progressive disclosure form help` matched **Accessibility / Consistent Help**, **Forms / Submit Feedback** and **Accessibility / Form Labels**. Applied consistently located help, input-linked labels and in-form error/success feedback. `progressive-disclosure` came from quick reference §8, not a direct search result.
- React query `preserve form state` matched **State / Use useState for local state**; retain drafts by provider. Actions/useActionState was not introduced because the existing flow uses service promises and cancellation. The Python launcher lacked an interpreter; search succeeded through bundled Python without installing another interpreter.
- Matrix: 320/390/412/768/1280px and 844×390 landscape, VN/EN, light/dark for BYOK, Help and Sign in; fixtures verify Escape/cancel/focus return, reduced motion, provider-draft preservation, save failure/retry, connection busy/success, clear cancel/confirm and sign-in failure/retry. No live AI or real credentials were used.
- Measured sample text contrast: at least **6.36:1 light**, **5.96:1 dark**; the clear icon meets 3:1. Checked controls are 44×44px. Screenshots were captured after finite animations finished, without disabling motion for capture.
- The first matrix run found a clear button only 40px wide: CSS minimum width was increased to 44px, with traces retained in ignored `artifacts/byok-settings/first-layout-failures/`.
- Full browser run: **118/126 passed**; 8 matrix cases timed out because a `has` selector included its ancestor dialog again after the Gemini label changed. The selector was corrected to click the visible label, without timeout increases, forced clicks or retries. Traces remain in `artifacts/byok-settings/full-run-selector-failures/`. The 12 isolated BYOK cases passed after correction; final-head/CI results are recorded in the PR.
- Added clear-confirmation coverage and shared danger tokens to preserve 4.5:1 text contrast. The expanded run passed 11/12; one measurement captured 41.98px height while the dialog was animating. Geometry checks now poll the same 44px threshold used by the existing suite; the EN/light desktop case passed on rerun. Traces remain in `artifacts/byok-settings/clear-dialog-motion-failure/`. No threshold was lowered or sleep added to hide the failure.
- Local tests used temporary configuration in ignored artifacts to run Vite on 5184, avoiding another session's test server. The API fixture remains on loopback 5176; `QUIZ_E2E_ORIGIN` accepts only an HTTP `127.0.0.1` origin and does not replace live services or bypass Worker auth. CI retains default ports 5174/5176.

Before screenshots reference the earlier commit's `evidence/guest-setup-*`; new images use the `byok-` prefix. Visual review covers compact EN/light desktop, EN/dark and VN/dark 320px, Help VN/dark, Sign in EN/light and VN/dark, save errors and testing states. This is Chromium emulation; physical devices, Safari and real virtual keyboards were not tested.

UI/UX Pro Max query `quota disabled feedback` matched **Interaction / Disabled States** and **AI Interaction / Feedback Loop**. Applied disabled state semantics, explicit regeneration, quota/reset text and error recovery. Haptic result was not relevant to this web task and was not applied. Used existing Ant Design components/tokens and preserved header alignment.

Selected rendered screenshots were visually reviewed: 320px VN/dark settings, 1280px EN/light and VN/dark settings, guest BYOK setup. Other screenshots provide additional EN/phone and quota evidence. Browser tests check all stated widths, languages and themes; this is Chromium emulation, not physical iPhone/Samsung/Safari testing.

`before-guest-explain-signin.png` records the previous guest Explain behavior encountered during regression testing: it opened the sign-in dialog. `guest-setup-*.png` records the corrected BYOK entry. The before image was captured during implementation, before fixing that old guard, not from a separate production deployment.

Initial failures are preserved under ignored `artifacts/app-ai/`: incorrect test selector (`Practice` vs `Start practice`), native sandbox esbuild access, guest Practice auth guard, and Ant Design hidden radio input/async Retry label test timing. Runtime guest guard and source-selection flow were corrected. Tests click visible radio labels and await a completed retry; no forced click or automatic retry hides failures.

Final review also reproduced a stale-cache bug with a failing unit test: after a failed Regenerate, Retry returned the earlier cached answer. Regeneration now invalidates that entry before dispatch, so Retry checks the same operation. Settings closing after a source change restores focus to the stable Explain trigger.

Initial CI passed 145 Node, 12 Worker/auth and 17 Rules tests; browser suite passed 113/114. Its failure trace showed Google sign-in clicked at `(1052,108)` while the opening modal was transforming from the header; the settled button was around `(640,387)`. The sign-in action now stays disabled until Ant Design reports `afterOpenChange(true)`, preventing a lost click during opening. The original CI trace and screenshot are preserved in ignored artifacts; subsequent verification is reported on the PR.

The next CI run passed 112/114 browser cases and exposed two existing timing assumptions: a dropdown click during motion and a contrast sample of 4.36 during a theme transition (settled tokens exceed 7). Shared browser helpers now observe finite animation completion on the target and its ancestors before menu interaction or contrast measurement. They do not disable motion, force clicks, retry tests, sleep for fixed durations or lower the 4.5 threshold.

A subsequent 113/114 run exposed the same early-click race in exam submission confirmation. Dialog button interactions now consistently use the same settled-motion helper across the suite; exam answers, scoring, deadlines and assertions are unchanged. Final CI status is recorded on the PR for the actual head revision.
