# App AI — Cloudflare Free

Worker phục vụ `GET /v1/usage` và `POST /v1/explanations`. Mọi request cần Firebase ID token đúng project; guest tiếp tục Gemini/Groq BYOK. Quiz/profile/progress vẫn ở Firestore. D1 chỉ lưu request ledger và kết quả riêng tư; cron hằng ngày dọn records cũ hơn hai ngày (dữ liệu có thể còn đến lượt cron kế tiếp). Không deploy hoặc gọi AI thật khi chạy tests.

## Tài nguyên production hiện tại

- Worker `quiz-app-ai`: `https://quiz-app-ai.tuanvipandpro.workers.dev`, đã bật `APP_AI_ENABLED=true` ngày 2026-11-01, version `d46400b0-f4c8-496e-b808-94786c297b8c`.
- D1 `quiz-app-ai`: `2be26a7b-7393-4f50-a857-990d8a1a7d29`, APAC; migrations `0001_ai_requests.sql` và `0002_increase_personal_quota.sql` đã áp dụng. Account ID và binding được lưu trong `wrangler.jsonc`; không tạo database này lần nữa.
- GitHub Actions repository **Variable** `VITE_APP_AI_URL=https://quiz-app-ai.tuanvipandpro.workers.dev` đã được đặt và website đã build/deploy lại. Đây là public URL, không phải Secret; website chỉ nhận thay đổi biến này sau khi build lại.
- Không cần provider API key, Firebase service-account secret hay Cloudflare API token trong GitHub Actions cho luồng hiện tại. Worker dùng AI/D1 bindings; deploy thủ công dùng phiên Wrangler OAuth trong keyring. Workflow GitHub chỉ build và publish website.
- Chrome production smoke đã thành công bằng phiên đăng nhập được user chỉ định: lời giải tiếng Việt bốn phần, quota 19→18; đổi VN/EN giữ kết quả và quota. #53 và OpenSpec task 3.2 vẫn mở cho review chất lượng rộng hơn/CPU biên và hoàn tất PR cấu hình. Xem [rollout evidence](../openspec/changes/app-ai-worker/rollout.md#production-activation--2026-11-01).

## Local verification

`yarn test:worker` dùng Miniflare D1 thật, signed RSA JWT fixtures và inference stub. `yarn test:e2e` mở API test loopback 5176 cùng Vite 5174; endpoint `/__test/*` chỉ nằm trong fixture Node, không thuộc Worker. `yarn worker:check` bundle dry-run. Backend có workflow CI/CD riêng, được `.github/workflows/test.yml` gọi sau component routing; Worker-only không chạy build/browser frontend.

## GitHub Actions backend CD

Sau push/merge vào `master`, nếu plan chọn backend và required gate `test-and-build` pass, workflow `deploy-backend.yml` tải bundle `worker-build` đã kiểm tra trong cùng run rồi deploy bằng Wrangler `--no-bundle`. PR chỉ lint/contract/auth/D1 tests/dry-run, không nhận deployment token và không gọi AI thật. Workflow dùng pinned Wrangler từ lockfile, không cài CLI mới lúc release.

