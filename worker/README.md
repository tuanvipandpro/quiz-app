# App AI — Cloudflare Free

Worker phục vụ `GET /v1/usage` và `POST /v1/explanations`. Mọi request cần Firebase ID token đúng project; guest tiếp tục Gemini/Groq BYOK. Quiz/profile/progress vẫn ở Firestore. D1 chỉ lưu request ledger và kết quả riêng tư; cron hằng ngày dọn records cũ hơn hai ngày (dữ liệu có thể còn đến lượt cron kế tiếp). Không deploy hoặc gọi AI thật khi chạy tests.

## Local verification

`yarn test:worker` dùng Miniflare D1 thật, signed RSA JWT fixtures và inference stub. `yarn test:e2e` mở API test loopback 5176 cùng Vite 5174; endpoint `/__test/*` chỉ nằm trong fixture Node, không thuộc Worker. `yarn worker:check` bundle dry-run. CI chạy ba nhóm checks trước publish website; không tự deploy Worker.

## Setup cần người dùng thực hiện

Khi làm việc qua remote, dùng `yarn wrangler login --device --browser=false`: mở link và nhập mã trên thiết bị đang sử dụng; máy remote tự nhận kết quả. Có thể chọn `--use-keyring` để dùng kho khóa của hệ điều hành. Trên Windows, Wrangler yêu cầu helper `@napi-rs/keyring@1.3.0`; nếu đã cài helper global nhưng terminal cũ chưa nhận, mở terminal mới để nhận PATH Windows. `whoami` xác nhận đăng nhập, không xác nhận gói Workers Free. Subscription API có thể trả 403 với OAuth scopes của Wrangler; khi đó cần owner xác nhận gói từ Dashboard trước khi tạo tài nguyên/gọi model.

1. Trong Cloudflare Dashboard xác nhận account đang **Workers Free**. Không upgrade, mua AI Gateway credits hoặc chọn model yêu cầu payment method. Repository không thể tự xác minh trạng thái billing từ cấu hình Wrangler.
2. Chạy `yarn wrangler login` trên máy của bạn; giữ token trong CLI credential store, không gửi vào chat hoặc commit. Nếu CLI đã đăng nhập, dùng `yarn wrangler whoami` để xác nhận account.
3. Tạo D1: `yarn wrangler d1 create quiz-app-ai`. Thay `database_id` trong `worker/wrangler.jsonc` bằng ID trả về. Binding `DB`, AI binding `AI` và project ID Firebase đã khai báo. Không cần R2 hay domain riêng.
4. Giữ `APP_AI_ENABLED=false`; kiểm tra `ALLOWED_ORIGINS` đúng origin GitHub Pages. Local origin chỉ thêm khi cần, không dùng wildcard. Chạy `yarn wrangler d1 migrations apply quiz-app-ai --remote --config worker/wrangler.jsonc` sau review migration.
5. Deploy disabled: `yarn wrangler deploy --config worker/wrangler.jsonc`. Đây là thao tác production phải theo chỉ dẫn rollout của user. Worker nhận URL `https://quiz-app-ai.<subdomain>.workers.dev`; API URL là public config, không phải secret.
6. Dùng staging riêng để benchmark model, CPU JWT/validation và Neurons bằng sample được chỉ định. Test độ đúng cho AWS/Google/Anthropic, tiếng Việt/Anh và các formats; model nhỏ không mặc định đạt chất lượng certification. Workers Free có 10ms CPU/request nên cần đo cả warm/cold key cache. Không lấy fixture output làm bằng chứng quality.
7. Chỉ sau khi Free/quality/CPU được xác minh: bật `APP_AI_ENABLED=true`, deploy lại, set `VITE_APP_AI_URL` lúc build frontend. CI build phải nhận URL qua repository variable cùng tên (đã nối trong workflow). Smoke test auth/quota/BYOK bằng account được chỉ định. Không merge client bật App AI khi backend chưa ready.

## Môi trường thử riêng

`wrangler.staging.jsonc` dành cho Worker và D1 `quiz-app-ai-staging`, chỉ cho phép origin local 5173. Account đã được xác minh Workers Free trên Dashboard; staging được bật riêng để smoke test bằng tài khoản user chỉ định. Không dùng database production cho benchmark. Giữ production disabled cho đến khi kết quả quality/CPU/usage và smoke auth được review. Model catalog có sẵn và `default_usage_model=standard` không phải bằng chứng account đang dùng Free.

## Quota và lỗi

- Mặc định 5 attempts/user/ngày và 100 attempts/app/ngày, fixed SQL triggers; thay đổi cần cập nhật policy và migration cùng test. UID lấy từ verified token, không đọc body UID.
- Request ID = ngày UTC + UUID v4. Reservation atomic; một request pending/user. Cùng ID và fingerprint trả outcome cũ; payload đổi bị conflict. Qua UTC day, ID cũ hết hạn để cleanup không tạo lại request. Reset hiển thị theo timezone browser.
- Request đã dispatch có thể dùng Neurons dù timeout/provider failure, nên vẫn tính attempt. Retry không dispatch lại; Regenerate là attempt mới. Pending sau crash hết lease 120s trở thành TIMEOUT, không tự chạy lại. Client cancellation không có nghĩa provider chưa chạy.
- Kết quả dùng chung theo request của đúng UID; frontend cache 30 phút/100 entries và xóa khi account đổi. Không public cache, không log token/key/question/result. Cron dọn records quá hai ngày.
- 16KiB body, 12KiB tổng system/user prompt UTF-8, 600 output tokens, 25s inference deadline. Model allowlist hiện chỉ `@cf/aisingapore/gemma-sea-lion-v4-27b-it`; không nhận model hay prompt tự do từ client. Prompt có system instruction và nội dung theo VN/EN; question/reference là dữ liệu chưa xác minh. Chat completion phải kết thúc `stop`; nội dung rỗng, bị cắt hoặc gọi tool bị từ chối.
- Account Free có 10,000 Neurons/ngày dùng chung tất cả Workers AI. App request quota không tương đương Neuron budget; platform exhaustion phải báo unavailable, không paid fallback. D1 outage cũng fail closed.

## Rollback và trạng thái

Disable `APP_AI_ENABLED` hoặc gỡ frontend API URL để trở về BYOK có thông báo. Không xóa D1 dữ liệu để rollback. #53 còn pending production rollout; xem `openspec/changes/app-ai-worker/rollout.md` để biết bằng chứng live và giới hạn đánh giá. #42 và #52 không bị đóng bởi feature này.

Nguồn đối chiếu: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
