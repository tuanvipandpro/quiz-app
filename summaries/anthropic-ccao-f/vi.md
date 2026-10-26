**Bộ lọc 10 giây:** cần đầu ra gì → đủ dữ liệu/quyền chưa → kiểm chứng thế nào → ai chịu trách nhiệm? Câu sắp xếp thì tìm quan hệ phụ thuộc, đừng học thuộc dãy số.

## Chọn công việc, công cụ & model

- **Nắm nhanh:** Claude mạnh ở nháp, tổng hợp, phân loại và điều chỉnh cách diễn đạt theo audience. Ưu tiên việc có nguồn đầu vào rõ, kết quả kiểm tra được và người nhận bàn giao cụ thể.
- **Chọn đáp án:** theo bank: Haiku cho việc nhẹ cần nhanh; Sonnet cho việc thường ngày cân bằng; Opus cho suy luận phức tạp. Chốt bằng thử nghiệm workload, không chỉ theo tên/ngày phát hành.
- **Đúng công cụ:** tính thống kê/biểu đồ từ file → Code Execution rồi đối chiếu số liệu; nhiều nguồn cần điều tra → research có citation; brainstorm → khám phá mở; báo cáo định kỳ → template rõ.
- **Tránh bẫy:** model mạnh nhất không luôn phù hợp nhất. Xác định chất lượng, latency, volume và chi phí trước khi thử; quota phụ thuộc model/tokens/gói sử dụng, không suy từ một con số dùng chung.

> **Mẹo nhớ:** Việc nhẹ chọn nhanh; việc khó chọn mạnh; số liệu phải tính và kiểm, không chỉ nghe văn xuôi.

## Prompt rõ & định dạng đầu ra

- **Nắm nhanh:** prompt có nhiệm vụ, mục tiêu/audience, context, ràng buộc và format. “Xem giúp pricing” chưa đủ rõ; cần nghiên cứu đối thủ hay nghĩ ý tưởng mới?
- **Chọn đáp án:** liệt kê câu hỏi và mục bắt buộc. Nêu tone, độ dài, vùng/người nhận và thông điệp chính; ví dụ minh họa tiêu chuẩn, không thay dữ liệu thực tế.
- **Đúng hình thức:** nhiều record/metric → bảng có hàng/cột rõ; executive memo → kết luận và driver trước, triển vọng sau; transcript yêu cầu → tách must-have, nice-to-have, câu hỏi mở và mâu thuẫn.
- **Tránh bẫy:** dùng một template cho mọi tác vụ, chỉ nói “hay hơn”, hoặc yêu cầu chung chung không chỉ rõ output. Tone sai → mô tả tone + audience; thuật ngữ sai → cung cấp glossary và yêu cầu áp dụng.

> **Mẹo nhớ:** Làm gì — cho ai — dựa vào đâu — theo khuôn nào — giới hạn gì?

## Projects, Memory, Skills & Connectors

- **Nắm nhanh:** Project giữ bộ tài liệu và instructions cho workload lặp lại; knowledge base chứa nguồn, instructions chứa vai trò/tone/format/quy tắc. Xác định mục đích và các việc thường làm trước khi cấu hình.
- **Chọn đáp án:** quy trình dùng lại → Skill; truy cập nguồn ngoài → Connector; context cần nhớ giữa phiên → Memory theo phạm vi được duyệt. Kết hợp Skill, tài liệu và instructions tham chiếu đúng từng phần.
- **Bảo trì:** rà nguồn/instructions theo chính sách và thuật ngữ mới. Sửa/xóa memory sai hoặc lỗi thời, bổ sung context còn thiếu; sao lưu/export khi tính năng cho phép trước thay đổi lớn, kiểm lại quyền chia sẻ.
- **Tránh bẫy:** “chạy được một lần là đúng mãi”, nhét toàn bộ tài liệu vào instructions, bật Skill lạ vì tiện. Kiểm nguồn/phạm vi/quyền của Skill và Connector; chỉ kết nối nguồn đã được tổ chức cho phép.

> **Mẹo nhớ:** Knowledge = nguồn; instructions = cách làm; Skill = quy trình; Connector = kết nối; Memory = context xuyên phiên.

## Context dài & tách biệt khách hàng

- **Nắm nhanh:** context hữu hạn; nhiều tài liệu hơn không tự làm kết quả tốt hơn. Giữ đúng phần liên quan, dùng tiêu đề/delimiter và nhãn nguồn để phân biệt thông tin với chỉ dẫn.
- **Chọn đáp án:** chỉ vài section cần dùng → trích section đó. Phiên dài → tóm tắt mục tiêu, quyết định, facts và việc còn mở; kiểm bản tóm tắt rồi đưa vào chat mới và xác nhận hướng tiếp tục.
- **Giữ trọng tâm:** khi đổi subtopic, nhắc lại ràng buộc và mục tiêu. Đặt thông tin tham chiếu trọng yếu dễ thấy; kiểm đầu ra xem model có thực sự dùng đúng nguồn, không chỉ dựa vào vị trí trong prompt.
- **Tránh bẫy:** mang context khách hàng A sang B. Tách Project, nguồn, instructions và phạm vi memory phù hợp; thử câu hỏi kiểm tra để phát hiện context bleed, không coi việc đặt hai tên Project khác nhau là đủ.

> **Mẹo nhớ:** Lọc trước khi gửi; tóm trước khi chuyển; tách trước khi chia sẻ.

## Kiểm chứng & đánh giá đầu ra

