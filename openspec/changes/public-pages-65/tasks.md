# Tasks

Tracking: [#65](https://github.com/tuanvipandpro/quiz-app/issues/65). Implementation và verification local theo checklist dưới đây; owner đã xác nhận QR đúng người nhận và số tài khoản. Donate V1 không tự xác nhận giao dịch; xem [proposal](proposal.md). Requirement-to-test matrix nằm trong [design](design.md#verification-plan); evidence, PR/CI và rollout được ghi ở issue.

## 1. Nội dung và bố cục

- [x] 1.1 Chốt copy EN/VN và wireframe Home/Donate theo dark navy + accent xanh; kiểm tra CTA chính, preview minh họa, featured banks và lời giải thích donate với owner trước khi code. Đầu ra: copy/layout review trong issue, không thêm bộ tài liệu riêng. CQ-HOME-02, CQ-DONATE-01/04.

## 2. Routing và shell

- [x] 2.1 Thêm Home/Donate vào parser và default hash, giữ Library fallback cho link sai. Bổ sung unit vào `tests/uiCatalog.test.js` cho root, donate, alias/query, malformed links; E2E cho reload và Back/Forward. CQ-HOME-01, CQ-DONATE-01.
- [x] 2.2 Nối page components, logo/Home, footer/Donate, active nav, title và focus/scroll qua guard hiện có. Kiểm tra E2E CTA, exam Leave/Cancel/resume/rapid clicks và auth loading/account transition; test Library cũ chuyển sang route explicit khi phù hợp. CQ-HOME-01/04, CQ-DONATE-01.
- [x] 2.3 Thêm dark-first cho entry public, giữ saved theme và default system cho direct study link. Unit preference gồm saved/empty/invalid/storage-error; E2E saved light, fresh dark, switch theme và EN/VN. CQ-HOME-03.

## 3. Landing page

- [x] 3.1 Dựng hero, product preview nhẹ và CTA chính bằng tokens/Ant Design. Kiểm tra render 320px/1280px, keyboard/contrast và start-as-guest; preview không khởi tạo quiz session hoặc gọi AI. CQ-HOME-02/04.
- [x] 3.2 Thêm Practice/Exam/guides, AIP-C01/CCAR-P từ registry và CTA cuối trang; cập nhật metadata chung. Verify đúng nội dung/capability, link overview, EN/VN và cuộn section không đổi route. CQ-HOME-02/04.
- [x] 3.3 Chia landing thành 4 section full-width/min-viewport, scroll snap và điều hướng section; E2E kích thước, wheel nhỏ 120px/keyboard/nav, hash không đổi, nội dung mobile/zoom không bị crop và cleanup khi rời Home. CQ-HOME-05.
- [x] 3.4 Thêm nền tương phản, reveal/orbit/transition phù hợp, tôn trọng reduced motion; review contrast, focus và nội dung luôn đọc được khi observer/motion không khả dụng. CQ-HOME-04/05.

- [x] 3.5 Review polish: ambient gradient/accent crossfade, transition giữa section, desktop catalog/learning details và finale cùng tông; test density desktop/mobile, reduced motion, contrast và ảnh render. CQ-HOME-07.

## 4. Donate page

- [x] 4.1 Tạo schema/config public recipient với disabled mặc định từ thông tin owner đã cung cấp trong bản nháp local; unit thiếu/sai config và account có số 0 đầu. Chuẩn bị QR không khóa số tiền, decode đối chiếu BIN/account/memo và owner kiểm tra người nhận trước activation. Ghi kết quả trong issue; nhận thông tin tài khoản chưa hoàn tất task hoặc xác minh người nhận. CQ-DONATE-02/04.
- [x] 4.2 Dựng layout Donate, QR nền trắng, thông tin người nhận, hướng dẫn nhập amount và unavailable/image-error states. Dùng fixture trong lúc chờ 4.1; E2E guest/direct URL/reload, thiếu config, lỗi ảnh và không có donate API/profile IO. CQ-DONATE-01/02/04.
- [x] 4.3 Thêm copy account/note, download QR cùng origin và fallback thủ công trên điện thoại. E2E clipboard success/denied, giữ số 0 đầu, file download khớp asset, click lặp/unmount và không báo nhận tiền. CQ-DONATE-03/04.
- [x] 4.4 Làm Donate nổi bật ở header/hero/final CTA; đổi mọi nút Back trong Donate về Home. E2E entry nhìn thấy ở phone/desktop, Back trên/dưới và exam guard qua Donate. CQ-HOME-06, CQ-DONATE-01.

- [x] 4.5 Thiết kế Donate thành coffee invitation, giữ đầy đủ receiving details/QR/copy/download/error states và Back Home. Test EN/VN, hai theme, mobile/desktop và không có amount picker gây hiểu nhầm. CQ-DONATE-05.

## 5. Tích hợp và phát hành

- [x] 5.1 Review lại revision full-screen toàn flow Home → Library → quiz → Donate; kiểm tra 320/390/412/768/1280px và landscape, EN/VN, hai theme, keyboard/text zoom/reduced motion bằng matrix có chọn lọc. Ghi trạng thái requirement-to-test trong issue, cập nhật ảnh production review ngoài Git. CQ-HOME-01..06, CQ-DONATE-01..04.
- [ ] 5.2 Chạy `yarn verify` và E2E liên quan, review diff và redacted secret scan staged/outgoing trước push. Tạo một feature PR `Refs #65`, liên kết về issue, chờ required CI latest head; không tạo một PR cho mỗi task hoặc rerun không có lý do. Đầu ra: link PR, commit, kết quả checks và phần chưa verify.
- [ ] 5.3 Khi user yêu cầu merge và CI pass: merge, chờ post-merge CI/deploy; smoke HTTPS root/Home/Library/Donate, deep link cũ, QR/download và xác nhận người nhận ở bản deploy. Chỉ close #65 sau accepted scope pass; thiếu QR xác minh hoặc rollout thì vẫn mở. CQ-HOME-01..04, CQ-DONATE-01..04.

Dependencies: 1.1 → 2.1 → 2.2; 2.3 → 3.1 → 3.2. Có thể chuẩn bị 4.1 độc lập trong lúc làm landing; 4.2/4.3 dùng fixture nhưng activation cần hoàn tất 4.1. 2.x + 3.x + 4.x → 5.1 → 5.2 → 5.3. Task là đơn vị làm/review nhỏ, không phải yêu cầu nhiều nhánh hoặc nhiều agent.

## Workflow follow-up

- Đồng bộ/archive OpenSpec khi feature đã được nghiệm thu theo workflow của project; planning complete không đồng nghĩa implementation complete.
