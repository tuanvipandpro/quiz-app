# Tasks

Các checkbox theo dõi implementation và rollout của #42. PR setup để tất cả task mở; lần triển khai này chỉ đánh dấu task có bằng chứng thực tế. Đối chiếu/deploy production được giữ riêng, không xem như hoàn tất chỉ vì local tests xanh.

## 1. Contracts and validation

- [x] 1.1 Định nghĩa custom-quiz identity/envelope, constants và error contract theo D1–D4 (CQ-02, CQ-04, CQ-08, CQ-09); verify bằng unit tests cho instance/version/byte-budget boundaries và cập nhật design nếu default thay đổi.
- [x] 1.2 Tái sử dụng validator cho import/stored reads (CQ-03); verify 1/100 hợp lệ, 0/101 không hợp lệ, duplicate IDs, malformed JSON và đủ formats trong unit tests.
- [x] 1.3 Thêm serialization size checks và retry-safe candidate (CQ-04, CQ-05); verify fixture dưới/trên budget và server-size rejection không mất preview.

## 2. Rules and persistence service

- [x] 2.1 Thêm explicit customQuizzes slot rules, ownership/field/type/list-count checks và version transitions (CQ-01, CQ-02, CQ-03, CQ-08); verify direct SDK adversarial cases bằng Emulator và giữ toàn bộ baseline profile tests xanh.
- [x] 2.2 Implement transactional create với stable operation/instance ID (CQ-02, CQ-05); verify hai uploads tranh slot cuối, retry sau response loss và double submit không ghi đè/nhân đôi.
- [x] 2.3 Implement transactional rename/replace/delete (CQ-06, CQ-07, CQ-08); verify stale revision, deleted/reused slot, cancel không mutate, quota không tăng khi replace và được giải phóng khi delete.
- [x] 2.4 Implement checkpoint updates gắn instance/contentVersion (CQ-07, CQ-09); verify rename giữ progress, replace reset atomic, delete loại bỏ progress và không đổi bank checkpoints.
- [x] 2.5 Thêm service documentation gần API và review index exemption cho questions (CQ-04, CQ-12); verify không deploy cấu hình indexes ghi đè ngoài phạm vi và ghi lại cost/size trade-off.

## 3. Account state and study integration

- [x] 3.1 Thêm custom-quiz hook/store với account/request generations và lazy loading (CQ-01, CQ-11); verify late response sau logout/switch account và lỗi private loading không chặn bank.
- [x] 3.2 Tích hợp route/loaded identity và draft keys có discriminator/instance/version (CQ-08, CQ-09); verify deeplink, reload, stale cache, giữ shuffle/answers/flags/deadline và invalidation khi replace.
- [x] 3.3 Giữ guest local upload và thêm explicit save transition (CQ-12); verify login không tự migrate upload/progress và bank aliases/checkpoints không đổi.

## 4. Management UI

- [x] 4.1 Thêm list/quota và preview-save flow (CQ-02, CQ-03, CQ-10); verify quota 0/3..3/3, loading/empty/success, full quota và tất cả failure states bằng E2E.
- [x] 4.2 Thêm rename, replace, delete và confirmations (CQ-06, CQ-07, CQ-08, CQ-10); verify Cancel giữ dữ liệu, conflict hướng dẫn reload và errors giữ candidate.
- [x] 4.3 Tái sử dụng Practice/Exam và Quick Summary availability đúng capability (CQ-09); verify các formats, resume, submit và thiếu guide trong E2E.
- [x] 4.4 Review UI theo AGENTS.md (CQ-10): 320/390/412/768/1280px, VN/EN, light/dark, focus/safe-area/long text; lưu screenshots và ghi rõ emulation so với thiết bị thật.

## 5. Acceptance and rollout

- [x] 5.1 Chạy toàn bộ acceptance matrix CQ-01..CQ-12, `yarn verify:all`, kiểm tra scope và cập nhật evidence thật trong verification.md; không dùng planningComplete làm bằng chứng feature hoàn tất.
- [ ] 5.2 Đối chiếu rules/indexes đang publish và kiểm tra drift so với baseline được cung cấp (CQ-01, CQ-12); lưu nguồn/hash/revision đã xác minh trước rollout.
- [ ] 5.3 Chuẩn bị release/rollback và thực hiện rollout theo chỉ dẫn của người dùng (CQ-01, CQ-12); verify rules tương thích đã có hiệu lực trước khi enable client và ghi trạng thái production thực tế.

## Workflow follow-up

- Archive change và đồng bộ main specs chỉ sau khi implementation/evidence được review và rollout status đã rõ.
- Chỉ đóng issue #42 khi các acceptance criteria thực sự đạt; setup PR không đóng issue.
