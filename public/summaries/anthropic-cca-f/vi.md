**Bộ lọc 10 giây:** thiếu dữ liệu, sai tool, mất context hay sai validation? Sửa đúng nguyên nhân, giữ an toàn/SLA. Học nguyên tắc; đối chiếu phiên bản SDK khi dùng các tool/lệnh trong bank vào thực tế.

## Agent loop & phối hợp nhiều agent

- **Nắm nhanh:** model chọn hành động; ứng dụng thực thi tool rồi gửi kết quả trở lại. `stop_reason: tool_use` → xử lý tool call; `end_turn` → kết thúc lượt bình thường, không đồng nghĩa đã giải quyết nghiệp vụ.
- **Chọn đáp án:** việc độc lập → chạy song song; việc cần kết quả trước → tuần tự. Coordinator chọn subagent theo yêu cầu, truyền mục tiêu, tiêu chí và context; subagent không tự biết kết quả của nhau.
- **Giữ căn cứ:** truyền findings, mapping claim–source, ngày dữ liệu và đoạn trích. Phân biệt kết luận chắc chắn với tranh chấp; khác năm chưa chắc mâu thuẫn. Thiếu coverage → tìm bổ sung có mục tiêu.
- **Tránh bẫy:** nói “sẽ giao việc” chưa phải gọi tool; kiểm tra quyền delegation (bank dùng `Task`). Yêu cầu đơn giản có thể xử lý trực tiếp. Hết `max_turns` mà chưa giải quyết/escalate → orchestration kiểm tra và handoff.

> **Mẹo nhớ:** Độc lập thì song song; phụ thuộc thì truyền kết quả; dừng vòng lặp chưa chắc xong việc.

## Thiết kế tool & MCP

- **Nắm nhanh:** tool mô tả khi dùng/không dùng, input/output và lỗi. MCP tools thực hiện hành động; resources cung cấp context/catalog; prompts là mẫu tương tác theo giao diện client.
- **Chọn đáp án:** tool chồng lấn → gom phần cùng nghĩa; khác dữ liệu/quy tắc → tách schema. Tìm+phân tích có thể gộp, nhưng thêm vào collection nên riêng để chọn lọc.
- **ID & kết quả:** lookup lấy ID thật, không bịa từ tên/địa chỉ. Trả JSON có ID, metadata, trạng thái; dữ liệu lớn → trang đầu, tổng số và cursor. “Không có kết quả” chưa phải lỗi.
- **Tránh bẫy:** nhiều connector chỉ được tìm thấy chưa chắc đã callable; discovery phải đưa tool vào tập khả dụng. Hạn chế tool theo vai trò. Với booking, kiểm tra–ghi nguyên tử giúp tránh race condition khi phù hợp.

> **Mẹo nhớ:** Mô tả rõ → chọn đúng; ID thật → gọi đúng; schema riêng → ít tham số sai.

## Lỗi, phê duyệt & escalation

- **Nắm nhanh:** phân biệt transient, validation, permission và business error. Trả loại lỗi, khả năng retry, nguyên nhân và bước tiếp theo; lỗi thực thi MCP thường nằm trong tool result với `isError`, khác lỗi giao thức/request.
- **Chọn đáp án:** đọc dữ liệu bị lỗi tạm thời → retry có giới hạn/backoff; ID sai, ngoài chính sách hoặc thiếu quyền → sửa nguyên nhân, không lặp mù. Timeout sau gửi tiền/tin nhắn có thể là **đã làm nhưng chưa biết kết quả**; kiểm tra trạng thái/idempotency trước retry.
- **Thực thi quyền:** ngưỡng hoàn tiền hay preview bắt buộc phải được chặn trong code/hook. Preview và execute có thể nối bằng token dùng một lần, gắn đúng hành động. Xác nhận cần rõ nội dung, đối tượng, chi phí và tác động.
- **Escalate:** khách đòi người ngay, ngoại lệ hoặc bế tắc → handoff có ID, nguyên nhân, trạng thái và bước đề nghị. Nếu đã xác nhận xử lý được ngay, có thể đưa lựa chọn xử lý/escalate; không tự làm hoặc tuyên bố thành công.

> **Mẹo nhớ:** Lỗi tạm có thể thử lại; lỗi chính sách phải xử lý; trạng thái không rõ thì kiểm chứng trước.

## Context, bộ nhớ & session

- **Nắm nhanh:** Messages API không tự nhớ; gửi lại lịch sử phù hợp. Facts như allergy, order ID, số tiền, preference mới nhất nên giữ trong structured state; inject dữ liệu cập nhật trước lượt kế tiếp.
- **Chọn đáp án:** hội thoại dài cần nhắc quá khứ → tóm tắt phần cũ, giữ lượt gần đây nguyên văn. Nếu chủ yếu hỏi gần đây và thông tin cũ dễ nhắc lại, sliding window có thể đủ. Loại RAG/tool output dư, không xóa facts quan trọng.
- **Session:** resume để tiếp tục điều tra; fork để thử hướng khác mà giữ nhánh gốc. Code/dữ liệu ngoài đã thay đổi → báo các file/đối tượng đổi và đọc lại phần liên quan, không tin transcript cũ là trạng thái hiện tại.
- **Tránh bẫy:** summary văn xuôi không giữ được mọi con số. Cần precision → facts store + retrieval. Trước khi mất context, lưu scratchpad/export có cấu trúc; subagent mới phải nhận bản tóm tắt cần thiết.

> **Mẹo nhớ:** Recent giữ nguyên; old tóm tắt; critical giữ riêng; dữ liệu sống phải đọc lại.

