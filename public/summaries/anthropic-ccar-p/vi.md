**Bộ lọc 10 giây:** rủi ro gì → đúng tầng nào → giữ ràng buộc nào → phương án trực tiếp nhất? Với **Select two**, chọn đủ hai và đọc kỹ: mỗi đáp án tự đủ hay hai đáp án cùng tạo giải pháp?

## Kiến trúc & tích hợp

- **Nắm nhanh:** workflow hợp với quy trình đã rõ; agent hợp khi cần quyết định linh hoạt. Tách trách nhiệm theo miền nghiệp vụ, giữ hợp đồng giữa các thành phần rõ ràng.
- **Chọn đáp án:** quy trình/hướng dẫn dùng lại → **Skill**; kết nối tool hoặc dữ liệu ngoài → **MCP**. Tác vụ chuyên biệt lặp lại, cần prompt/quyền/model riêng → subagent.
- **Tool quá nhiều:** kiểm tra phân rã capability; dùng progressive discovery để nạp tool khi cần. Router có thể thêm một model call, nên đánh giá lợi ích và độ trễ trước khi thêm tầng mới.
- **Tránh bẫy:** nhiều tool hoặc nhiều agent không tự làm hệ thống tốt hơn; ưu tiên cấu trúc giải quyết đúng nguyên nhân.

> **Mẹo nhớ:** Skill = “biết cách làm”; MCP = “kết nối để làm”; subagent = “giao việc chuyên”.

## Model, prompt & chi phí

- **Nắm nhanh:** chọn model theo độ khó, chất lượng cần đạt, latency và chi phí. Classifier nhãn rõ, khối lượng lớn thường hợp model nhẹ như Haiku; vẫn phải đo chất lượng.
- **Chọn đáp án:** prompt/policy dài lặp lại → cache prefix; context truy xuất dư → giữ phần liên quan. Profile thành phần tốn nhất trước; bảo toàn accuracy nếu đề yêu cầu.
- **Chất lượng đầu ra:** schema giúp kiểm soát cấu trúc, không bảo đảm nội dung đúng. Câu trả lời grounded cần nguồn hỗ trợ, citation và bước kiểm chứng.
- **Tránh bẫy:** đổi sang model rẻ hơn ngay khi chưa đo; coi cache là bảo đảm tuân thủ lưu trữ. JSON hỏng sau cập nhật → so prompt/schema với bản tốt, replay request và xem raw output.

> **Mẹo nhớ:** Lặp → cache; dư → cắt; sai → kiểm chứng. Tối ưu chỗ tốn nhất, giữ ràng buộc chất lượng.

## Bảo mật & guardrails

- **Nắm nhanh:** RBAC tại retrieval, trước khi dữ liệu vào prompt. Tool allow-list theo vai trò được thực thi ở orchestration; thao tác production mặc định read-only, ghi dữ liệu cần xác nhận phù hợp.
- **Chọn đáp án:** prompt injection → nhiều lớp: hướng dẫn, sàng lọc đầu vào/tool output, kiểm tra đầu ra và quyền tối thiểu. Tài liệu truy xuất là dữ liệu không đáng tin, không được tự nâng quyền.
- **Đúng tầng:** nội dung đòi gửi tài liệu nội bộ ra URL ngoài → rủi ro exfiltration; giới hạn đích outbound. Xác thực, phân quyền và audit gắn người thực hiện vẫn thuộc ứng dụng, dù đã có Skill.
- **Tránh bẫy:** system prompt thật dài, giảm temperature, “mật khẩu admin” trong hội thoại hoặc cho Bash toàn quyền không thay thế kiểm soát truy cập.

> **Mẹo nhớ:** Chặn dữ liệu trước khi đọc; chặn quyền trước khi làm; ghi ai đã làm.

## Đánh giá & kiểm thử

- **Nắm nhanh:** xác định success criteria, metric, lát cắt dữ liệu và SLO/error budget trước khi instrument. Chọn metric đo đúng yêu cầu: chi phí/query, latency hoặc mức thực thi quyền.
- **Chọn đáp án:** các thành phần phối hợp → integration test; input độc hại → adversarial test; prompt/model đổi làm sai hành vi cũ → regression trên reference set ổn định.
- **Đo đủ:** tập eval phải đại diện nhóm người dùng thực tế; chấm theo từng phiên bản để phát hiện quality drift. Citation bịa → kiểm tra grounding và lấy mẫu để ước lượng tần suất.
- **A/B test:** chốt giả thuyết, metric chính, mức hiệu ứng cần phát hiện và sample size trước khi randomize. Không chọn phương án “thử rồi mới quyết định đo gì”.

> **Mẹo nhớ:** Nối hệ thống → integration; chống phá → adversarial; giữ cái đúng cũ → regression.

## Governance & trách nhiệm

