**Bộ lọc 10 giây:** đang hỏng contract, prompt, context, tool hay vận hành? Sửa tại đúng tầng và kiểm bằng eval/test. Nắm nguyên tắc trước tên tham số: API, SDK, model và transport phải được đối chiếu đúng phiên bản khi triển khai.

## Kiến trúc, SDK & tích hợp

- **Nắm nhanh:** chuyển mục tiêu kinh doanh thành yêu cầu chức năng, hạ tầng và tiêu chí thành công. Chọn kiến trúc theo sự phụ thuộc và trạng thái công việc, không theo độ “agentic” của giải pháp.
- **Chọn đáp án:** các stage có input/output và thước đo riêng → tách call; workflow cần quay lại stage theo state → graph; chia việc chuyên biệt rồi tổng hợp → orchestrator/subagent. Mỗi bên cần contract, context và giới hạn tool/token rõ.
- **Tận dụng SDK:** dùng tool interface, loop, dispatch và history sẵn có khi phù hợp. Xét từng customization theo lý do gốc và khả năng SDK hiện tại; không giữ hoặc xóa tất cả theo khẩu hiệu.
- **Tránh bẫy:** thêm abstraction đa-provider khi không có nhu cầu thực. Nếu hợp đồng yêu cầu Bedrock, dùng đường tích hợp tương thích và tách logic nghiệp vụ khỏi adapter; built-in thiếu tính năng → cân nhắc mở rộng hay custom tool theo lợi ích thực.

> **Mẹo nhớ:** Nhu cầu trước framework; contract trước delegation; đơn giản trước tầng trung gian.

## Prompt, few-shot & chọn model

- **Nắm nhanh:** prompt nêu nhiệm vụ, context, schema/ràng buộc và đầu ra cần đạt. Ví dụ có nhãn tốt là few-shot/multi-shot, đặc biệt hữu ích cho edge case và format khó mô tả chỉ bằng câu chữ.
- **Chọn đáp án:** model phù hợp đồng thời quality–latency–cost của workload. Bản mới suy luận tốt hơn nhưng làm hỏng JSON chưa đủ điều kiện upgrade; chỉnh prompt theo thay đổi, eval lại cả chất lượng và format trước promotion.
- **Cải tiến đúng:** input category mới tăng mà chất lượng kém → thêm case đại diện, sửa prompt và đo lại. Kết quả diễn đạt khác nhau có thể do sinh token/sampling; không mặc định coi là bug request hoặc hứa deterministic chỉ bằng giảm temperature.
- **Tránh bẫy:** hard-code prompt/model rải rác. Giữ cấu hình/phiên bản review được; nêu với stakeholder rằng tính biến thiên được quản bằng validation, eval và retry/fallback có điều kiện, không bằng lời bảo đảm tuyệt đối.

> **Mẹo nhớ:** Ví dụ sửa cách hiểu; eval chốt model; upgrade phải giữ cả nghĩa lẫn khuôn.

## Structured output & validation

- **Nắm nhanh:** yêu cầu JSON trong prompt không thay thế contract. Khi được hỗ trợ, dùng structured output/strict schema; luôn parse phòng thủ và kiểm dữ liệu trước khi chuyển xuống downstream.
- **Chọn đáp án:** thiếu field, sai type hoặc giá trị ngoài enum → đường lỗi được nhận diện: repair, retry có giới hạn hoặc fallback. Không để output bất ngờ làm crash hệ thống; không lờ lỗi rồi gửi dữ liệu sai đi tiếp.
- **Tool arguments:** giữ schema rõ, validate trước dispatch, trả lỗi có cấu trúc để agent sửa; đừng nới mọi constraint chỉ để call được chạy. JSON hợp lệ vẫn có thể sai nghĩa, nên thêm kiểm tra nghiệp vụ cần thiết.
- **Tránh bẫy:** format drift qua nhiều turn không nhất thiết là parser hỏng. Trace context tiến triển thế nào, phần nào lấn át yêu cầu, rồi phối hợp context management với output validation; không retry vô hạn cùng input không đổi.

> **Mẹo nhớ:** Prompt chỉ dẫn; schema giữ cấu trúc; validator bảo vệ ranh giới; business rule giữ ý nghĩa.

## Context, session & chunking

- **Nắm nhanh:** prompt engineering định hình một yêu cầu; context engineering giữ đúng thông tin xuyên turn/stage: nội dung nào cần thêm, giữ, rút gọn, truy xuất hoặc cách ly.
- **Chọn đáp án:** stage không được thấy toàn bộ history → context isolation/subagent có scope riêng. Session cần quy tắc hết hạn, reset và bắt đầu mới; đừng để context cũ tự chảy sang khách hàng hoặc nhiệm vụ mới.
- **Chunk theo mục tiêu:** tài liệu vừa cửa sổ không tự quyết định nên gửi nguyên hay chia. Cần quan hệ toàn cục/citation có thể ưu tiên context đầy đủ; xử lý cục bộ có thể chunk nhưng phải giữ nguồn, ranh giới và bước ghép. Eval trên tài liệu đại diện.
- **Tránh bẫy:** tool output ngắn hạn vẫn tích lũy mãi. Prune phần không cần nữa, giữ facts và contract còn dùng cho bước tiếp theo. Cách ly context không đồng nghĩa chỉ tách tên agent nhưng vẫn đưa chung mọi dữ liệu.

