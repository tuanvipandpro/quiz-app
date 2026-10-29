# Proposal

## Why

[Issue #42](https://github.com/tuanvipandpro/quiz-app/issues/42) cần lưu quiz cá nhân để người dùng học tiếp trên thiết bị khác. Hiện app đã có upload/preview, kiểm tra 1–100 câu và giữ upload trong tab; chưa có lưu quiz Firestore, quota ba quiz hay quản lý nội dung cloud.

## What Changes

- Thêm danh sách quiz riêng tư theo tài khoản, quota 0/3 và luồng lưu sau preview.
- Hỗ trợ đổi tên, thay JSON và xóa với quy tắc rõ ràng về slot, version và tiến trình.
- Chặn vượt quota, truy cập chéo tài khoản và dữ liệu số lượng sai bằng Rules; dùng transaction để xử lý ghi đồng thời và tab cũ.
- Tái sử dụng Practice/Exam và validator, phân biệt ID bank/custom; giữ local guest upload như hiện tại, chỉ lưu cloud sau khi đăng nhập và bấm lưu.
- Bổ sung service/unit, Emulator và E2E tests theo từng requirement.

Đây là **đề xuất tính năng**, chưa được implement trong PR setup. PR setup chỉ thêm OpenSpec, baseline rules được người dùng cung cấp, Emulator runner/tests và CI. Không deploy rules, không migrate dữ liệu hay tự lưu upload cũ lên cloud.

## Capabilities

### New Capabilities

- `custom-quizzes`: quyền sở hữu, quota, validation, quản lý quiz, identity/progress, trải nghiệm mobile và xử lý lỗi.

### Modified Capabilities

Không thay đổi hợp đồng `user-profile-access`: quyền truy cập profile/checkpoint hiện tại phải được giữ. Quyền trên subcollection custom quiz sẽ được thêm riêng.

## Impact

- Dự kiến sửa MyQuizzes, App routing/loading, thêm service/hook/config cho custom quiz và cập nhật Rules/tests.
- Dữ liệu dự kiến ở `users/{uid}/customQuizzes/{slotId}`, tách khỏi profile chứa AI settings.
- Ngoài phạm vi: public sharing, question editor, đổi auth provider, redesign Quiz Bank, sửa câu hỏi bank, review study guides.
- Merge PR setup cho phép review planning; các task tính năng và việc đóng issue #42 vẫn đang chờ. Một feature bình thường dùng một MR; không bắt buộc hai MR cho mọi lần dùng SDD.
