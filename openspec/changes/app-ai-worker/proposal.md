# Proposal

## Why

[Issue #53](https://github.com/tuanvipandpro/quiz-app/issues/53): user đăng nhập cần lời giải AI mà không phải tạo API key. Guest tiếp tục BYOK; chi phí Cloudflare phải ở gói Free.

## What Changes

- Thêm API Worker xác thực Firebase, model miễn phí cố định và validation chung.
- D1 quản lý quota atomic, request identity và cache kết quả riêng tư; mặc định thử nghiệm 5 lượt/user/ngày, 100 lượt/app/ngày và 600 output tokens.
- Chọn App AI/BYOK rõ ràng, quota/reset/error states VN/EN; giữ BYOK cho guest và không tự fallback.
- Tests local, UI evidence và hướng dẫn Cloudflare setup/rollout; production enablement chờ account setup và benchmark.

## Capabilities

### New Capabilities

- `app-ai-explanations`: quyền truy cập, inference giới hạn, quota/retry/cache và trải nghiệm chọn nguồn AI.

### Modified Capabilities

Không thay đổi user-profile-access. Firebase/Firestore và hosting hiện tại tiếp tục dùng như hiện tại.

## Impact

Worker mới, dependencies Wrangler/Miniflare/jose, service AI/hook/dialog/settings và browser tests. Không migration storage #52, đổi bank answers hay mở chatbot tổng quát. User đã yêu cầu implement; SDD được chuẩn bị trước code trong cùng feature PR. Setup production và model quality là bước có evidence riêng.