> **Mẹo nhớ:** Prompt = nói gì ở bước này; context = bước này được thấy gì và còn cần nhớ gì.

## Tool, MCP & streaming

- **Nắm nhanh:** tên tool không đủ; description giúp model biết khi dùng, điều kiện và ranh giới. Skill đóng gói tri thức/quy trình cùng tài nguyên; MCP đưa tools/resources/prompts qua giao diện client chuẩn.
- **Chọn transport:** server do tiến trình Claude Code local khởi chạy → cân nhắc STDIO; server độc lập từ xa → Streamable HTTP theo phiên bản MCP. STDIO stdout dành cho message hợp lệ, log sang stderr để tránh làm hỏng protocol.
- **Phân biệt streaming:** Claude Messages API có thể trả phần sinh dần qua SSE để UI cập nhật sớm. WebSocket phù hợp dịch vụ cần kết nối hai chiều liên tục trong tình huống đề; không suy mọi streaming của Claude là WebSocket.
- **Tránh bẫy:** nhận từng token chưa có nghĩa JSON từng đoạn đã hợp lệ hoặc hành động đã hoàn tất. Ghép/buffer theo protocol, xử lý sự kiện kết thúc/lỗi, và chỉ đưa output hoàn chỉnh đã validate cho consumer cần schema.

> **Mẹo nhớ:** Local process → STDIO; remote MCP → HTTP; Claude token stream → SSE; hai chiều liên tục → xét WebSocket.

## Bảo mật, API key & hooks

- **Nắm nhanh:** threat model bổ sung prompt injection, jailbreak, rò rỉ context và output không an toàn bên cạnh rủi ro web thông thường. Nội dung model sinh ra không mặc nhiên là dữ liệu đáng tin để thực thi.
- **Chọn đáp án:** policy nội dung phải có kiểm soát runtime trước khi tới người dùng, không chỉ một system prompt mạnh hơn. Lọc/validate theo chính sách, theo dõi cả lọt sai lẫn chặn nhầm, và test bằng input đối kháng.
- **API key:** tách key giữa dev/staging/prod để khoanh vùng quyền, thu hồi và audit; lưu secret đúng nơi, không commit vào repo hay log. Tách key không thay thế phân quyền và kiểm soát dữ liệu bên trong ứng dụng.
- **Tránh bẫy:** hook nặng chạy mọi action làm tăng latency. Scope theo sự kiện, matcher và mục tiêu/rủi ro; bảo vệ thao tác phá hủy/dữ liệu nhạy cảm tại điểm thực thi, không gỡ kiểm soát an toàn chỉ để hết chậm.

> **Mẹo nhớ:** Prompt hướng dẫn hành vi; kiểm soát runtime chặn hành động; key tách môi trường khoanh vùng sự cố.

## Claude Code, cấu hình & CI

- **Nắm nhanh:** `CLAUDE.md` cung cấp quy ước/context; `.claude/settings.json` project chứa cấu hình và permissions phù hợp cho team. Scope rộng cho chuẩn chung, scope project cho chi tiết repo; đừng nhân bản mọi quy tắc vào mọi nơi.
- **Chọn đáp án:** version-control cấu hình không chứa secrets cùng source và review qua PR. Prompt, model và error handling phải có cấu trúc cấu hình/test; refactor duplication và control flow phức tạp có kế hoạch trước khi mở rộng tiếp.
- **CI:** headless/non-interactive, ví dụ `claude -p`, với quyền tool cần thiết được cấu hình trước và output được capture cho pipeline. Không tương đương bật toàn quyền hoặc bỏ mọi bước phê duyệt.
- **Tránh bẫy:** staging pass chưa chứng minh mọi downstream consumer không bị ảnh hưởng. Đánh giá tác động prompt/config lên từng hệ thống, phối hợp owner, rollout có kiểm soát và phương án rollback.

> **Mẹo nhớ:** Memory cho quy ước; settings cho cấu hình; Git cho lịch sử; CI cần quyền hẹp và output có contract.

## Test, debug, vận hành & chi phí

- **Nắm nhanh:** unit cho hàm, integration cho kết nối Claude, end-to-end cho luồng quan trọng; production cần monitoring, triage và kế hoạch tiến hóa. Deprecation → regression trước, migrate từng nhóm rồi xác nhận lại.
- **Chọn đáp án:** output bất nhất/refusal ngoài dự kiến → trace input, system/user messages, model, params và output để so case tốt/xấu. Mask secrets/PII khi ghi trace; đừng đoán hoặc thay đồng thời mọi tham số.
- **Giữ tải ổn:** thiết kế cho rate limit giờ cao điểm; queue/throttle khi phù hợp và backoff có giới hạn lúc bị limit. Kiểm tra retry có an toàn với side effect, thay vì mặc định lặp mọi call lỗi.
- **Tính đúng tiền:** input/output token có rate riêng, cộng cả tool/context và lượt retry. Prompt caching tái dùng prefix ổn định; response cache là cơ chế khác cần xét freshness và quyền truy cập, không tự bỏ model call chỉ vì prompt có đoạn giống nhau.

> **Mẹo nhớ:** Trace trước đoán; regression trước migrate; tính token hai chiều; cache prefix khác cache đáp án.
