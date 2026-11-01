# Verification — App AI #53

## Scope and status

Implementation dùng Worker + D1; guest BYOK, signed-in App AI/BYOK tự chọn. Workers Free đã xác minh; staging và production có D1 riêng. Production đã bật prompt v6/quota 20, Actions Variable đã cấu hình và website đã deploy lại. Chrome production smoke dùng một lượt được phép, lời giải tiếng Việt đủ bốn phần và quota 19→18; đổi VN/EN không tốn lượt. Task 3.2/#53 vẫn mở cho review chất lượng rộng hơn/CPU biên và PR cấu hình. Xem [rollout evidence](rollout.md#production-activation--2026-11-01) cho phiên bản, CI và giới hạn mẫu.

## Scenario evidence

| Requirement | Local evidence                                                                                                                                                                  | Staging / remaining acceptance                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| CQ-AI-01    | Worker integration: RSA signature, foreign key, expired/future/null claims, wrong audience/issuer/project, guest deny; JWK cache/rotation/outage tests                          | Live Firebase token accepted; unauthenticated 401 and disallowed origin 403 verified                       |
| CQ-AI-02    | Shared validator/all five formats, input cap, fixed model/output budget, Vietnamese prompt/output policy including legacy EN/VN requests; Worker dry-run bundle                 | Free verified; production v6 four-part answer and sampled CPU passed; wider quality/boundary CPU pending   |
| CQ-AI-03    | Actual Miniflare D1 triggers: user/global final slot concurrency, pending user guard, UTC reset and failure accounting                                                          | Historical staging 5→4→3; migration preserves usage/results; production 19→18 verified                     |
| CQ-AI-04    | Same-ID cached result, changed payload conflict, Bob isolation, failed/timeout retry without new inference, stale/expired ID cleanup                                            | Two live successful completions; failure/retry cases use local fixtures                                    |
| CQ-AI-05    | Browser guest BYOK round-trip with provider stub; signed-in HTTP Worker flow; explicit BYOK setting with no key fallback                                                        | Production v6 live signed-in App AI passed; no real BYOK key exercised                                     |
| CQ-AI-06    | Client reset/late-response unit case; browser logout during held response; UI locale switch preserves Vietnamese answer/pending attempt and quota; existing exam feedback tests | Production EN→VN→EN kept same answer/quota/question/progress; account-switch races remain fixture evidence |
| CQ-AI-07    | Source/settings/usage/errors and absent-URL guest/account BYOK through browser fixtures; widths 320/390/412/768/1280 and 844x390, VN/EN + light/dark                            | Physical devices not tested                                                                                |

