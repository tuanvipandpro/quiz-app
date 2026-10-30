# Proposal

## Why

[Issue #48](https://github.com/tuanvipandpro/quiz-app/issues/48) cần hai cách làm Mock exam: thi tiêu chuẩn chỉ xem đáp án khi kết thúc, và thi có phản hồi từng câu để học trong lúc làm bài. Hiện ExamMode chỉ bật feedback sau submit, còn Practice đã có renderer và validator phù hợp để tái sử dụng.

## What Changes

- Thêm lựa chọn Standard exam (mặc định) / Learning exam trong cấu hình thi, có mô tả VN/EN.
- Learning hiện feedback khi câu trả lời đầy đủ; vẫn sửa được trước khi nộp, giữ timer/random/flags và chấm theo đáp án cuối.
- Lưu chế độ trong draft, hiển thị trong bài và kết quả. Resume giữ cấu hình đã lưu; đổi chế độ cần bắt đầu bài mới.
- Tương thích draft/URL cũ bằng Standard, bảo toàn account/quiz isolation.
- Kiểm tra các dạng câu hỏi, responsive, theme/language, resume, nộp bài và hết giờ.

## Capabilities

### New Capabilities

- `exam-feedback`: lựa chọn, hiển thị và bảo toàn chính sách xem đáp án trong Mock exam.

### Modified Capabilities

Không thay đổi capability hiện có. `user-profile-access` không liên quan đến thay đổi này.

## Impact

Ảnh hưởng QuizMode, ExamMode, App orchestration, session helpers, translations và stylesheet study; dùng chung Question/StructuredQuestion. Không thêm dependency, sửa Firebase Rules, đổi bank/checkpoint hay triển khai #42. OpenSpec/Emulator đã bootstrap ở #47; change này triển khai feature #48 trong một PR, chỉ merge khi được yêu cầu. Không mở rộng AI Explain hoặc thêm chống gian lận.
