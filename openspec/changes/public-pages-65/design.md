# Design

## Context

Khảo sát trên master `397f6b9`; xem [proposal](proposal.md) về mục tiêu. `useHashRoute` mặc định `#/library` ở initial state, popstate và hashchange. `parseRoute` fallback Library; `AppHeader` đưa logo về Library và đang đánh dấu Quiz Bank active cho mọi trang trừ My quizzes. Các test trong `tests/e2e/app.spec.js` và suite khác dùng `./` để vào Library cần được phân loại lại theo ý định test.

`App.jsx` sở hữu theme, title, exam leave guard, account transition và chọn screen. Tokens đã có navy/dark, màu xanh dương và font Inter/system. `useCustomQuizzes` chỉ bật cho private quiz routes; public pages không cần service mới. Spec hiện tại chỉ có `user-profile-access`, không có spec landing/donate trùng lặp.

## Goals / Non-Goals

**Goals:** thêm public screens qua ranh giới sẵn có; entry route và preference rõ ràng; donate không cần bí mật hay dịch vụ chạy nền; chia task đủ nhỏ để review từng phần trong một feature PR.

**Non-Goals:** đổi router/framework, SSR, route `/donate` không hash, redesign Library/quiz, sửa schema/version của quiz hoặc profile, thay triển khai App AI/Firebase, tích hợp nhận thông báo giao dịch.

## Decisions

Owner đã xác nhận ngày 01/11/2026: root hiển thị landing cho mọi người, “Start practicing” mở Library; Donate V1 chỉ hiển thị VietQR và thông tin chuyển khoản, chưa tự xác nhận đã nhận tiền. Hai quyết định này đã chốt và khớp specs hiện tại.

### 1. Navigation dùng hash hiện có

| URL                          | Trang                |
| ---------------------------- | -------------------- |
| Root không hash, `#/`        | Home                 |
| `#/library`                  | Quiz Bank hiện tại   |
| `#/donate`                   | Donate               |
| `#/my-quizzes`, `#/quiz/...` | Hành vi hiện tại     |
| Hash sai/không hỗ trợ        | Library như hiện tại |

Chỉ nhận `#/` và `#/donate` hợp lệ, không biến đường dẫn lạ thành trang donate. Giữ query/canonical alias và vị trí history. Mọi CTA dùng `go`/guard; logo và các nút Back trên Donate về Home, Quiz Bank vẫn trực tiếp. Donate có nút nổi bật ở header/hero và CTA cuối; nav mobile được wrap khi cần. Nút điều hướng section cuộn/focus nội trang mà không ghi hash như `#features` vào router.