Worker integration executes the actual fetch handler with signed test tokens and a real local Miniflare D1 database. AI inference is deterministic test data. Browser tests call this handler through a loopback HTTP fixture on 5176; neither the token endpoint nor test AI is deployed. The absent-URL fixture uses the real HTTP client with an empty base URL and confirms no Worker calls before or after sign-in. Production bundle isolation checks reject fixture endpoints and the missing-URL fixture marker. Current integration/CI results and retained failure diagnoses are tracked in [PR #54](https://github.com/tuanvipandpro/quiz-app/pull/54).

PR #63 đã merge ở `c33295b` sau khi **182 Node, 15 Worker/auth/migration, 17 Rules và 150 browser tests** pass, retries=0. Master [run 41312669951](https://github.com/tuanvipandpro/quiz-app/actions/runs/41312669951) pass và deploy; attempt 2 build lại với production URL sau activation. Follow-up này chỉ đổi flag deploy và tài liệu hiện hành: `yarn verify`, Worker dry-run, docs links/anchors/format và các kiểm tra config/auth/CORS/Chrome thật đều pass. Không chạy lại E2E local hoặc thêm inference để kiểm tra tài liệu. CI của đúng head PR follow-up vẫn là gate riêng trước merge.

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

Tích hợp `origin/master` tại `acf5fb5` (CTFL #55 và QuizMos domain/branding #56) vào branch App AI. Dữ liệu CTFL và catalog giữ nguyên byte-for-byte so với master; không sửa nội dung câu hỏi trong bước sync này.

Conflict duy nhất ở `scripts/check-build.mjs`: giữ API kiểm tra base path/CNAME của master cùng guard App AI `__test/token` và `127.0.0.1:5176`. Bổ sung hai regression cases cho guard này; cả bảy build-artifact tests pass. Production Worker allowlist bổ sung `https://quizmos.runs-at.dev`, giữ GitHub origin cho rollback; `APP_AI_ENABLED=false` và database placeholder vẫn giữ nguyên, không deploy.

`VITE_BASE=/ yarn verify` passed **154 Node tests** và production build/isolation; **14 Worker/auth tests** cùng Worker dry-run passed. Browser suite sau sync có 130 cases; kết quả full run và CI của merge commit được ghi trên PR. Test branding của master chờ nút Google enabled trước khi focus/Escape, tương thích với guard modal readiness của App AI.

Lượt local full run có 128/130 pass; hai case branding còn dùng test đã được nạp trước khi thêm readiness assertion. Trace có focus nhưng chưa có bước đợi enabled. Hai case chạy lại trên bản cập nhật đều pass.

[CI merge commit 894e0ee](https://github.com/tuanvipandpro/quiz-app/actions/runs/41233214467) passed 154 Node, 14 Worker/auth, 17 Rules và 129/130 browser tests; case phone cloud-management đo overflow khoảng 10 ms sau resize 320→390. Trace ghi viewport metrics đang đổi; screenshot sau đó không cho thấy tràn ở vùng đang hiển thị. Assertion nay poll đúng điều kiện `scrollWidth <= clientWidth` sau resize, giữ nguyên timeout và không thêm CSS che overflow. Case chạy lại với `--repeat-each=2` ở cả desktop/phone đạt 4/4; full CI của commit tiếp theo được ghi riêng trên PR. Artifacts gốc giữ trong ignored `artifacts/master-sync/ci-responsive/`.

UI review giữ `appBrand` chung, logo QuizMos và asset paths theo BASE_URL. Query `consistent navigation branding` không cho kết quả đủ sát; query hẹp `decorative icon aria hidden` khớp **Guideline / icon-context-accessibility**. Giữ tên truy cập trên brand button và logo trang trí, không đổi thư viện icon. Các sửa BYOK, shared sign-in và reduced-motion lifecycle được giữ khi auto-merge.

### CI reduced-motion regression

[CI run 41227218604](https://github.com/tuanvipandpro/quiz-app/actions/runs/41227218604) trên `da186ca` passed 147 Node, 14 Worker/auth và 17 Rules tests nhưng chỉ 123/126 browser tests. Ba cases đều fail khi đóng Help dưới reduced motion: desktop EN/dark, desktop VN/light và phone VN/dark. Log giữ modal ở `ant-zoom-leave-active` sau 8 giây; đây không phải lỗi selector của lần local trước và không được coi là CI xanh.

Code review đối chiếu `src/App.css` với rc-dialog/rc-motion và `ConfigProvider/MotionWrapper` của phiên bản đang cài: CSS zero-duration không đồng bộ trạng thái motion của thư viện, nên lifecycle đóng modal có thể chờ một end event đã bỏ lỡ. `useReducedMotion` đưa media preference vào token `motion` của Ant Design và cập nhật trực tiếp khi preference đổi. Khởi tạo với motion disabled giữ MotionProvider mounted từ đầu, tránh mất form state khi chuyển preference; các controls vẫn dùng motion bình thường khi người dùng không yêu cầu giảm chuyển động.

UI skill query `reduced motion animation` khớp **Animation / Reduced Motion**, áp dụng media preference qua API thư viện. Bộ BYOK sau sửa có **14/14 passed**: giữ nguyên 3 assertions CI đã fail, thêm startup preference/live changes khi Help đang mở, giữ key draft, đóng Help/Sign in/Settings và trả focus. Không tăng timeout, hạ assertion, force click hoặc retry. Full CI của commit sửa được ghi riêng trên PR; các pass local không thay thế CI của đúng head.

### BYOK simplification follow-up — 2026-11-01

User yêu cầu giảm thông tin thường trực và đồng nhất đăng nhập. Settings trước đây render hai provider cards cùng mô tả/hướng dẫn lặp lại; nút Sign in gọi OAuth trực tiếp. Bản sửa dùng một editor theo provider, giữ draft của từng key khi đổi provider, Help dialog cho setup/storage/quota và lỗi/kết quả ngay gần input. Save/Test và nút xóa 44px giữ thao tác chính gọn; xóa cần xác nhận. Provider tabs chỉ chọn key đang chỉnh sửa, không đổi model routing.

Header và AI Settings dùng chung `SignInModal` cùng `useSignIn`; mở dialog chưa gọi OAuth. Cancel/failure giữ input và trả focus về Sign in, chỉ Continue with Google mới đăng nhập. Loading keys thất bại khóa thao tác ghi và cung cấp Retry. Không thay quota, dữ liệu quiz hoặc production Worker.

- UI skill query `progressive disclosure form help` khớp **Accessibility / Consistent Help**, **Forms / Submit Feedback**, **Accessibility / Form Labels**. Áp dụng help ở vị trí cố định, label liên kết input, trạng thái lỗi/thành công tại form. `progressive-disclosure` lấy từ quick reference §8, không được mô tả thành kết quả search trực tiếp.
- React query `preserve form state` khớp **State / Use useState for local state**; giữ draft theo provider. Không chuyển sang Actions/useActionState vì flow hiện hữu dùng service promises và cancellation. Python launcher không có interpreter; search chạy thành công bằng Python bundled, không cần cài thêm.
- Matrix: 320/390/412/768/1280px và 844×390 landscape, VN/EN, light/dark cho BYOK, Help và Sign in; Escape/cancel/focus return, reduced-motion, provider draft preservation, save failure/retry, connection busy/success, clear cancel/confirm và sign-in failure/retry được kiểm tra bằng fixtures. Không gọi AI hay dùng credentials thật.
- Text contrast trong mẫu đã đo: tối thiểu **6.36:1 light**, **5.96:1 dark**; icon xóa đạt ngưỡng 3:1. Các controls được kiểm tra 44×44px. Screenshot lấy sau khi finite animations kết thúc; không vô hiệu hóa motion để chụp.
- Lần matrix đầu phát hiện nút xóa chỉ rộng 40px: CSS đã tăng minimum lên 44px, trace giữ trong ignored `artifacts/byok-settings/first-layout-failures/`.
- Full browser run: **118/126 passed**, 8 matrix cases timeout vì selector `has` chứa lại ancestor dialog sau khi đổi nhãn Gemini. Selector đã sửa để click visible label; không tăng timeout, force click hoặc bật retry. Trace giữ trong `artifacts/byok-settings/full-run-selector-failures/`. Nhóm BYOK 12 cases chạy riêng sau sửa đã pass; kết quả final head/CI ghi trên PR.
- Bổ sung matrix popup xóa và dùng danger tokens chung để giữ text contrast 4.5:1. Lượt mở rộng có 11/12 pass; một phép đo lấy height 41.98px khi modal đang chuyển động. Geometry checks chuyển sang poll cùng ngưỡng 44px như suite hiện hữu; case EN/light desktop chạy lại đã pass. Trace giữ trong `artifacts/byok-settings/clear-dialog-motion-failure/`. Không hạ ngưỡng hoặc dùng sleep để che lỗi.
- Local tests dùng cấu hình tạm trong ignored artifacts để Vite chạy 5184, tránh server test của session khác. API fixture vẫn ở loopback 5176; `QUIZ_E2E_ORIGIN` chỉ nhận HTTP origin `127.0.0.1`, không thay service thật hoặc bypass Worker auth. Cấu hình CI mặc định vẫn là 5174/5176.

Ảnh trước là reference từ commit trước trong `evidence/guest-setup-*`; ảnh mới được lưu với prefix `byok-`. Visual review gồm compact EN/light desktop, EN/dark và VN/dark 320px, Help VN/dark, Sign in EN/light và VN/dark, save error và testing states. Đây là Chromium emulation; thiết bị thật, Safari và bàn phím ảo thật chưa được kiểm tra.

UI/UX Pro Max query `quota disabled feedback` matched **Interaction / Disabled States** and **AI Interaction / Feedback Loop**. Applied disabled state semantics, explicit regeneration, quota/reset text and error recovery. Haptic result was not relevant to this web task and was not applied. Used existing Ant Design components/tokens and preserved header alignment.

Selected rendered screenshots were visually reviewed: 320px VN/dark settings, 1280px EN/light and VN/dark settings, guest BYOK setup. Other screenshots provide additional EN/phone and quota evidence. Browser tests check all stated widths, languages and themes; this is Chromium emulation, not physical iPhone/Samsung/Safari testing.

`before-guest-explain-signin.png` records the previous guest Explain behavior encountered during regression testing: it opened the sign-in dialog. `guest-setup-*.png` records the corrected BYOK entry. The before image was captured during implementation, before fixing that old guard, not from a separate production deployment.

Initial failures are preserved under ignored `artifacts/app-ai/`: incorrect test selector (`Practice` vs `Start practice`), native sandbox esbuild access, guest Practice auth guard, and Ant Design hidden radio input/async Retry label test timing. Runtime guest guard and source-selection flow were corrected. Tests click visible radio labels and await a completed retry; no forced click or automatic retry hides failures.

Final review also reproduced a stale-cache bug with a failing unit test: after a failed Regenerate, Retry returned the earlier cached answer. Regeneration now invalidates that entry before dispatch, so Retry checks the same operation. Settings closing after a source change restores focus to the stable Explain trigger.

Initial CI passed 145 Node, 12 Worker/auth and 17 Rules tests; browser suite passed 113/114. Its failure trace showed Google sign-in clicked at `(1052,108)` while the opening modal was transforming from the header; the settled button was around `(640,387)`. The sign-in action now stays disabled until Ant Design reports `afterOpenChange(true)`, preventing a lost click during opening. The original CI trace and screenshot are preserved in ignored artifacts; subsequent verification is reported on the PR.

The next CI run passed 112/114 browser cases and exposed two existing timing assumptions: a dropdown click during motion and a contrast sample of 4.36 during a theme transition (settled tokens exceed 7). Shared browser helpers now observe finite animation completion on the target and its ancestors before menu interaction or contrast measurement. They do not disable motion, force clicks, retry tests, sleep for fixed durations or lower the 4.5 threshold.

A subsequent 113/114 run exposed the same early-click race in exam submission confirmation. Dialog button interactions now consistently use the same settled-motion helper across the suite; exam answers, scoring, deadlines and assertions are unchanged. Final CI status is recorded on the PR for the actual head revision.
