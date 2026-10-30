# Verification

Kiểm tra local ngày 2026-10-30. Feature đã có bằng chứng acceptance dưới đây; production rollout vẫn pending cho tới khi PR được merge/deploy.

| Requirement | Evidence                                                                                                                                                                                     | Status                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| CQ48-01     | `studySession.test.js`: new exams default to Standard; E2E upload và bank chọn hai mode                                                                                                      | Passed                          |
| CQ48-02     | E2E `standard exam feedback ...` cho năm formats: không feedback/styles/navigator đúng sai trước submit; có review và khóa input sau submit/expiry                                           | Passed                          |
| CQ48-03     | E2E `learning exam feedback ...`: incomplete không lộ đáp án, complete hiện feedback, bỏ chọn multiple lại ẩn, sửa single đúng thành sai và điểm cuối 0/1                                    | Passed                          |
| CQ48-04     | Hai E2E `bank exam keeps ...`: reload, Resume với lựa chọn khác, cancel/start-new, native Back và URL cũ giữ mode/deadline/order/answers/flags; hai expiry tests giữ deadline và khóa đáp án | Passed                          |
| CQ48-05     | Node legacy/invalid/account/quiz; E2E legacy/invalid, sign-in/sign-out giữa exam, signed-in reload và lỗi storage vẫn thao tác được với thông báo rõ                                         | Passed                          |
| CQ48-06     | E2E keyboard arrows/focus + geometry 24 tổ hợp viewport/language/theme; visual review và ảnh dưới đây                                                                                        | Passed within browser emulation |

Test nguồn: [Node session regressions](../../../tests/studySession.test.js), [browser feature regressions](../../../tests/e2e/examFeedback.spec.js), [existing application regressions](../../../tests/e2e/app.spec.js).

## Commands and findings

- `yarn verify`: passed — 117 Node tests, UI skill payload 48 files, strict OpenSpec 3/3, catalog 20 banks, lint/format, production build và fixture isolation.
- `yarn test:e2e`: 56/56 passed, retries=0; 19 feature scenarios và 9 existing scenarios chạy trên desktop/phone Chromium.
- Lần chạy đầu phát hiện auth transition có thể tạo draft guest trước khi logout điều hướng xong. App hiện chờ owner ổn định và chuyển về setup trước khi mount phiên mới; sign-in/sign-out tests xác minh cả hai chiều và signed-in reload.
- Các lỗi locator test ban đầu đã được sửa bằng click label Yes/No và scope dropdown theo `aria-controls`, không dùng force/sleep/retry để bỏ qua lỗi. Trace/screenshot ban đầu giữ local ở ignored `artifacts/exam-feedback-48/first-e2e-failures/`.
- Bốn cảnh báo guide-review và cảnh báo bundle size hiện có giữ nguyên; không sửa hash/nội dung bank.
- Rules/emulator plumbing không đổi, nên không chạy lại `yarn test:rules` local cho feature này; CI vẫn chạy baseline suite.

## Visual and accessibility review

- Geometry: 320×844, 390×844, 412×915, 768×1024, 1280×900, 844×390; mọi tổ hợp EN/VN và light/dark đều không tràn ngang. Vùng bấm các lựa chọn mới ít nhất 44×44px. E2E xác minh native arrow-key selection và focus quay về nút Start a new exam sau Cancel.
- Visual samples thực sự xem: setup desktop 1280 EN/light; 390 EN/dark; 320 VN/dark; 412 VN/light; 768 EN/light; long-question Learning 390 EN/dark; submit modal 844×390 VN/dark; results và keyboard focus 390 VN/dark. Các sample không tạo thành một full visual cross-product.
- Text/control labels dùng tokens hiện có. Tính contrast cho các cặp token dùng ở phần mới: text/hint tối thiểu 4.85:1; primary focus/selected border tối thiểu 5.65:1. [Dữ liệu tính từ tokens](evidence/token-contrast.json); đây không phải audit contrast toàn ứng dụng.
- UI/UX Pro Max `input labels` → Forms — Input Labels và Accessibility — Form Labels; nhóm radio có visible label, linked accessible label/description, native keyboard semantics và focus ring. Không thêm animation mới.

| Evidence                        | Before                                                         | After                                                   |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Desktop 1280×900, EN/light      | [Production baseline](evidence/before-setup-1280-en-light.png) | [Feature setup](evidence/after-setup-1280-en-light.png) |
| Phone viewport 390×844, EN/dark | [Production baseline](evidence/before-setup-390-en-dark.png)   | [Feature setup](evidence/after-setup-390-en-dark.png)   |

Before images được chụp lại từ production ở baseline `66f1a8f` vì ảnh full-page ban đầu của browser tool có lỗi capture; after dùng app thật trên Vite E2E service fixtures tại 5175. Chỉ ảnh đã xem và xác minh được đưa vào evidence.

- [Controls 320px VN/dark](evidence/after-controls-320-vi-dark.png)
- [Keyboard focus 390px VN/dark](evidence/keyboard-focus-390-vi-dark.png)
- [Submit modal landscape VN/dark](evidence/submit-844x390-vi-dark.png)
- [Learning results 390px VN/dark](evidence/learning-results-390-vi-dark.png)

## Scope

Không test real account/AI trả phí; dùng service fixtures. Không thay Rules, bank hay triển khai #42. Chưa test physical iPhone/Samsung, Safari/WebKit, bàn phím ảo vật lý hoặc audit screen reader toàn diện. Đây là kiểm tra browser emulation, không chứng nhận thiết bị thật. Không tự merge/deploy/archive trong feature branch.
