# Design

## Context

AI hiện yêu cầu Gemini/Groq credentials ở hook và service. Cache nằm trong memory theo account/prompt; UI provider label dùng conditional. Xem proposal cho mục tiêu #53.

## Goals / Non-Goals

Giữ boundary component/hook/service, chia sẻ validator/prompt; một Worker nhỏ và D1 quota. Không đổi quiz persistence, không AI Gateway/R2 hoặc inference trả phí.

## Decisions

- Worker dùng jose/WebCrypto xác minh Firebase RS256 với JWK cache từ endpoint công bố trong Firebase OIDC discovery; auth trước quota và inference. Test dùng RSA JWT thật với key resolver fixture, không auth bypass production.
- `POST /v1/explanations` nhận requestId có UTC date + UUID, question và language. `GET /v1/usage` trả server quota/reset. Allowlist hiện dùng `@cf/aisingapore/gemma-sea-lion-v4-27b-it`: benchmark live cho thấy Llama 3.2 3B không đạt ngôn ngữ/lập luận, còn SEA-LION cải thiện rõ. Prompt version 4 dùng system instruction và template riêng VN/EN, không ép câu đơn giản phải đủ số từ tối thiểu. Adapter đọc chat-completion và từ chối output rỗng/truncated/tool-call. Production disabled mặc định, không client-supplied prompt/model/UID/key.
- D1 request ledger có primary key `(uid, request_id)`, fingerprint theo question/language/model/prompt version. SQLite BEFORE INSERT triggers kiểm tra user 5/global 100 và pending user bằng cùng một atomic statement. Mọi reservation đã dispatch tính một attempt, kể cả upstream failure; không refund tự động khi outcome không rõ. UI nói rõ quota attempt. ID có ngày để expired retry không tiêu tốn lượt mới; retention 2 ngày, stale pending chuyển failure, không tự dispatch lại.
- Kết quả successful lưu theo request để retry response-loss; frontend memory cache theo account/source/prompt/language. Regenerate dùng UUID mới. Không share private explanation giữa accounts. Cleanup scheduled xóa ledger cũ; quay lại ID thuộc ngày cũ bị reject.
- Body cap 16 KiB; prompt cap 12 KiB UTF-8; output 600 tokens, timeout 25s. CPU JWT/hash/validation cần đo dưới Worker Free 10ms; inference wait không phải local CPU. Model nhỏ có thể không đủ chất lượng chứng chỉ: chưa enable production khi chưa review.
- Source preference account-scoped, guest bắt buộc BYOK. Nếu chưa có public API URL thì App AI unavailable, BYOK tiếp tục hoạt động. Settings hiển thị source + quota; modal dùng error recovery/disabled guidance từ UI skill. Snapshot/late request guards ở hook; không copy credential.
- BYOK cache/prompt nhận language và registry label; standard/learning gating vẫn do study flow hiện hữu kiểm soát.
- BYOK settings chỉ hiện một form key theo provider đang chọn; việc đổi provider không đổi thứ tự model routing và không làm mất input chưa lưu. Hướng dẫn lấy/lưu/test key nằm trong dialog trợ giúp, lỗi và kết quả thao tác vẫn hiện gần input. Nút Sign in mở cùng `SignInModal` và cùng hook xử lý đăng nhập như header; đóng dialog đăng nhập trả về form hiện tại, không tự gọi OAuth từ nút Sign in.

## Risks / Trade-offs

- Failed dispatch có thể đã tiêu thụ Neurons nên vẫn tính attempt; retry cùng ID trả lỗi cũ và Regenerate là thao tác mới có chủ ý.
- Server process chết giữa reserve/result để pending đến lease hết; không chạy inference lại với ID đó. Giảm availability để giữ giới hạn chi phí.
- Platform free allowance dùng chung account. Counter request là guard bổ sung, không chứng minh Neuron budget; không paid fallback. D1 outage fail closed.
- CORS không authorization; Firebase signature/claims mới xác thực user. Logs không chứa keys/token/question/result.

## Migration Plan

Không migrate quiz/profile. Thêm dependency/config/tests, deploy Worker disabled với D1 migration và AI binding sau khi user setup Free. Benchmark trên sample được chỉ định, rồi bật Worker và build frontend với URL. Rollback bằng disable Worker/URL, giữ BYOK. Không đổi Firebase Rules.

## Open Questions

Cloudflare Free account, staging endpoint và kết quả quality/CPU mẫu đã ghi trong [rollout evidence](rollout.md). App AI dùng prompt v4 ngắn, tập trung lý do cốt lõi để giảm lỗi khi phân tích lựa chọn sai; BYOK giữ yêu cầu phân tích chi tiết. Review chất lượng rộng hơn, biên CPU và production rollout còn pending. UI/local/staging integration không được ghi thành bằng chứng production.