Tạo custom Cloudflare API token tên `quizmos-github-deploy`, scope riêng account production, với các quyền Account: **Workers Scripts / Edit**, **Workers AI / Read**, **Account Settings / Read**, **D1 / Read**. Worker hiện chỉ dùng workers.dev nên không cần Zone permissions. Lưu token trực tiếp vào repository Actions **Secret** `CLOUDFLARE_API_TOKEN`; không dùng Actions Variable, `VITE_*`, source/env file được commit hoặc gửi giá trị qua issue/chat. Account ID public đã được track trong Wrangler config; không cần thêm account ID secret. Hướng dẫn Cloudflare: [GitHub Actions authentication](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

CD kiểm tra có credential trước khi deploy. `scripts/check-worker-migrations.mjs` chỉ SELECT tên trong `d1_migrations`, đối chiếu các SQL files của revision, không đọc request ledger hoặc tự apply SQL. Thiếu/khác migrations, API lỗi hay evidence không hợp lệ đều chặn release. Khi có migration mới, review và áp dụng riêng theo quy trình rollout được owner cho phép trước khi chạy lại CD; không cấp D1 Edit chỉ để CI tự migrate.

Frontend deploy tách riêng và không nhận Cloudflare secret. CI/workflow/dependency changes chọn cả hai component; thay prompt hoặc `questionModel.js` cũng kiểm tra/release cả hai để giữ contract đồng bộ. Không thay Firebase Rules, Workers Free hoặc model/quota trong việc setup CI/CD.

## Setup cần người dùng thực hiện

Khi làm việc qua remote, dùng `yarn wrangler login --device --browser=false`: mở link và nhập mã trên thiết bị đang sử dụng; máy remote tự nhận kết quả. Có thể chọn `--use-keyring` để dùng kho khóa của hệ điều hành. Trên Windows, Wrangler yêu cầu helper `@napi-rs/keyring@1.3.0`; nếu đã cài helper global nhưng terminal cũ chưa nhận, mở terminal mới để nhận PATH Windows. `whoami` xác nhận đăng nhập, không xác nhận gói Workers Free. Subscription API có thể trả 403 với OAuth scopes của Wrangler; khi đó cần owner xác nhận gói từ Dashboard trước khi tạo tài nguyên/gọi model.

1. Trong Cloudflare Dashboard xác nhận account đang **Workers Free**. Không upgrade, mua AI Gateway credits hoặc chọn model yêu cầu payment method. Repository không thể tự xác minh trạng thái billing từ cấu hình Wrangler.
2. Chạy `yarn wrangler login` trên máy của bạn; giữ token trong CLI credential store, không gửi vào chat hoặc commit. Nếu CLI đã đăng nhập, dùng `yarn wrangler whoami` để xác nhận account.
3. Nếu triển khai vào account mới chưa có tài nguyên: tạo D1 bằng `yarn wrangler d1 create quiz-app-ai --config worker/wrangler.jsonc --update-config=false`, rồi cập nhật `account_id` và `database_id` trong `worker/wrangler.jsonc`. Với account production hiện tại, dùng ID đã lưu và bỏ qua bước tạo. Binding `DB`, AI binding `AI` và project ID Firebase đã khai báo. Không cần R2 hay domain riêng.
4. Giữ `APP_AI_ENABLED=false`; `ALLOWED_ORIGINS` chứa domain production `https://quizmos.runs-at.dev` và origin GitHub Pages `https://tuanvipandpro.github.io` cho rollback. Website production build ở base `/`; local/E2E giữ `/quiz-app/`. Local origin chỉ thêm khi cần trong staging, không dùng wildcard. Chạy `yarn wrangler d1 migrations apply quiz-app-ai --remote --config worker/wrangler.jsonc` sau review migration.
5. Deploy disabled: `yarn wrangler deploy --config worker/wrangler.jsonc`. Đây là thao tác production phải theo chỉ dẫn rollout của user. Worker nhận URL `https://quiz-app-ai.<subdomain>.workers.dev`; API URL là public config, không phải secret.
6. Dùng staging riêng để benchmark model, CPU JWT/validation và Neurons bằng sample được chỉ định. Test độ đúng cho AWS/Google/Anthropic, tiếng Việt/Anh và các formats; model nhỏ không mặc định đạt chất lượng certification. Workers Free có 10ms CPU/request nên cần đo cả warm/cold key cache. Không lấy fixture output làm bằng chứng quality.
7. Chỉ sau khi Free/quality/CPU được xác minh: bật `APP_AI_ENABLED=true`, deploy lại, set `VITE_APP_AI_URL` lúc build frontend. CI build phải nhận URL qua repository variable cùng tên (đã nối trong workflow). Smoke test auth/quota/BYOK bằng account được chỉ định. Không merge client bật App AI khi backend chưa ready.

## Môi trường thử riêng

`wrangler.staging.jsonc` dành cho Worker và D1 `quiz-app-ai-staging`, chỉ cho phép origins local 5173 và 5177. Account đã được xác minh Workers Free trên Dashboard; staging được bật riêng để smoke test bằng tài khoản user chỉ định. Không dùng database production cho benchmark. Khi cấp phát môi trường mới, giữ disabled cho đến khi review quality/CPU/usage và smoke auth; trạng thái production hiện tại nằm ở mục tài nguyên phía trên. Model catalog có sẵn và `default_usage_model=standard` không phải bằng chứng account đang dùng Free.

## Chạy nhiều session song song

Mỗi session làm code ở worktree riêng. Giữ dev server chính ở 5173; worktree App AI có thể chạy `yarn dev --host 127.0.0.1 --port 5177`. Port 5174/5176 dành cho browser tests/API fixture, không dùng để preview dữ liệu thật. Không đổi branch trong checkout đang được session khác sử dụng.

Tạo `.env.development.local` (ignored) trong worktree với `VITE_APP_AI_URL=https://quiz-app-ai-staging.tuanvipandpro.workers.dev`. Staging cho phép cả `localhost` và `127.0.0.1` ở 5177; phải deploy lại config staging khi thay đổi allowlist. Cổng khác tạo browser origin khác nên có thể cần đăng nhập lại. Production config không thay đổi theo cổng dev.

## Quota và lỗi

Migration `0002_increase_personal_quota.sql` chỉ thay trigger giới hạn cá nhân từ 5 lên 20, giữ dữ liệu và trần tổng 100. Người đã dùng 5 lượt hôm nay còn 15 sau migration. Áp dụng migration trước khi deploy Worker dùng policy mới; không sửa migration 0001 hoặc xóa records để nâng quota. Rollback an toàn là tắt App AI; nếu giảm quota, dùng migration và Worker policy đồng bộ thay vì rollback riêng code về giới hạn cũ. Kết quả đã cache không tự tạo lại sau thay đổi prompt; dùng Regenerate khi cần lời giải theo prompt v6.

- Mặc định 20 attempts/user/ngày và 100 attempts/app/ngày, fixed SQL triggers; thay đổi cần cập nhật policy và migration cùng test. UID lấy từ verified token, không đọc body UID.
- Request ID = ngày UTC + UUID v4. Reservation atomic; một request pending/user. Cùng ID và fingerprint trả outcome cũ; payload đổi bị conflict. Qua UTC day, ID cũ hết hạn để cleanup không tạo lại request. Reset hiển thị theo timezone browser.
- Request đã dispatch có thể dùng Neurons dù timeout/provider failure, nên vẫn tính attempt. Retry không dispatch lại; Regenerate là attempt mới. Pending sau crash hết lease 120s trở thành TIMEOUT, không tự chạy lại. Client cancellation không có nghĩa provider chưa chạy.
- Kết quả dùng chung theo request của đúng UID; frontend cache 30 phút/100 entries và xóa khi account đổi. Không public cache, không log token/key/question/result. Cron dọn records quá hai ngày.
- 16KiB body, 12KiB tổng system/user prompt UTF-8, 1536 output tokens, 25s inference deadline. Model allowlist hiện chỉ `@cf/aisingapore/gemma-sea-lion-v4-27b-it`; không nhận model hay prompt tự do từ client. Prompt v6 luôn chỉ dẫn và giải thích bằng tiếng Việt, giữ nguyên thuật ngữ kỹ thuật tiếng Anh; language en/vi từ client cũ được chuẩn hóa về vi, toggle VN/EN chỉ đổi UI; lời giải có đủ phần hiểu câu hỏi, đáp án, lý do từng đáp án đúng và từng lựa chọn khác sai/kém phù hợp; question/reference là dữ liệu chưa xác minh. Chat completion phải kết thúc `stop`; nội dung rỗng, bị cắt hoặc gọi tool bị từ chối.
- Account Free có 10,000 Neurons/ngày dùng chung tất cả Workers AI. App request quota không tương đương Neuron budget; platform exhaustion phải báo unavailable, không paid fallback. D1 outage cũng fail closed.

## Rollback và trạng thái

Đổi `APP_AI_ENABLED=false` trong config rồi deploy lại để chặn inference ngay ở backend; hoặc gỡ Actions Variable `VITE_APP_AI_URL` và build/deploy lại website để App AI unavailable. User vẫn có thể chủ động chọn BYOK, không tự chuyển nguồn. Không xóa D1 dữ liệu để rollback. #53 còn mở cho acceptance/PR cấu hình; xem [rollout evidence](../openspec/changes/app-ai-worker/rollout.md) để biết bằng chứng live và giới hạn đánh giá. #42 và #52 không bị đóng bởi feature này.

Nguồn đối chiếu: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