## Claude Code & workflow phát triển

- **Nắm nhanh:** sửa nhỏ, rõ → làm trực tiếp; đổi rộng/migration/chưa hiểu kiến trúc → khám phá, lập kế hoạch rồi làm. `Glob` tìm tên/path; `Grep` tìm nội dung; `Read` hiểu trước sửa.
- **Chọn đáp án:** quy ước chung → `CLAUDE.md`; rule theo path → `.claude/rules`; workflow gọi lại → project Skill trong Git. Cấm thao tác → permissions/code; tự format sau sửa → `PostToolUse`, không chỉ nhắc trong prompt.
- **Khám phá đúng:** lần entry point, imports và wrappers trước khi kết luận phạm vi ảnh hưởng; lỗi match không duy nhất → đọc file và xác định vùng sửa. MCP dùng chung đặt đúng project scope; cá nhân dùng user scope.
- **Kiểm chứng:** đưa code mẫu, test input/expected output và lỗi cụ thể; sửa từng vấn đề rồi đo lại. Review độc lập giảm thiên lệch cùng session; CI giới hạn turns/budget. Bổ sung prompt cần giữ hướng dẫn tool mặc định.

> **Mẹo nhớ:** Nhớ quy ước → memory; cấm chắc → permission; chạy chắc → hook; quy trình gọi lại → Skill.

## Prompt, few-shot & chất lượng review

- **Nắm nhanh:** system prompt giữ hành vi nền. Few-shot cho thấy input/output đúng ở các edge case: chuẩn hóa, nhánh chưa được test, informal measurements và false positive, thay vì chỉ thêm câu “hãy chính xác”.
- **Chọn đáp án:** nhiều mục tiêu cạnh tranh → tách các lượt review chuyên biệt rồi tổng hợp. Thiếu context liên file → cho đọc/search có giới hạn; diff của file thay đổi không đủ để chứng minh mọi tác động.
- **Precision/recall:** “chỉ báo lỗi chắc chắn” có thể bỏ sót bug; tách bước tìm ứng viên có severity/confidence khỏi bước lọc. Khi model sai theo mẫu lặp lại, thêm ví dụ đối chiếu acceptable pattern với lỗi thật.
- **Tránh bẫy:** hỏi dồn mọi chi tiết làm tăng friction; suy luận việc đảo ngược được từ context và nêu giả định. Chỉ một câu hỏi nếu mơ hồ về hành động; xác nhận trước booking/xóa. Prefill chỉ dùng khi model hỗ trợ; version prompt cho session dài.

> **Mẹo nhớ:** Sai định dạng/cách hiểu lặp lại → few-shot; thiếu bằng chứng → thêm context/tool; thiếu mục tiêu → hỏi đúng một điểm.

## Structured output & validation

- **Nắm nhanh:** JSON/schema đúng không bảo đảm ý nghĩa đúng. Chọn structured output/strict tool schema phù hợp phiên bản; cần tool extract chạy trước enrichment → ép đúng `tool_choice`; `any` chỉ yêu cầu một tool, không chọn hộ tên cụ thể.
- **Chọn đáp án:** field không có bằng chứng → `null`/empty khi schema cho phép; enum cần `other`/`unclear` nếu nghiệp vụ có trường hợp đó. Amendment → giữ giá trị, vị trí nguồn và ngày hiệu lực, không âm thầm ghi đè.
- **Sửa semantic error:** gửi lại tài liệu, extraction và lỗi validation cụ thể. Kiểm tra tổng line items với stated total bằng logic ứng dụng; lệch thì review. Retry không tạo ra dữ liệu chỉ tồn tại ngoài input.
- **Đo confidence:** hiệu chỉnh ngưỡng trên validation set có nhãn và theo từng document type/field. Lấy mẫu phân tầng cả nhóm confidence cao; score tự báo không phải bảo đảm đúng. Chia tài liệu/PR dài rồi merge, deduplicate nếu chất lượng giảm.

> **Mẹo nhớ:** Schema giữ khuôn; validation giữ nghĩa; nguồn giữ sự thật; calibration mới dùng confidence.

## Batch, SLA & checklist chọn đáp án

- **Nắm nhanh:** xử lý offline/không gấp → cân nhắc Batch; alert cần trong vài chục phút → realtime. Ngân sách context gồm system prompt, tool definitions, input và phần output cần dành chỗ; “vừa context” chưa chắc trích xuất tốt.
- **Chọn đáp án:** tính **thời gian gom + xử lý tối đa + dự phòng**. Với giả định trong Q99: gom 4 giờ + xử lý tối đa 24 giờ = 28 giờ, có khoảng đệm trước SLA 30 giờ; không lấy thời gian trung bình làm cam kết.
- **Retry batch:** theo `custom_id`, chỉ gửi lại phần lỗi sau khi sửa nguyên nhân; context overflow → chunk rồi ghép. Có deadline, giới hạn retry và review cho lỗi không thể khôi phục; đừng chạy lại toàn bộ phần đã thành công.
- **Trước khi chọn:** tìm “must”, “before”, “cannot leave to model”, “most effective”. Loại cách sửa sai tầng, mất nguồn/facts, retry side effect chưa rõ, hoặc hy sinh SLA để rẻ hơn. Phương án tốt nhất phụ thuộc ràng buộc đề.

> **Mẹo nhớ:** Batch tiết kiệm khi được phép chờ; đúng hạn phải tính cả chờ gom; sửa phần lỗi, giữ phần đã đúng.
