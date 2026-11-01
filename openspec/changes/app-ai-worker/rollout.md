# Cloudflare rollout evidence

## Account and staging

- Đã xác nhận Workers Free trên Dashboard: **Free / $0 / Current plan**, và user xác nhận cùng thông tin. Subscription API trả 403; không dùng `default_usage_model=standard` làm bằng chứng về gói thanh toán.
- Device login thành công. OAuth được lưu qua Windows keyring; token không được in hoặc commit. Phiên lệnh Codex cần PATH Windows cập nhật để tìm helper keyring cài global.
- D1 staging riêng: `quiz-app-ai-staging`, ID `3b0d6b06-7e9d-4dd1-95c8-57c3652ead89`, location hint APAC; migration `0001_ai_requests.sql` đã áp dụng.
- URL staging: `https://quiz-app-ai-staging.tuanvipandpro.workers.dev`. Bản đầu tắt AI có version `9f4fb0c1-cb66-455f-b967-3ce89611573f`; bản tối ưu JWK/prompt v4 có version `bf29c051-1616-4d67-b034-7af9422a3148`.
- Staging chỉ cho phép browser origins local 5173/5177 và vẫn bắt buộc Firebase ID token hợp lệ. Không tạo/bật Worker hoặc D1 production; repository variable cho GitHub Pages chưa được thay đổi.
- `.env.development.local` (ignored) nối app local vào staging; production build không đọc biến riêng cho development này.

## Live model evaluation

Dùng public examples, ba câu public bank, một câu cố tình đánh dấu sai và một câu thiếu dữ kiện. Không gửi custom quiz riêng tư. Raw results và ảnh được giữ trong ignored `artifacts/app-ai/cloudflare/`.

1. Llama 3.2 3B không đạt: request EN trả lời bằng VN; có chi tiết bịa và lập luận tự mâu thuẫn.
2. Prompt riêng theo ngôn ngữ và system instruction sửa lỗi ngôn ngữ nhưng model nhỏ vẫn không xử lý tốt thiếu ngữ cảnh.
3. Chọn `@cf/aisingapore/gemma-sea-lion-v4-27b-it` từ catalog khả dụng. Schema chính thức dùng chat-completion; adapter đọc đúng format và từ chối output rỗng, bị cắt hoặc tool-call.
4. Mẫu SEA-LION 18 cases: đúng ngôn ngữ yêu cầu và đáp án chính về mặt ngữ nghĩa; tất cả kết thúc `stop`. Provider báo **397.608164 Neurons**. REST latency từ máy này **1.540–5.273s**, median **3.3365s**; đây không phải CPU time của Worker.
5. Review phát hiện hai lỗi ở phần phân tích lựa chọn sai: đảo chiều quan hệ Step Functions/Lambda và nhầm ký hiệu một lựa chọn dropdown. Prompt v4 thu gọn App AI về đáp án chính/lý do cốt lõi, giữ phần chi tiết cho BYOK. Sáu cases tập trung chạy lại đều giữ đáp án/ngôn ngữ đúng và không lặp lại hai lỗi đó; vẫn có câu diễn đạt chưa tự nhiên. Đây là mẫu nhỏ, không chứng minh độ chính xác trên toàn bộ nội dung chứng chỉ.

Không dùng paid plan, model yêu cầu thanh toán hay AI Gateway credits. Các báo cáo SEA-LION dùng `usage.neurons` do provider trả về; không dùng ước lượng theo hệ số của Llama 3B.

## Live authentication and quota

- User chỉ định phiên đăng nhập app hiện có và cho phép tối đa hai lời giải staging. Đã chạy đúng hai lượt: EN và VN, đều trả lời thành công; quota đổi **5 → 4 → 3**.
- D1 query tổng hợp xác nhận **2 records ở trạng thái `done`**, không đọc/in UID hoặc nội dung riêng tư trong kết quả kiểm tra quota.
- Trước và sau thử: cùng câu 1/136, 0/136 đã trả lời; không chọn đáp án, đổi câu hoặc bấm Save position. Ngôn ngữ UI đã khôi phục EN. BYOK keys không bị chỉnh sửa.
- Anonymous `/v1/usage` trả 401 `AUTH` đúng contract. Live screenshots chứa tên tài khoản được giữ local/ignored, không đưa lên repo công khai.

## Worker CPU

- GraphQL Analytics cho thấy cold authentication ban đầu dùng X.509 khoảng **15.347 ms**, dù request vẫn thành công nhờ độ linh hoạt của runtime. Không coi đây là đạt mục tiêu Free 10 ms.
- Chuyển sang JWK endpoint được công bố trong Firebase OIDC discovery, vẫn dùng jose/WebCrypto và đầy đủ signature/issuer/audience/time/non-anonymous checks. Cache public key/imported key giữ TTL và rotation semantics; bổ sung kiểm thử ký RSA/JWK thật.
- Sau tối ưu, cửa sổ smoke test có **6 invocations**, **0 Worker errors**; p99 cao nhất trong các nhóm là **6.066 ms** và **7.271 ms**. Đơn vị microseconds được xác nhận qua GraphQL schema introspection.
- Đây là bằng chứng cold/warm của một mẫu nhỏ trên payload thật, chưa phải load test hay bằng chứng worst-case 12 KiB prompt tại mọi POP.

## Isolated worktree — 2026-11-01

- Chuyển session App AI sang managed worktree riêng, branch `codex/app-ai-worker`, sau khi checkout gốc được session CTFL sử dụng. Không đổi branch hoặc sửa các thay đổi CTFL ở checkout gốc.
- Dev server riêng chạy 5177, có `.env.development.local` riêng (ignored). Browser đã mở Quiz Bank; module thực tế trên 5177 chứa App AI hook và staging URL. Origin mới có phiên đăng nhập riêng.
- Staging version `d69a6f3f-f5a8-4e89-a928-e10bda988f82` bổ sung `localhost:5177` và `127.0.0.1:5177` vào allowlist, giữ nguyên 5173. Production config không đổi.
- Live CORS checks: OPTIONS từ 5177 trả 204; GET usage chưa đăng nhập từ hai host 5177 và localhost:5173 trả 401 AUTH với đúng allow-origin; origin ngoài danh sách trả 403 ORIGIN, không allow-origin. Không gọi inference hoặc dùng thêm quota thật.
- `yarn install --frozen-lockfile` và `yarn verify` trong worktree mới pass, gồm 147 Node tests và production build/isolation. Không chạy lại E2E local vì session khác đang sử dụng cổng test; UI chỉ smoke desktop EN/dark, không có thay đổi layout.

## Pending acceptance

Staging setup và smoke đã có bằng chứng. Giữ task 3.2 và issue #53 mở cho đến khi hoàn tất review chất lượng rộng hơn, kiểm tra biên hiệu năng và rollout production được ghi nhận. PR chưa merge; GitHub Pages chưa được bật App AI bởi lần setup này.