Revision 02/11/2026: 4 section Intro/Features/Featured/CTA trải hết chiều ngang, `min-height: calc(100svh - header)`; nội dung căn trong container đọc được. Dùng CSS scroll snap trên document chỉ trong Home, gỡ khi unmount; section dài được cuộn đủ nội dung trên phone/landscape/zoom, theo [snap-area overflow](https://www.w3.org/TR/css-scroll-snap-1/#snap-overflow). Wheel delta nhỏ được tích lũy để chuyển đúng một section rồi chờ chuyển động ổn định; chỉ áp dụng trong Home. Ctrl/Meta zoom, wheel ngang, input/dialog/dropdown và nested scroller giữ native behavior. Section dài cuộn nội dung trước khi bước sang section khác; touch/keyboard vẫn native. Listener/timer được dọn khi rời Home. CSS snap thuần không đủ vì wheel 120/240px quay lại section hiện tại. Desktop có pager bên phải; mobile dùng nút Next trong nội dung để không che CTA. Buttons có accessible name/current state và smooth scroll có kiểm soát; reduced motion dùng instant/proximity. Footer tái sử dụng bên trong section cuối. Back của Donate xóa riêng scroll position Home trước khi về section giới thiệu; browser Back/Forward vẫn giữ restoration hiện có.

Review tiếp 02/11/2026: ambient layer crossfade xanh/teal/tím và accent đổi theo active section; reveal/transition chọn lọc khi section vào/ra, giữ nội dung focused rõ. Finale dùng navy/soft-blue cùng họ màu thay vì primary solid. Desktop thêm catalog counts từ registry, learning hints/path và provider details; mobile ẩn phần bổ trợ để giữ mật độ hiện tại. Donate dùng coffee illustration vector, steam nhẹ và palette ấm; giữ nguyên receiving/QR/copy/download/error/manual-status và Back Home. Không thêm amount picker vì QR tĩnh không khóa số tiền. Reduced motion tắt color/reveal/steam transitions. UI/UX queries: `learning platform dark editorial` → Product Demo + Features (không dùng AI-Native skin); `subtle gradient dark` → Aurora UI, áp dụng blend nhẹ; `color transition reduced motion` → Reduced Motion / Color Only / Excessive Motion. Reuse tokens/Ant Design, không thêm font hay animation library.

Lý do: hash routes tải lại được trên GitHub Pages mà không cần rewrite/404 workaround. Đánh đổi: không hứa SEO hoặc link preview riêng cho từng hash route. Home có title/description/metadata thương hiệu; title client thay đúng theo Home/Donate/quiz. Chuyển trang mới xử lý heading focus/scroll; Back/Forward không phá restoration hiện có.

### 2. Dark-first, tái sử dụng giao diện

Nếu có `quiz-app-theme` hợp lệ, dùng như hiện tại. Nếu chưa có và entry là Home/Donate, khởi tạo dark; nếu entry trực tiếp Library/quiz, giữ fallback hệ thống. Theme hiện hành được giữ qua CTA và lưu bằng cơ chế hiện có; không ép dark mỗi lần route đổi. Storage bị chặn không được làm trang trắng. EN/VN dùng catalog hiện có.

Visual direction: nền navy hiện tại, typography rõ, logo QuizMos, accent xanh dương và họa tiết quỹ đạo nhẹ gợi tên Mos/cosmos. Landing ưu tiên nội dung và preview quiz gọn; không video autoplay, thư viện animation hoặc font mới. Dark là thiết kế chính, light vẫn đầy đủ. QR luôn đen/trắng với quiet zone, không invert theo theme hay chèn logo che mã.

Wireframe đề xuất:

1. Header hiện tại: logo/Home, Quiz Bank, My quizzes; utilities bên phải.
2. Hero: “Small quizzes. Big confidence.” (copy nháp), một câu mô tả và “Start practicing”; desktop chia nội dung/preview, mobile xếp dọc.
3. Ba lợi ích: Practice có giải thích, Exam có thời gian, Study guides theo bank có hỗ trợ.
4. Featured banks AIP-C01/CCAR-P, lấy metadata/link từ registry.
5. CTA luyện tập, lời mời ủng hộ nhỏ và footer.

Preview dùng component/mockup có nhãn minh họa, không chạy quiz session hoặc gọi AI. Không quảng cáo App AI vô hạn hoặc custom cloud quiz đã rollout đầy đủ. Trạng thái tính năng đối chiếu issue rollout thực tế trước chốt copy.

UI/UX search: `quiz exam landing dark --design-system` trả **Product Demo + Features** phù hợp bố cục, nhưng **Claymorphism**/font trẻ em không phù hợp. Retry `developer tool dark minimal --design-system` trả **Dark Mode (OLED)** phù hợp hướng dark; **FAQ/Documentation Landing** không phù hợp nên không dùng. Dùng local reference về contrast/focus/44px/reduced motion; giữ tokens/Ant Design thay vì áp nguyên palette, font, analytics hoặc dark-only của generator. Không persist một design system mới.

### 3. Donate bằng QR tĩnh

Một module cấu hình công khai dự kiến chứa `enabled`, ngân hàng/BIN, số tài khoản dạng string, tên người nhận, nội dung gợi ý và đường dẫn asset local. QR PNG chuẩn từ app ngân hàng/VietQR được owner xác minh; không có số tiền cố định. Không cần generator hoặc package mới trong V1. Nếu cần QR đổi theo amount, đó là scope mới cần đánh giá generator/payload và kiểm thử giải mã riêng.

Owner đã cung cấp ngày 01/11/2026 ngân hàng TPBank, tên người nhận và số tài khoản, sau đó yêu cầu implement trang donate. Thông tin nhận chuyển khoản nằm trong module cấu hình công khai cần cho trang này; issue/tài liệu không sao chép chi tiết tài khoản. Không có credential ngân hàng.

Mã ngân hàng `TPB` / BIN `970423` được đối chiếu qua [API ngân hàng VietQR](https://api.vietqr.io/v2/banks). Số tài khoản giữ dạng string, nguyên số 0 đầu. QR PNG 540px đã tạo offline bằng QR encoder có sẵn trong dependency Ant Design; không gọi API Generate/Quicklink hoặc thêm package vào app. CRC đối chiếu vector mẫu từ [VietQR](https://www.vietqr.io/generate); decoder độc lập jsQR 1.4.0 đọc ảnh và khớp payload: BIN/account/memo, initiation tĩnh, không tag amount. Tooling/decoder dùng một lần nằm ngoài Git. Owner đã quét QR và trả lời “Đúng người nhận và số tài khoản” ngày 01/11/2026; vì vậy cấu hình Donate được bật. Không thực hiện giao dịch hoặc dùng API tra cứu tài khoản.

Đây là thông tin nhận chuyển khoản, không phải thông tin đăng nhập. Không thu password/OTP/API token. Không đưa vào GitHub Secrets với kỳ vọng giấu giá trị đã hiển thị trên website. Credential cần trong một tích hợp tương lai phải ở backend/Worker, không `VITE_*`.

Decode asset, đối chiếu BIN/account/no fixed amount, và để owner kiểm tra màn hình xác nhận người nhận trong app ngân hàng trước publish. Không thực hiện chuyển tiền để test. Nội dung gợi ý phải khớp payload nếu QR có memo; nếu QR không chứa memo, hướng dẫn nhập tay. Một lần thay recipient phải cập nhật config + asset cùng commit/build, dùng tên asset phiên bản mới để tránh ảnh cũ trong cache.

Page hiển thị lý do ủng hộ, QR, chi tiết tài khoản, “Copy account”, “Copy transfer note”, “Download QR”, hướng dẫn chọn ảnh từ thư viện trong app ngân hàng nếu được hỗ trợ và cách copy thủ công. Static asset cùng origin hỗ trợ download và không gửi account/amount tới dịch vụ QR khi người dùng mở trang. QR lỗi hiện fallback văn bản; thiếu/chưa duyệt config thì trạng thái unavailable, không dùng tài khoản mẫu. Không có nút “Tôi đã thanh toán” hoặc thông báo nhận tiền tự động.

### 4. Boundaries và trạng thái

`LandingPage`/`DonatePage` render nội dung; helper nhỏ xác thực public config, hook clipboard quản lý kết quả nếu cần. Không thêm logic page lớn vào `App.jsx`. Asset dùng `BASE_URL`. Public content không chờ auth hay đọc dữ liệu học riêng; giữ nguyên hook auth/account isolation hiện có.

Không đổi ID/version/draft/checkpoint. Không có request QR bên ngoài nên không phát sinh race tạo QR; clipboard async cần bỏ qua completion sau unmount và tránh toast cũ. Tái dùng exam guard kể cả logo/Home để giữ một confirmation khi click nhanh, Back và Cancel. Client validation của config chỉ ngăn hiển thị sai; không xác minh ngân hàng hay thay thế Firestore Rules. Không sửa Rules hoặc quyền cloud.

## Risks / Trade-offs

- Thay root làm hỏng test cũ → test về Library dùng `./#/library`, giữ test root riêng cho Home; không làm yếu assertion cũ.
- Thêm navigation làm mất phiên thi hoặc đổi account sai → regression guard/Back/Cancel/resume; giữ fixture account isolation.
- QR sai hoặc ảnh bị crop/cache cũ → kiểm tra payload + owner preview, quiet zone và asset version, chặn activation nếu chưa xác minh.
- QR không tự báo tiền về → copy hướng dẫn rõ; đối soát thủ công ngoài app. Không hứa miễn phí toàn bộ dịch vụ/chuyển khoản ngân hàng; V1 không thêm subscription QR/backend.
- Metadata hash routes hạn chế → chỉ hứa metadata chung và title client; prerender/SEO riêng là scope sau.

## Verification plan

| Requirements | Kiểm tra khi implement                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| CQ-HOME-01   | Unit route/alias/query/fallback; E2E root/CTA/deep link/refresh/Back-Forward                                       |
| CQ-HOME-02   | Content/featured-link review; E2E start-as-guest; không fetch quiz/AI cho preview                                  |
| CQ-HOME-03   | Unit preference: saved/empty/invalid/storage-error; E2E dark-first và saved light/EN/VN                            |
| CQ-HOME-04   | E2E leave/cancel/resume/rapid-click, auth loading/error/account transition; focus/contrast/overflow                |
| CQ-HOME-05   | E2E wheel/keyboard/section nav, kích thước panel, hash không đổi, reduced motion, cleanup snap; visual mobile/zoom |
| CQ-HOME-06   | Donate visible ở header/hero, pointer/keyboard, trở về Home từ cả hai nút Back                                     |
| CQ-DONATE-01 | E2E direct route, refresh, links về Home/Library khi guest                                                         |
| CQ-DONATE-02 | Unit config/missing/invalid; decode asset và owner kiểm tra người nhận, amount, memo                               |
| CQ-DONATE-03 | Clipboard success/denied, image error, download identity, leading-zero account, unmount                            |
| CQ-DONATE-04 | Fixture network assertion không có donate IO; review không có trạng thái nhận tiền giả                             |

Planning chỉ chạy SDD validation, format và kiểm tra links. Implementation chạy `yarn verify`, UI-skill integrity và E2E phù hợp; dùng fixtures, không gọi live bank/Firebase/AI. Browser review 320/390/412/768/1280px và landscape, EN/VN × light/dark theo matrix có chọn lọc, reduced motion, keyboard/text zoom. Tái sử dụng viewport helpers, không nhân mọi test với mọi tổ hợp. CI tự chọn profile theo diff, không sửa pipeline trong feature này; tập hợp thay đổi trước push thay vì mỗi task một CI run.

## Migration Plan

Một feature PR `Refs #65`, chỉ khi user yêu cầu implementation. Bắt đầu với config disabled/fixture; owner có thể cung cấp QR trong khi làm landing. Chỉ bật donate thật sau xác minh; nếu chưa có dữ liệu thì báo rõ phần còn thiếu và giữ issue mở, không tự đổi accepted scope thành placeholder đã hoàn thành.

Sau CI latest head pass, chỉ merge theo yêu cầu. Kiểm tra post-merge CI/deploy, HTTPS root/Home/Library/Donate, deep link cũ, QR download trên production build và owner preview người nhận. Đóng issue sau toàn bộ accepted scope được nghiệm thu. Rollback bằng revert PR hoặc tắt config donate nếu chỉ QR lỗi; không migration dữ liệu cần đảo ngược.

## Open Questions

- QR tĩnh đã kiểm tra payload và owner đã xác nhận người nhận; Donate đã bật. Copy/layout EN/VN đã có trên implementation để review cùng PR. Không còn input sản phẩm chặn implementation; CI, merge và rollout vẫn theo delivery gates.