- **Nắm nhanh:** văn phong tự tin không phải bằng chứng. Định nghĩa tiêu chí và ngưỡng đạt trước khi chấm: factual accuracy, đủ trường/độ sâu, đúng audience, format và length.
- **Chọn đáp án:** nghi hallucination → chỉ ra claim, đối chiếu nguồn, sửa hoặc bỏ phần chưa xác minh. Ba bài báo lặp cùng một số chưa thay thế nghiên cứu gốc.
- **Đánh giá đủ:** câu trả lời có đủ tên năm mục nhưng thiếu ba yếu tố rủi ro vẫn chưa đủ yêu cầu. Kết luận trái bằng chứng là lỗi nội dung/logic, không chữa được chỉ bằng thêm heading đẹp.
- **Tránh bẫy:** chỉ trích nguồn ủng hộ, bỏ chi phí chuyển đổi hoặc ý kiến bất lợi. Nguồn mâu thuẫn → tìm nguồn sơ cấp phù hợp về thời điểm/phạm vi; ghi gap và xử lý trước khi giao, không “bỏ phiếu theo số nguồn”.

> **Mẹo nhớ:** Nghe hợp lý ≠ xác minh; đủ đề mục ≠ đủ nội dung; đẹp ≠ đúng.

## Workflow, yêu cầu & phân rã nhiệm vụ

- **Nắm nhanh:** làm rõ vấn đề, mục tiêu và ràng buộc trước artifacts. Map quy trình hiện tại, đo quality/time/cost, tìm bottleneck rồi xác định điểm Claude hỗ trợ và điểm bàn giao cho người.
- **Chọn đáp án:** nhiệm vụ có nhiều output → tách theo phase hoặc section có tiêu chí riêng; gom bước quá nhỏ làm đứt mạch. Ví dụ báo cáo nhiều phòng ban: mục tiêu → nguồn từng phần → nháp từng phần → tổng hợp executive summary.
- **Đúng thứ tự:** tiêu chí đánh giá vendor trước dữ liệu và scoring; persona/scope trước journey stages/touchpoints; mục tiêu onboarding trước email cụ thể. Yêu cầu mâu thuẫn → ghi nguồn từng bên rồi gửi stakeholder giải quyết, không tự chọn phe.
- **Tránh bẫy:** tối ưu theo cảm giác hoặc rollout ngay. Thay đổi bottleneck có mục tiêu → pilot nhỏ → so baseline/thu feedback → chuẩn hóa rồi mở rộng. Code Execution cần input chuẩn và sanity check output trước bước sau.

> **Mẹo nhớ:** Hiểu → đo → chọn điểm can thiệp → pilot → kiểm → mở rộng.

## Governance, dữ liệu & quyền sở hữu

- **Nắm nhanh:** trước upload/Connector, phân loại dữ liệu và xác nhận công cụ, nguồn, quyền được duyệt. Chỉ gửi trường cần thiết; redact/anonymize ID, thẻ thanh toán hoặc địa chỉ không phục vụ nhiệm vụ.
- **Chọn đáp án:** policy tổ chức cấm dữ liệu điều tra → không nhập, xin phương án được duyệt. Incognito không đóng góp chat history/memory theo tính năng hiện hành; **không đồng nghĩa không lưu ở mọi tầng** hay được phép gửi dữ liệu cấm.
- **Giữ trách nhiệm:** không giao Claude tự quyết định cuối về tuyển dụng/tín dụng. Use case rủi ro cao cần điều kiện, giám sát và phê duyệt phù hợp; “có người xem” không tự làm một use case chưa duyệt thành được phép.
- **4D:** Delegation = giao việc nào; Description = mô tả task/kỳ vọng; Discernment = phê bình kết quả; Diligence = làm việc có trách nhiệm và kiểm chứng trước giao. Xem cả hệ quả lỗi, khả năng đảo ngược, thiên lệch và công bằng.
- **Tránh bẫy:** khái quát nhóm người thay cho hành vi quan sát được. Nội dung khách hàng có cam kết SLA cần review/escalate; truyền đạt trung thực giới hạn và nơi con người giữ quyết định, kể cả khi người nghe muốn bỏ review.

> **Mẹo nhớ:** Được làm? Dữ liệu nào? Ai kiểm? Ai chịu trách nhiệm? Đừng nhầm bảo mật giao diện với toàn bộ chính sách lưu trữ.

## Iteration, troubleshooting & mẹo làm bài

- **Nắm nhanh:** mô tả đúng lỗi rồi mới sửa: thiếu mục → task statement; thuật ngữ lệch → glossary; drift Project → kiểm instructions/nguồn; độ chậm → tìm bước tốn thời gian bằng dữ liệu.
- **Chọn đáp án:** giữ baseline tốt nhất, đặt giả thuyết, đổi một yếu tố có thể nhận diện, so lại tiêu chí và ghi hiệu ứng. Phần đã được duyệt nên giữ, chỉ sửa đúng feedback; feedback mơ hồ thì làm rõ trước.
- **Biết dừng:** chất lượng plateau qua nhiều lần → nhờ người review hoặc đổi cách tiếp cận. Đừng tiếp tục prompt dài hơn chỉ vì đã tốn công; nếu bản mới tệ hơn, quay lại baseline gần mục tiêu nhất.
- **Khi làm bài:** gặp “BEFORE” hãy tìm đầu vào/phê duyệt còn thiếu; câu sắp thứ tự theo dependency; “Choose two” chọn đủ hai. Ưu tiên nguồn kiểm chứng, quyền được duyệt và handoff rõ hơn phương án hứa tự động hóa toàn bộ.

> **Mẹo nhớ:** Đo lỗi → giả thuyết → đổi một điểm → so baseline → ghi nhận hoặc quay lại.
