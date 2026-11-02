# Proposal

## Why

QuizMos hiện mở thẳng Quiz Bank, nên người mới thiếu phần giới thiệu cách học và chưa có nơi ủng hộ dự án. Thêm landing page ưu tiên dark theme và trang donate giúp người dùng hiểu sản phẩm, bắt đầu luyện tập hoặc hỗ trợ duy trì ứng dụng.

Tracking: [issue #65](https://github.com/tuanvipandpro/quiz-app/issues/65). Loại `feature`, rủi ro trung bình do thay đổi entry route và navigation dùng chung. Owner đã yêu cầu implementation trên nhánh `codex/public-pages-65`; chưa merge hoặc triển khai.

## What Changes

- Review tiếp ngày 02/11/2026: chuyển màu/animation giữa section mượt hơn, thêm nội dung hỗ trợ trên desktop từ catalog/learning flow, giữ mobile gọn; CTA cuối cùng tông nền với landing. Donate đổi thành lời mời một ly cà phê, giữ đầy đủ thông tin/thao tác chuyển khoản.

- Root không có hash và `#/` mở Home; CTA mở `#/library`. Giữ đường dẫn quiz, alias, query và checkpoint hiện có. Không tự chuyển hướng người quay lại theo cookie/lịch sử sử dụng.
- Landing gồm hero, preview sản phẩm, Practice/Exam/study guides, bank nổi bật AIP-C01/CCAR-P và CTA cuối trang. Giữ tên chính thức **QuizMos**, không đổi thành QuizMoss.
- Revision owner ngày 02/11/2026: landing gồm 4 section full-width, cao tối thiểu một viewport dưới header và scroll snap; thêm reveal/transition, nền tương phản, section navigation và reduced-motion fallback. Donate nổi bật ở header/hero; các nút Back trên Donate về Home.
- Trang `#/donate` không yêu cầu đăng nhập: giải thích mục đích ủng hộ, VietQR tĩnh đã xác minh, thông tin người nhận, sao chép số tài khoản/nội dung và tải ảnh QR để dùng trên cùng điện thoại.
- Public pages ưu tiên dark khi chưa có lựa chọn theme; giữ lựa chọn light/dark đã lưu, EN mặc định và VN. Không thay default của link vào trực tiếp Library/quiz.
- Không tự xác nhận giao dịch, lưu donor, đặt mục tiêu tiền, mở khóa nội dung, gọi API ngân hàng hoặc thêm backend. Người dùng nhập số tiền trong app ngân hàng; QR chọn không khóa số tiền.

Owner đã xác nhận ngày 01/11/2026: mọi người mở domain chính đều thấy landing, nút “Start practicing” mở Library; Donate V1 hiển thị VietQR và thông tin chuyển khoản, chưa tự xác nhận đã nhận tiền. Landing và Donate đã được implement để review trên PR. QR đã tạo offline, giải mã đối chiếu payload và owner đã quét xác nhận đúng người nhận/số tài khoản. Donate được bật trong cấu hình; [design](design.md#3-donate-bằng-qr-tĩnh) ghi nhận xác minh. Merge và verification sau triển khai vẫn còn mở.

## Capabilities

### New Capabilities

- `public-home`: landing, entry route, navigation, theme và nội dung giới thiệu QuizMos.
- `donation-support`: trang ủng hộ bằng VietQR tĩnh, thông tin chuyển khoản và trạng thái không khả dụng.

### Modified Capabilities

Không thay đổi requirement của spec `user-profile-access`. Không sửa scope rollout #42, #52 hoặc #53.

## Impact

- Thêm page components; cập nhật `App.jsx`, `AppHeader.jsx`, `useHashRoute.js`, `utils/navigation.js`, translations, tokens/styles và metadata ở các điểm cần thiết.
- Điều chỉnh test nào đang dùng root như shortcut vào Library; thêm regression cho Home/Donate, deep link, theme và exam leave guard.
- Giữ React/Ant Design, GitHub Pages, hash routing và `BASE_URL`; chưa cần dependency, API key hoặc hạ tầng mới. QR là asset nguồn được owner duyệt công khai, không phải credential.
- Routing, auth và CI tái sử dụng hạ tầng hiện có. Hai trang và asset donate đã có, owner đã xác minh người nhận; verification sau triển khai vẫn còn mở. Một feature PR cho change này; task nhỏ không tương ứng một PR riêng.

VietQR.io thông báo Generate API dừng từ 01/01/2027, Quicklink ưu tiên SVG và portal dừng nhận template mới. V1 dùng QR tĩnh đã xác minh để tránh phụ thuộc các API này; QR động theo số tiền là scope sau nếu được yêu cầu. Nguồn: [thông báo chính thức](https://www.vietqr.io/thong-bao-cap-nhat), [Quicklink](https://www.vietqr.io/qr-dong).
