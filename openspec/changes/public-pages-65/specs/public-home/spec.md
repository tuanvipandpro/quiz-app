# Spec Delta

## Purpose

Cung cấp điểm vào giới thiệu QuizMos trước khi luyện tập, đồng thời bảo toàn đường dẫn, dữ liệu học tập và quyền truy cập hiện có.

## ADDED Requirements

### Requirement: CQ-HOME-01 Public entry and compatible deep links

Ứng dụng SHALL mở Home tại URL không có hash hoặc `#/`, giữ `#/library`, `#/my-quizzes` và đường dẫn quiz hiện có. Lựa chọn entry không phụ thuộc đăng nhập hay lần truy cập trước.

#### Scenario: Direct home and library entry

- **WHEN** khách hoặc người đã đăng nhập mở root hoặc `#/`, kể cả sau lần sử dụng trước
- **THEN** Home xuất hiện; CTA mở `#/library`; mở trực tiếp `#/library` vẫn tới Quiz Bank và refresh giữ nguyên trang

#### Scenario: Existing links and malformed links

- **WHEN** mở quiz có alias `aws-ace`, query resume/question hoặc một hash sai định dạng
- **THEN** quiz tiếp tục canonicalize thành Google ACE và giữ query; hash sai vẫn fallback về Library như hiện tại

### Requirement: CQ-HOME-02 Useful and accurate introduction

Home SHALL giới thiệu Practice, Exam và study guides, có preview sản phẩm, link AIP-C01/CCAR-P và CTA luyện tập rõ ràng. Nội dung SHALL phản ánh tính năng thực tế, dùng tên QuizMos và không đưa số liệu, testimonial hoặc cam kết đỗ thi không có căn cứ.

#### Scenario: Start without signing in

- **WHEN** khách chọn CTA chính hoặc một bank nổi bật
- **THEN** Library hoặc overview của bank tương ứng mở mà không buộc đăng nhập; section giới thiệu nội bộ không làm thay đổi quiz route

### Requirement: CQ-HOME-03 Dark-first public entry with retained preferences

Home và Donate SHALL khởi tạo dark khi chưa có preference hợp lệ, giữ theme đã lưu và cho phép đổi light/dark. Link vào trực tiếp Library/quiz SHALL giữ fallback theo hệ thống hiện có; chuyển trang không tự reset theme. EN SHALL là ngôn ngữ mặc định và VN tiếp tục khả dụng.

#### Scenario: New public visit and explicit preference

- **WHEN** mở Home hoặc Donate với storage trống hoặc không truy cập được, kể cả hệ thống đang light
- **THEN** trang dùng dark; nếu đã lưu light thì dùng light; người dùng vẫn đổi theme/ngôn ngữ được

#### Scenario: Direct study entry and navigation

- **WHEN** mở trực tiếp Library/quiz với storage trống, rồi chuyển giữa các trang
- **THEN** theme ban đầu theo hệ thống như trước và giữ theme đang dùng khi chuyển trang; lựa chọn người dùng được giữ sau reload nếu storage khả dụng

### Requirement: CQ-HOME-04 Safe navigation and public accessibility

Home và Donate SHALL dùng cùng hợp đồng navigation, title, focus và accessibility của ứng dụng; không xóa draft/checkpoint hay thay quyền tài khoản khi chuyển trang. Public content SHALL đọc được khi auth đang loading hoặc gặp lỗi.

#### Scenario: Leave an active exam

- **WHEN** người dùng đang thi bấm logo/Home/Donate hoặc dùng Back/Forward, kể cả click liên tiếp
- **THEN** chỉ một quyết định rời bài thi có hiệu lực; Cancel giữ bài thi và timer; xác nhận rời giữ khả năng resume theo hợp đồng hiện tại

#### Scenario: Keyboard and small-screen visit

- **WHEN** dùng bàn phím hoặc màn hình 320px với EN/VN, light/dark, text zoom hoặc reduced motion
- **THEN** điều hướng, CTA, heading và focus vẫn rõ, không tràn ngang; control chính tối thiểu 44px và chữ thường đạt contrast 4.5:1

#### Scenario: Account transition while on a public page

- **WHEN** auth chậm, lỗi hoặc đổi tài khoản trong lúc xem Home/Donate
- **THEN** nội dung công khai vẫn dùng được và không hiển thị draft/checkpoint riêng của tài khoản trước
