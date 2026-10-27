**Bộ lọc 10 giây:** gạch chân dữ liệu, quyền truy cập, độ trễ và ngân sách; loại phương án vi phạm ràng buộc trước khi so mức vận hành. Chọn nhiều đáp án: mỗi lựa chọn phải giải quyết một yêu cầu còn thiếu, không mâu thuẫn lựa chọn khác.

**Luồng nhớ:** chuẩn bị dữ liệu → truy xuất đúng → sinh có kiểm soát → kiểm chứng → đo và cải tiến. Mẹo giúp hiểu tình huống, không thay thế việc đọc đủ điều kiện đề.

## Model, API & chi phí

- **Chọn dịch vụ:** Bedrock cho FM được quản lý; SageMaker khi cần kiểm soát hosting/model/hạ tầng. Edge hoặc hybrid phải xét khả năng triển khai thực tế, không suy mọi FM Bedrock chạy được on-premises.
- **Chọn model:** đo quality–latency–cost; tác vụ đơn giản dùng model nhỏ, khó mới chuyển model mạnh. AppConfig quản lý routing/feature flags khi chạy; model upgrade phải qua eval và rollback.
- **API:** Converse thống nhất hội thoại cho model hỗ trợ; ứng dụng gửi lại messages cần giữ. InvokeModel dùng payload theo model. Kiểm tra SDK, Region và tính năng trước khi đổi API.
- **Chi phí:** on-demand hợp tải biến động; Provisioned Throughput dành capacity có cam kết, dùng đúng ARN. Tính cả input/output, retry và eval. Prompt caching tái dùng prefix; semantic response cache cần freshness, quyền và tenant isolation.

> **Mẹo nhớ:** Chọn theo ràng buộc; cache prefix khác cache câu trả lời.

## Ingestion, chunking & đa phương thức

- **Pipeline:** extract → làm sạch/khử PII → kiểm chất lượng → chunk → embedding → index. Glue cho ETL/catalog/data quality; giữ nguồn, timestamp và metadata để truy vết, lọc, cập nhật.
- **Chọn chunk:** fixed-size đơn giản; semantic giữ ý nghĩa; hierarchical tìm child rồi đưa context parent. Đo retrieval và token budget; chunk lớn nhất không mặc nhiên tốt nhất.
- **Đa phương thức:** Textract xử lý tài liệu scan; Transcribe cho lời nói; BDA/FM hỗ trợ phân tích nội dung theo khả năng tương ứng. Video cần giữ timestamp để ghép frame–transcript–metadata và tìm về đúng đoạn.
- **Tránh bẫy:** chỉ cắt tài liệu mà không tổng hợp lại; thay chunk/embedding nhưng giữ index cũ; xóa nguồn nhưng không đồng bộ index. OCR kém tin cậy cần review trước khi dùng tiếp.

> **Mẹo nhớ:** Sạch trước nhúng; giữ ý khi cắt; giữ nguồn khi ghép.

## RAG, retrieval & citation

- **Chọn RAG:** tri thức riêng/cập nhật, cần nguồn dẫn → Knowledge Bases. Fine-tuning không tự cập nhật kho sự thật. Retrieve trả tài liệu; RetrieveAndGenerate ghép truy xuất và sinh, có citation.
- **Đúng kiểu tìm:** vector tìm gần nghĩa; hybrid thêm keyword cho mã, thuật ngữ, acronym khi store hỗ trợ. Quan hệ nhiều bước có thể xét graph/query decomposition, không chọn chỉ vì dữ liệu nhiều.
- **Rerank:** lấy đủ ứng viên rồi xếp lại theo query, chỉ gửi top phù hợp vào context. Ví dụ retrieve 50, rerank còn 10 giải bài relevant document nằm ngoài top 10.
- **Đúng dữ liệu:** metadata filter thu hẹp phạm vi; ACL/phân quyền phải được thực thi theo user. Tài liệu hết hạn phải sync/xóa khỏi index. Citation cần được đối chiếu, không tự chứng minh kết luận đúng.

> **Mẹo nhớ:** Retrieve tìm đủ; rerank chọn đúng; citation chỉ đường kiểm chứng.

## Prompt, schema & phiên bản

- **Prompt rõ:** nhiệm vụ, dữ liệu, ràng buộc, format và ví dụ đại diện. Tách nội dung truy xuất khỏi chỉ dẫn đáng tin; chỉ dẫn trong tài liệu không được tự nâng thành quyền thực thi.
- **Version:** Prompt Management quản lý variables, variants và phiên bản; Flows ghép bước. Git/CI lưu lịch sử và eval trước khi promote, không coi đổi prompt là thay đổi vô hại.
- **Contract:** yêu cầu JSON chưa đủ; dùng structured output khi model/API hỗ trợ, rồi validate schema và nghiệp vụ. Text-to-SQL cần parser, kiểm schema, quyền hẹp và giới hạn truy vấn trước execution.
- **Tránh bẫy:** temperature thấp hay “suy nghĩ từng bước” không bảo đảm đúng. Nội dung bắt buộc xuất hiện luôn, như disclaimer, nên được thêm/kiểm bằng logic xác định sau sinh; không trông chờ reranking bảo đảm câu chữ.

