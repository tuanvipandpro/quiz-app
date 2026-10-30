# Design

## Context

Xem proposal.md và capability delta để biết mục tiêu. MyQuizzes hiện chỉ giữ một upload trong sessionStorage; App dùng ID `custom` và bank checkpoint nằm trong `users/{uid}.quizProgress`. Validator đã hỗ trợ multiple choice, yes/no, dropdown rows/inline. Browser tests hiện thay thế auth/profile service; chưa kiểm chứng Rules thật.

Baseline do người dùng cung cấp được giữ nguyên tại `firebase/baseline/firestore.rules` và kiểm tra hash gốc. Nó chỉ allow profile của chính UID, không có quyền customQuizzes. `firebase/firestore.rules` hiện là candidate policy cho feature, không phải xác nhận đang deploy. Nguồn baseline là bản người dùng xác nhận publish, chưa phải management API export.

## Goals / Non-Goals

**Goals:** cô lập nội dung cá nhân, enforce quota từ Rules, chống ghi đồng thời/tab cũ, giữ đúng identity/version của tiến trình và tái sử dụng study UI.

**Non-Goals:** không thay đổi cấu trúc checkpoint của bank, không mở public sharing/editor, không thêm backend server nếu client transactions và Rules đủ đáp ứng các requirement đã nêu. Setup không deploy hoặc bật tính năng.

## Decisions

### D1 — Three fixed slot documents

Lưu tại `users/{uid}/customQuizzes/slot-1|slot-2|slot-3`. Rules whitelist ba ID và kiểm tra `request.auth.uid == uid`. Tính quota từ các slot tồn tại. Dùng hằng số/contract chung trong app; Rules có danh sách tương ứng và Emulator tests khóa sự nhất quán.

So với counter trong profile, fixed slots tránh counter drift và không đụng profile chứa key/checkpoint bank. Arbitrary document IDs + chỉ đếm ở UI không đáp ứng CQ-02. Nội dung tách khỏi profile để không phình document profile.

### D2 — Instance, revision and content version

Envelope đề xuất: `instanceId`, `title`, `questions`, `questionCount`, `contentVersion`, `revision`, `createdAt`, `updatedAt`, `checkpoint`.

- `instanceId`: UUID tạo trước transaction, mới khi tạo quiz vào slot; không thay đổi bởi rename/replace.
- `revision`: tăng trên mỗi thay đổi metadata/content để phát hiện stale edits.
- `contentVersion`: tăng khi thay questions; rename giữ nguyên.
- `checkpoint`: null hoặc `{ instanceId, contentVersion, questionId, questionIndex, savedAt }`, nằm cùng document để replace/delete reset tiến trình một cách atomic.

Tái sử dụng slot tạo UUID mới và checkpoint null. Không dùng slot ID một mình làm quiz identity. Lựa chọn checkpoint cùng doc giảm rủi ro orphan; trade-off là checkpoint transaction đọc doc có questions. Giới hạn tối đa ba quiz và chỉ tải khi mở My quizzes/deep link giúp giới hạn chi phí.

### D3 — Transactions and operation identity

Create transaction đọc ba slot, trả về instance đã tồn tại cho cùng operation/instance ID khi retry, hoặc ghi một slot trống. UUID không tạo bên trong callback transaction. Hai ứng viên khác nhau tranh slot cuối phải được retry theo Firestore và một bên nhận quota/conflict.

Nếu cùng operation ID nhưng title/content đã khác lần commit trước, service trả conflict thay vì báo đã lưu nội dung mới. Cùng một candidate giữ UUID qua lỗi/retry; chọn tệp mới tạo operation mới.

Rename/replace/delete nhận expected instanceId + revision, đọc slot trong transaction rồi so sánh trước khi mutate. Checkpoint save so instanceId + contentVersion để rename không làm mất tiến trình. Rules giữ instanceId bất biến trên update và kiểm tra field/type/version transitions; delete stale được bảo vệ bằng transaction read precondition. Quyền owner xóa quiz bằng SDK là quyền có chủ ý, không phải cơ chế chống client độc hại tự xóa dữ liệu của họ.

### D4 — Validation and size budget

Tái sử dụng validator khi parse và đọc stored content. Rules enforce allowed fields, slot, ownership, questions list length 1–100 và questionCount bằng list size; không giả định Rules duyệt và hiểu mọi loại câu hỏi lồng nhau.

Default kỹ thuật đề xuất: `MAX_CUSTOM_QUIZ_BYTES = 750 * 1024` cho JSON UTF-8 của save candidate đầy đủ, title trim tối đa 160 ký tự. Đây là budget bảo thủ, không phải phép tính chính xác kích thước Firestore. Kiểm tra boundary bằng Emulator và vẫn xử lý server size rejection, giữ preview cho retry. Raw-file limit đang có không được dùng thay kiểm tra document.

