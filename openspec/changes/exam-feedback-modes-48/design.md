# Design

## Context

Xem proposal.md. QuizMode giữ cấu hình cục bộ; App truyền cấu hình qua URL; useStudySession khôi phục một exam draft cho mỗi account/quiz. Question và StructuredQuestion đã chặn feedback khi câu chưa đầy đủ. ExamMode chỉ bật feedback khi submitted.

## Goals / Non-Goals

**Goals:** bổ sung chính sách feedback vào cùng lifecycle, giữ tương thích và kiểm chứng qua app thật dùng service fixtures.

**Non-Goals:** tạo engine thi thứ hai, đổi điểm theo lần trả lời đầu, bật AI trước submit, ghi Firebase hoặc triển khai #42.

## Decisions

- Registry `src/data/examModes.js` sở hữu id, nhãn, mô tả và thuộc tính phản hồi từng câu; lookup nhận giá trị lạ trả Standard. Không rải string điều kiện qua UI.
- Draft bổ sung trường `feedbackMode`; query `feedback` chỉ cung cấp cấu hình lúc tạo mới. Khi restore, session là nguồn sự thật, không phải URL/props. Chọn field bổ sung thay vì đổi session key để URL/draft cũ tiếp tục dùng được.
- `createExamSession` nhận options object chứa clock/random/feedbackMode; cập nhật các caller nội bộ và test. QuizMode cũng truyền một object cấu hình thay vì tiếp tục thêm positional argument.
- Config luôn mặc định Standard cho bài mới. Khi có draft, notice ghi mode đã lưu và giải thích Resume giữ thiết lập cũ, lựa chọn mới chỉ áp dụng cho Start a new exam. Key của QuizMode gồm account để cấu hình không rò giữa tài khoản.
- Chờ account đã ổn định trước khi mount study components. Khi đổi account trong exam, về cấu hình trước khi tạo phiên của account mới; lần hydrate auth đầu tiên vẫn restore deep link/draft bình thường. Regression đã phát hiện thứ tự render/auth cũ có thể tạo draft khách ngoài ý muốn khi logout, nên xử lý tại App, nơi sở hữu navigation và cleanup.
- ExamMode bật feedback sau submit hoặc khi Learning và câu hoàn chỉnh. Navigator vẫn chỉ báo answered/flag khi đang thi, như Practice. AI Explain tiếp tục chỉ có sau submit; không thay service.
- Một nhóm radio có nhãn/description trong phần cấu hình thi; native semantics hoặc Ant Design phù hợp với nhóm chọn hiện có. Reuse study tokens, responsive grid, style focus và min-height 44px. Label mode nằm trong heading cho cả active/results; Learning có giải thích điểm theo đáp án cuối.
- UI/UX Pro Max query `input labels` cho kết quả Forms — Input Labels và Accessibility — Form Labels; áp dụng nhãn hiển thị/accessibility. Các đề xuất native không tự áp dụng lên web.

## Risks / Trade-offs

- [Resume khác lựa chọn mới] → notice phân biệt saved mode và cấu hình mới, test reload/Back/Resume/start-new và URL cũ.
- [Draft cũ/giá trị sai] → normalize về Standard tại boundary create/read, không reset deadline hoặc bộ câu hợp lệ.
- [Học có thể sửa sau khi xem đáp án] → kết quả ghi rõ Learning và dựa trên đáp án cuối, đúng phạm vi issue; không coi là điểm thi độc lập.
- [Một tab bị thiếu storage] → giữ phiên trong bộ nhớ, giữ thông báo draft unavailable, không giả thành công lưu cloud.
- [Expiry/input đồng thời] → giữ kiểm tra deadline tại handler và finishExam idempotent; regression ở cả hai mode.

## Migration Plan

Chạy unit/E2E và review ảnh trên service fixtures, mở một PR có spec/code/evidence. Không đổi Rules hay production data. Merge được yêu cầu mới kích hoạt CI deploy website. Rollback code quay về Standard; field mới không ảnh hưởng reader cũ. #42 giữ nguyên pending. Archive/sync spec và xác nhận production sau review/rollout, không đóng issue chỉ vì planning hoàn tất.