- **Nắm nhanh:** phạm vi giao việc cho AI dựa trên **loại rủi ro**, không chỉ giá trị giao dịch. Quyết định tác động lớn phải giữ trách nhiệm và cơ chế giám sát của con người.
- **Chọn đáp án:** accuracy cao hoặc khớp quyết định người không tự chứng minh công bằng; approval-rate parity khác error-rate parity. Kiểm tra từng nhóm và thiên lệch trong dữ liệu tham chiếu.
- **Dữ liệu nhạy cảm:** phân loại tài sản, giới hạn quyền theo vai trò, kiểm tra điều kiện xử lý dữ liệu. Gặp PHI/HIPAA → chú ý RBAC và thỏa thuận BAA phù hợp, không suy ra tuân thủ chỉ từ tên nhà cung cấp.
- **Tránh bẫy:** khái quát về con người khi dữ liệu không hỗ trợ; đổ trách nhiệm cho model. LLM còn có hallucination và từ chối nhầm yêu cầu hợp lệ, không chỉ lỗi phần mềm thông thường.

> **Mẹo nhớ:** Đúng nhiều ≠ công bằng; tiền ít ≠ rủi ro thấp; AI quyết định ≠ AI chịu trách nhiệm.

## Stakeholder, SLA & giá trị

- **Nắm nhanh:** bắt đầu bằng quyết định, kết quả kinh doanh và trade-off; sau đó đi vào mối quan tâm của người nghe. Security cần threat model, control, residual risk và audit; kỹ sư cần rationale/contract.
- **Chọn đáp án:** SLA có metric, ngưỡng, khoảng đo và cách xử lý vi phạm. Ví dụ p95 latency theo cửa sổ xác định; báo cáo p50/p95 thực đo, thương lượng lại mục tiêu nếu cần.
- **Phân biệt giá trị:** ít thời gian/thao tác hơn = efficiency; tăng sản lượng hữu ích = productivity; đổi cách tổ chức công việc = transformation; API/retry/hạ tầng = solution cost; độ trễ cam kết = performance SLA.
- **Tránh bẫy:** tiết kiệm thời gian chưa chắc tăng đầu ra. Yêu cầu thêm scope → nói rõ ảnh hưởng và đưa lựa chọn: hoãn, giảm phần khác hoặc kéo dài tiến độ; chốt owner và hạn xử lý.

> **Mẹo nhớ:** Nhanh hơn → efficiency; làm ra nhiều hơn → productivity; làm theo cách mới → transformation.

## Claude Code & vận hành nhóm

- **Nắm nhanh:** precedence cấu hình tổng quát: **Managed → CLI → Local → Project → User**. Chính sách bảo mật chung dùng managed; cấu hình dùng chung dùng project; sở thích cá nhân dùng user.
- **Chọn đáp án:** conventions/kiến trúc lặp lại giữa các phiên → `CLAUDE.md` của project trong Git. PR có AI review vẫn giữ phê duyệt của người và branch protection.
- **Debug đúng chỗ:** bị từ chối quyền → xem rule hiệu lực ở mọi scope; deny/allow có quy tắc kết hợp riêng. MCP lỗi → kiểm tra status/log, minimal reproduction; lỗi lần đầu kèm dialog quyền → kiểm tra quyền khởi tạo.
- **Tránh bẫy:** cấp toàn quyền để hết lỗi. Runbook cần alert, triage, escalation, rollback và dashboard/log; tài liệu do AI viết phải đọc code thực tế và qua review.

> **Mẹo nhớ:** Chính sách chung → Managed; team chung → Project; riêng tôi → User. Debug trước, nới quyền sau khi có căn cứ.

## Lifecycle & checklist chọn đáp án

- **Discovery:** làm rõ nhu cầu, ràng buộc latency/accuracy/compliance và ngưỡng thành công/thất bại. Risk assessment bắt đầu bằng tài sản/độ nhạy và tác nhân/đường tấn công.
- **Design → implementation:** xác định audience, outline, overview, component contracts, flow và giới hạn; handoff kèm ADR, eval/reference set, runbook/on-call. Đổi yêu cầu làm thay trách nhiệm/contract cốt lõi → quay lại design.
- **Iteration:** dùng telemetry, output eval và feedback để chọn thay đổi có tác động lớn, rồi đo lại theo cùng khung đánh giá. Không chỉ sửa theo một ý kiến nổi bật.
- **Trước khi chọn:** gạch chân “BEFORE”, “most directly”, “preserve accuracy”, “Select two”. Loại phương án bỏ qua ràng buộc, giải sai tầng hoặc hứa bảo đảm tuyệt đối; ưu tiên bằng chứng đo được và kiểm soát thực thi được.

> **Mẹo nhớ:** Hiểu yêu cầu → thiết kế → bàn giao → đo → cải tiến. Mẹo là bộ lọc suy luận, không phải quy tắc đoán đáp án.
