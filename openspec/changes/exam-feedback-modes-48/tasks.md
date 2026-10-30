# Tasks

## 1. Session contract

- [x] 1.1 Thêm registry và feedbackMode trong create/restore session; cập nhật caller/test contract, kiểm tra legacy/invalid mode, resume giữ draft, deadline và account/quiz isolation bằng Node tests (CQ48-01, CQ48-04, CQ48-05).

## 2. Exam behavior

- [x] 2.1 Thêm nhóm chọn mode, truyền config qua navigation, notice Resume, feedback và mode label/result; thêm E2E cho hai mode, năm dạng câu hỏi, edit/submit/expiry và refresh/start-new/account isolation; các test chức năng phải đạt (CQ48-01 đến CQ48-05).

## 3. Integrated acceptance

- [x] 3.1 Hoàn thiện responsive/accessibility và translations; kiểm tra 320/390/412/768/1280px, landscape, VN/EN và light/dark, focus/keyboard, lưu before/after evidence và regression geometry cho control mới (CQ48-06).
- [ ] 3.2 Chạy yarn verify và yarn test:e2e, review diff/PR checklist, cập nhật verification matrix và README với kết quả thực tế; mở PR có evidence/limitations, chưa merge hoặc archive (tất cả requirements).

## Workflow follow-up

- Merge khi được yêu cầu; xác nhận production sau deploy, rồi archive/sync spec và đóng #48 khi acceptance/rollout đã rõ.
- Giữ #42 và toàn bộ task custom-quizzes-42 nguyên trạng pending.
