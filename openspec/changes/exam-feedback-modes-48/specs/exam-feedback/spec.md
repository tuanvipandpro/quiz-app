# Spec Delta

## Purpose

Cho phép chọn cách xem đáp án khi thi thử, giữ chính sách đó xuyên suốt phiên thi và phân biệt kết quả học có phản hồi với thi tiêu chuẩn.

## ADDED Requirements

### Requirement: CQ48-01 Explicit exam feedback selection

Ứng dụng SHALL cho chọn Standard exam hoặc Learning exam trước khi bắt đầu Mock exam, mặc định Standard. Lựa chọn chỉ thuộc Mock exam và dùng được với bank hoặc custom quiz hiện có.

#### Scenario: New exam setup

- **WHEN** người dùng mở cấu hình Mock exam cho bank hoặc upload
- **THEN** Standard được chọn, cả hai lựa chọn có nhãn và mô tả; Practice và Quick Summary giữ hành vi cũ

### Requirement: CQ48-02 Standard feedback boundary

Standard SHALL giấu đúng/sai, đáp án và lời giải trong UI khi bài thi chưa kết thúc; submit hoặc hết giờ mới mở review.

#### Scenario: Answer before submission

- **WHEN** trả lời đầy đủ hoặc chưa đầy đủ trong Standard
- **THEN** không hiện feedback, correct-answer styles, giải thích hoặc trạng thái đúng/sai trên navigator

#### Scenario: Finished standard exam

- **WHEN** nộp bài hoặc deadline đã qua
- **THEN** đáp án được hiển thị và câu trả lời không sửa được

### Requirement: CQ48-03 Learning feedback matches answer completeness

Learning SHALL hiện feedback từng câu khi câu trả lời đầy đủ, cho phép sửa trước khi kết thúc và chấm theo đáp án cuối. Hành vi áp dụng cho single, multiple, yes/no và hai dạng dropdown; không tự gọi AI.

#### Scenario: Complete and incomplete answers

- **WHEN** chọn một đáp án single, đủ số lựa chọn multiple, hoặc đủ mọi phần yes/no và dropdown
- **THEN** câu hiện tại hiển thị đúng/sai và đáp án; câu còn thiếu không lộ đáp án

#### Scenario: Edit after feedback

- **WHEN** sửa câu trả lời rồi nộp bài
- **THEN** kết quả dùng đáp án cuối, ghi rõ Learning exam và khóa chỉnh sửa

### Requirement: CQ48-04 Preserve exam lifecycle and identity

Cả hai chế độ SHALL giữ timer, thứ tự random, đáp án, flag, xác nhận rời/nộp bài và tính bất biến khi đã kết thúc. Refresh, Back và Resume không đổi cấu hình của draft; đổi chế độ cần bắt đầu bài mới có xác nhận nếu thay draft đang chạy.

#### Scenario: Resume after changing setup

- **WHEN** thay lựa chọn ở cấu hình rồi Resume bài đang chạy, hoặc mở lại URL cũ có giá trị khác
- **THEN** chế độ, deadline, câu và đáp án từ draft được giữ; bắt đầu bài mới mới dùng lựa chọn mới

#### Scenario: Expiry races with input

- **WHEN** deadline qua trong lúc thao tác hoặc trong khi đang rời trang
- **THEN** bài kết thúc một lần, không thêm thời gian hoặc ghi đáp án sau deadline; review vẫn khả dụng

### Requirement: CQ48-05 Safe compatibility and account isolation

Draft/URL thiếu hoặc có chế độ không hợp lệ SHALL dùng Standard mà không reset dữ liệu hợp lệ khác. Phiên theo account và quiz vẫn được cô lập; lỗi browser storage phải được báo bằng trạng thái draft hiện có.

#### Scenario: Legacy and invalid values

- **WHEN** mở draft cũ hoặc URL với giá trị chế độ không nhận diện
- **THEN** Standard được dùng, giữ deadline/order/answers/flags hợp lệ và không lộ feedback sớm

#### Scenario: Account or quiz changes

- **WHEN** đổi account hoặc bắt đầu bài của quiz khác
- **THEN** không tái sử dụng chế độ/đáp án của phiên trước; state thuộc account cũ được dọn theo hành vi hiện có

### Requirement: CQ48-06 Accessible responsive mode communication

UI SHALL ghi rõ chế độ trong bài thi và kết quả, hỗ trợ VN/EN và light/dark. Nhóm lựa chọn phải có accessible label, focus bàn phím rõ, vùng bấm ít nhất 44×44px, nội dung không tràn ngang từ 320px.

#### Scenario: Phone and keyboard use

- **WHEN** dùng cấu hình, modal và màn thi/kết quả ở 320/390/412/768/1280px hoặc landscape
- **THEN** nhãn và phản hồi rõ ràng, control thao tác được bằng touch/keyboard, focus qua dialog có thể tiếp tục được
