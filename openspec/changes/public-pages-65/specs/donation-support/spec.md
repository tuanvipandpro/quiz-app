# Spec Delta

## Purpose

Cho phép người dùng tự nguyện ủng hộ QuizMos bằng chuyển khoản VietQR, với thông tin người nhận minh bạch và thao tác phù hợp cả máy tính lẫn điện thoại.

## ADDED Requirements

### Requirement: CQ-DONATE-01 Optional public support

Ứng dụng SHALL có trang `#/donate` truy cập được không cần đăng nhập, giải thích mục đích ủng hộ; mọi nút Back của trang SHALL về Home/landing. Donate SHALL tự nguyện, không chặn hoặc mở khóa chức năng học tập.

#### Scenario: Visit and refresh

- **WHEN** khách mở link Donate, refresh hoặc đi từ footer/landing
- **THEN** trang Donate mở đúng, có nội dung EN/VN và light/dark theo preference chung; có thể tiếp tục luyện tập mà không chuyển tiền

#### Scenario: Return from donation

- **WHEN** chọn nút Back ở đầu hoặc cuối Donate
- **THEN** trở về Home/landing; Library vẫn truy cập được qua navigation chính

### Requirement: CQ-DONATE-02 Verified static transfer details

Trang SHALL chỉ cung cấp QR và thông tin nhận tiền đã được owner xác minh, cho phép công khai. QR SHALL khớp ngân hàng, số tài khoản và không khóa số tiền; tên hiển thị không được coi là bằng chứng xác minh người nhận từ ngân hàng.

#### Scenario: Verified recipient is available

- **WHEN** cấu hình người nhận và QR hợp lệ đã được kiểm tra trên bản build
- **THEN** trang hiện ngân hàng, tên người nhận, số tài khoản nguyên vẹn, nội dung gợi ý và QR rõ nét trên nền trắng; hướng dẫn kiểm tra người nhận và nhập số tiền trong app ngân hàng

#### Scenario: Missing or invalid configuration

- **WHEN** thiếu cấu hình, asset chưa xác minh hoặc dữ liệu không hợp lệ
- **THEN** trang báo chưa sẵn sàng, không hiện QR hay thao tác chuyển tiền tới tài khoản mẫu; Home/Library vẫn hoạt động

### Requirement: CQ-DONATE-03 Copy and same-device use

Trang SHALL cho phép sao chép số tài khoản/nội dung gợi ý và tải ảnh QR dùng trên cùng điện thoại, với phản hồi đúng kết quả thao tác. Thông tin chuyển khoản SHALL luôn có dạng văn bản đọc được.

#### Scenario: Copy or download succeeds

- **WHEN** người dùng sao chép số tài khoản có số 0 đầu, nội dung gợi ý hoặc tải QR
- **THEN** dữ liệu giữ nguyên, ảnh tải về khớp người nhận và UI chỉ xác nhận thao tác copy/download, không xác nhận thanh toán

#### Scenario: Clipboard or image fails

- **WHEN** clipboard bị từ chối, tải QR thất bại hoặc ảnh không hiển thị
- **THEN** UI giải thích lỗi gần thao tác, cho phép chọn/copy văn bản thủ công; ảnh lỗi không được trình bày như QR hợp lệ và không mất khả năng quay lại Library

#### Scenario: Repeated action followed by navigation

- **WHEN** người dùng bấm copy nhiều lần rồi rời trang trước khi thao tác hoàn tất
- **THEN** kết quả cũ không gây lỗi hoặc thông báo gây hiểu nhầm trên trang mới và không tạo bất kỳ giao dịch nào

### Requirement: CQ-DONATE-04 Honest status and data boundaries

V1 SHALL không suy luận nhận tiền từ mở trang, quét/tải QR hay thao tác xác nhận phía client. Trang SHALL không yêu cầu credential ngân hàng, khóa API, thông tin người gửi hoặc ảnh chứng từ, và không ghi donor/giao dịch vào profile.

#### Scenario: User has scanned or transferred

- **WHEN** người dùng đã quét QR hoặc tự chuyển khoản trong app ngân hàng
- **THEN** QuizMos không hiện trạng thái thanh toán thành công chưa được xác minh; hướng dẫn rõ trang chưa theo dõi giao dịch tự động

#### Scenario: Guest or account change

- **WHEN** khách hoặc bất kỳ tài khoản nào mở trang, đăng xuất hoặc đổi tài khoản
- **THEN** chỉ thông tin người nhận đã duyệt công khai xuất hiện; không thêm đọc/ghi Firestore hoặc Worker cho donate