### D5 — State and integration boundaries

Thêm custom-quiz service và hook/store có account/request generation giống quizProgressStore. Component chỉ nhận state/actions. Cache theo UID + instanceId + contentVersion; hủy/bỏ qua request cũ khi account đổi. Chỉ tải custom docs khi mở My quizzes hoặc custom deep link; trang bank không phụ thuộc request này.

Route/loaded-quiz identity cần discriminator `bank`, `tab-upload`, `cloud-custom` và mapping tới slot/instance; draft key bao gồm UID, instanceId, contentVersion, mode. Trước khi mount study, kiểm tra instance/version của slot. Giữ endpoint/ID bank hiện tại. Không viết checkpoint cloud custom vào map checkpoint bank.

Route cloud dùng ID `cloud:<slotId>:<instanceId>` với `version` trong query. Link thiếu version được canonicalize theo bản server trước khi mount study. Hook chỉ tải trên personal routes, dùng server reads cùng listener bỏ qua cached snapshots, bỏ response cũ theo UID/request generation và làm mới khi quay lại tab. Mutation từ tab khác vô hiệu draft của đúng instance; metadata rename không reset draft.

Rename chỉ cập nhật title/revision. Replace atomically ghi questions/count, tăng revision/contentVersion và đặt checkpoint null; local draft cũ bị vô hiệu theo version. Delete xóa cùng checkpoint và dọn cache/draft của đúng instance. Tab khác kiểm tra lại slot/version trước khi save/resume, không tin snapshot cũ.

### D6 — Mobile workflow

Guest tiếp tục upload/thử trong tab; CTA lưu cloud yêu cầu đăng nhập và thao tác save rõ ràng. Không tự migrate upload/draft guest khi login. Owner thấy quota, danh sách tối đa ba quiz, preview rồi save. Khi đầy, cung cấp replace/delete; không silently overwrite. Confirmation replace/delete giải thích mất tiến trình; lỗi lưu giữ candidate. Áp dụng checklist UI/UX trong AGENTS.md và kiểm tra các width/language/theme đã quy định.

### D7 — Verification and release

Setup kiểm chứng baseline owner profile/guest/cross-account/descendant access. PR tính năng bổ sung unit/service tests cho validation/idempotency/version và Emulator tests CQ-01..08, E2E CQ-09..12. Bảng verification.md phân biệt bằng chứng setup và bằng chứng tính năng chưa có.

Không archive change hoặc đóng #42 chỉ vì artifact validation xanh. OpenSpec validate kiểm tra cấu trúc, không chứng minh tính năng chạy đúng.

## Risks / Trade-offs

- [Rules production thay đổi sau snapshot] → đối chiếu bản publish mới trước rollout; giữ profile contract và kiểm tra recursive allow có thể bypass hạn chế mới.
- [Questions nhiều trường vượt kích thước dù JSON dưới budget] → test boundary, budget bảo thủ, xử lý lỗi server; không báo save thành công trước commit.
- [Listing đọc cả questions] → chỉ đọc tối đa ba docs khi cần; không prefetch ở Quiz Bank. Nếu cần metadata-only sau này, làm thay đổi thiết kế riêng có contract đồng bộ.
- [Index configuration chưa được export] → review indexes hiện tại trước khi thêm exemption cho `questions`; không deploy file indexes rỗng làm mất cấu hình khác.
- [Tab offline giữ dữ liệu cũ] → explicit conflict/reload và versioned drafts; không queue mutation có thể silently overwrite.

## Migration Plan

1. Merge setup PR sau review artifacts/baseline tests; chưa bật cloud quiz.
2. Implement đầy đủ trong feature PR với tests và bằng chứng; đọc lại production Rules/indexes để kiểm tra drift.
3. Sau khi bản feature review/kiểm tra đạt và có chỉ dẫn rollout, deploy Rules tương thích trước; xác nhận rules đã có hiệu lực rồi mới merge/enable client UI.
4. Không tự migrate upload local hoặc bank checkpoints. Owner chủ động lưu local candidate.
5. Nếu cần rollback, tắt/revert UI cloud và giữ nguyên dữ liệu riêng tư; kiểm tra các client đang dùng trước khi rollback rules. Không xóa quiz để rollback.

## Open Questions

Không có quyết định sản phẩm cốt lõi đang bị bỏ trống. Người thực hiện deployment và thời điểm rollout sẽ chốt sau khi feature PR có bằng chứng. Budget 750 KiB là default kỹ thuật cần xác nhận bằng boundary tests trong bước triển khai, không phải thay đổi quota 3/100.