> **Mẹo nhớ:** Prompt hướng dẫn; validator kiểm; code giữ điều kiện bắt buộc.

## Agent, MCP & workflow

- **Đúng vai:** knowledge base cung cấp tri thức; tool/action group thực hiện hành động. Bedrock Agents Classic xuất hiện trong bank; hiện đóng với khách hàng mới. AgentCore có runtime, memory, identity và observability; kiểm trạng thái dịch vụ khi triển khai.
- **Điều phối:** bước phụ thuộc → tuần tự; độc lập → Parallel/Map. Step Functions giữ state, Retry/Catch từng task; payload lớn giữ ở S3 rồi truyền URI thay vì nhồi vào state.
- **Chờ người:** Standard workflow với callback task token cho phê duyệt dài. Lưu quyết định, xác thực callback, đặt timeout; retry hành động có side effect cần idempotency.
- **MCP:** chuẩn kết nối tools/resources; remote thường Streamable HTTP kèm authentication. MCP không tự cấp quyền hoặc là giao thức nhắn tin giữa agent; phối hợp agent cần orchestration riêng.

> **Mẹo nhớ:** Tool làm việc; workflow giữ trình tự; con người chốt bước rủi ro.

## Guardrails, PII & grounding

- **Chọn filter:** harmful content/prompt attack → content filters; chủ đề cấm → denied topics; từ cụ thể → word filters; PII → sensitive information. Grounding so câu trả lời với nguồn/query, khác lọc nội dung độc hại.
- **Block hay mask:** block chặn nội dung vi phạm; mask che giá trị nhạy cảm. Kiểm cả input lẫn output: model có thể sinh thông tin không nằm trong input. Lọc input thôi chưa đủ.
- **Phòng thủ nhiều lớp:** guardrails + validation + nguồn đáng tin + human review cho ca khó. Guardrails không tự áp dụng lên references được Knowledge Bases truy xuất; bảo vệ cả pipeline.
- **Tránh bẫy:** không suy filter luôn đạt 99% độ chính xác. Đo false positive/negative trên dữ liệu đại diện. Prompt Management không phải bộ phát hiện PHI; log cũng cần kiểm soát dữ liệu nhạy cảm.

> **Mẹo nhớ:** Độc hại lọc nội dung; riêng tư che/chặn; đúng nguồn kiểm grounding.

## IAM, mạng riêng & data residency

- **Quyền:** IAM cho phép hành động; SCP/permissions boundary giới hạn quyền, không tự cấp quyền. Cross-account cần trust policy và permissions; dùng STS credentials tạm, giữ user context qua session tags khi phù hợp.
- **Mạng/dữ liệu:** PrivateLink runtime endpoint cho đường gọi riêng, không thay IAM. Lake Formation kiểm dữ liệu bảng/cột; OpenSearch Serverless cần cả IAM, data access và network policy phù hợp.
- **Region:** geographic inference profile chỉ giới hạn theo geography đã khai báo; “EU” không phải “chỉ eu-central-1”. Global profile không đáp ứng yêu cầu chỉ xử lý tại EU. Đối chiếu mọi Region đích với IAM/SCP và residency.
- **Audit:** CloudTrail ghi ai làm gì; invocation logging phục vụ nội dung tương tác, cần cấu hình riêng. S3 Object Lock cho lưu giữ bất biến; mã hóa, redaction và retention vẫn phải thiết kế.

> **Mẹo nhớ:** Trust cho ai; permission cho gì; endpoint cho đường; residency cho nơi.

## Hiệu năng, eval & vận hành

- **Đo đúng:** latency đầu token/toàn bộ, error/throttle, token/cost, chất lượng và business KPI. CloudWatch cho metrics/alarms; tracing/X-Ray/AgentCore Observability tìm bước chậm, tool lỗi.
- **Streaming:** cải thiện thời gian thấy kết quả, không tự giảm tổng thời gian sinh. Chọn transport tương thích; stream đứt cần xử lý partial output/retry, không mặc định API hỗ trợ resume từ chunk cuối.
- **Giữ tải:** bounded backoff + jitter; adaptive retry theo throttling khi phù hợp. Queue hấp thụ burst; circuit breaker mở fallback, thăm dò phục hồi. Retry không thay tăng quota hoặc sửa lỗi quyền.
- **Eval:** golden dataset đại diện ngôn ngữ/edge case; đo retrieval precision/recall và answer correctness/groundedness riêng. LLM judge cần rubric, kết hợp human review; so chữ giống nhau chưa đủ.
- **Rollout:** CI chặn dưới ngưỡng; A/B/canary có metric và rollback. Lưu prompt/model/config, dataset và kết quả để so regression. AccessDenied: kiểm trust role, quyền caller, S3/KMS và policy liên quan.

> **Mẹo nhớ:** Trace tìm tầng; eval tìm sai; canary giới hạn ảnh hưởng; rollback giữ đường về.
