# Verification — App AI #53

## Scope and status

Implementation dùng Worker + D1; guest BYOK, signed-in App AI/BYOK tự chọn. Chưa deploy Cloudflare và chưa gọi model thật. `wrangler whoami` xác nhận máy chưa authenticated; user đã được báo bước đăng nhập và hướng dẫn trong `worker/README.md`. Server disabled mặc định và frontend không có URL thì App AI unavailable.

## Scenario evidence

| Requirement | Local evidence                                                                                                                                                 | Production                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| CQ-AI-01    | Worker integration: RSA signature, foreign key, expired/future/null claims, wrong audience/issuer/project, guest deny; certificate cache/rotation/outage tests | Firebase live token + setup pending      |
| CQ-AI-02    | Shared validator/all five formats, input cap, fixed model/output budget, VN/EN prompt, disabled rollout; Worker dry-run bundle                                 | Model quality, CPU and Free plan pending |
| CQ-AI-03    | Actual Miniflare D1 triggers: user/global final slot concurrency, pending user guard, UTC reset and failure accounting                                         | Neuron/usage benchmark pending           |
| CQ-AI-04    | Same-ID cached result, changed payload conflict, Bob isolation, failed/timeout retry without new inference, stale/expired ID cleanup                           | Live inference outcome pending           |
| CQ-AI-05    | Browser guest BYOK round-trip with provider stub; signed-in HTTP Worker flow; explicit BYOK setting with no key fallback                                       | Provider/model live smoke pending        |
| CQ-AI-06    | Client reset/late-response unit case; browser logout during held response; existing exam feedback tests                                                        | Live account smoke pending               |
| CQ-AI-07    | Source/settings/usage/errors through phone+desktop browser tests, widths 320/390/412/768/1280 and 844x390, VN/EN + light/dark                                  | Physical devices not tested              |

Worker integration executes the actual fetch handler with signed test tokens and a real local Miniflare D1 database. AI inference is deterministic test data. Browser tests call this handler through a loopback HTTP fixture on 5176; neither the token endpoint nor test AI is deployed. Production bundle isolation checks reject these fixture endpoints.

## Commands

- `yarn verify`: passed 144 Node tests, OpenSpec 4/4, lint/format, catalog, production build and fixture isolation; one additional regeneration-cache regression test was then added and verified (145 total in the final run). Existing bundle-size warning and four guide-review warnings remain.
- `yarn test:worker`: 10 handler/D1 tests plus 2 certificate-cache tests passed in local runs; combined CI command added.
- `yarn worker:check`: dry-run bundle passed; no deploy or inference request.
- Full browser run: 107/114 passed; seven existing scenarios hit loading/layout timeouts while concurrent native suites were using the machine. Traces show module requests taking up to 5.7 seconds with HTTP 200 and no JS error. All seven passed with `playwright test --last-failed --workers=1`, unchanged assertions/timeouts and retries=0. Artifacts remain under `artifacts/app-ai/full-run-failures/`.
- Final App AI suite after dialog focus changes: 18/18 passed with two workers, covering both projects. CI runs the whole 114-test suite and is tracked separately in the PR.
- Cloudflare login/Free verification, actual model quality/CPU/Neurons and production rollout are not complete. These are tracked separately in task 3.2; do not close #53 on local evidence alone.

## UI evidence and skill use

UI/UX Pro Max query `quota disabled feedback` matched **Interaction / Disabled States** and **AI Interaction / Feedback Loop**. Applied disabled state semantics, explicit regeneration, quota/reset text and error recovery. Haptic result was not relevant to this web task and was not applied. Used existing Ant Design components/tokens and preserved header alignment.

Selected rendered screenshots were visually reviewed: 320px VN/dark settings, 1280px EN/light and VN/dark settings, guest BYOK setup. Other screenshots provide additional EN/phone and quota evidence. Browser tests check all stated widths, languages and themes; this is Chromium emulation, not physical iPhone/Samsung/Safari testing.

`before-guest-explain-signin.png` records the previous guest Explain behavior encountered during regression testing: it opened the sign-in dialog. `guest-setup-*.png` records the corrected BYOK entry. The before image was captured during implementation, before fixing that old guard, not from a separate production deployment.

Initial failures are preserved under ignored `artifacts/app-ai/`: incorrect test selector (`Practice` vs `Start practice`), native sandbox esbuild access, guest Practice auth guard, and Ant Design hidden radio input/async Retry label test timing. Runtime guest guard and source-selection flow were corrected. Tests click visible radio labels and await a completed retry; no forced click or automatic retry hides failures.

Final review also reproduced a stale-cache bug with a failing unit test: after a failed Regenerate, Retry returned the earlier cached answer. Regeneration now invalidates that entry before dispatch, so Retry checks the same operation. Settings closing after a source change restores focus to the stable Explain trigger.
