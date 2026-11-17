---
name: web-release-quality
description: "Audit and implement secure, privacy-aware, legally reviewable, accessible, distinctive web applications. Use for web design, React/Django changes, authentication, payments, database, deploy, code review, pre-publication checks, PRs and security/legal/UI-UX audits; Vietnamese e-commerce supported."
---

# Web Release Quality — 60-point agent skill

## Mục tiêu

Xây dựng và rà soát website theo ba trụ cột: **20 điểm bảo mật (S01–S20)**, **20 điểm pháp lý/quyền riêng tư/tiếp cận (L01–L20)** và **20 dấu hiệu UI/UX rập khuôn (U01–U20)**. Áp dụng **trước khi code**, **trong khi sửa**, **trước khi merge** và **trước khi public**. Dùng cho CommerceOS/NEXA hoặc dự án web khác.

> Đây là quy trình kỹ thuật và đánh giá rủi ro, **không phải** chứng nhận an toàn, kết luận pháp lý hay thẩm định bản quyền. Mọi kết luận phải gắn bằng chứng và phạm vi kiểm tra.

## Khi nào gọi skill

- Người dùng yêu cầu tạo/thiết kế website, frontend, backend, API, database, OAuth, upload, checkout/payment, admin hoặc deploy.
- Người dùng yêu cầu “kiểm tra bảo mật”, “rà soát pháp lý”, “đừng giống AI”, “review trước public”, “audit repo”, “kiểm tra PR/commit” hay “tạo Issue fix lỗi”.
- Trước khi public domain hoặc release có chức năng thu thập dữ liệu/thanh toán.

## Chọn chế độ

1. **BUILD**: trước khi tạo hoặc sửa tính năng, đọc những tiêu chí liên quan; thiết kế phòng ngừa ngay từ đầu; chạy test tại phạm vi thay đổi.
2. **CHANGE REVIEW**: so sánh diff và call-site/route/dependency liên quan. Kiểm thử regression; không suy diễn toàn bộ repo từ một file.
3. **FULL AUDIT / PRE-RELEASE**: đánh giá tất cả 60 ID; lập báo cáo cho từng ID. Chỉ kết luận `PASS` nếu có bằng chứng phù hợp.
4. **ISSUE MODE**: phân nhóm các finding đã xác minh, đối chiếu Issue mở/đóng/PR, tạo hoặc soạn Issue theo mẫu, không tạo trùng.

## Tài liệu bắt buộc đọc theo phạm vi

- [20 điểm bảo mật](references/security-20.md) — đọc khi xử lý auth, API, upload, infra, database, thanh toán; bắt buộc trong FULL AUDIT.
- [20 điểm pháp lý và quyền riêng tư](references/legal-privacy-20.md) — đọc khi triển khai form, analytics, pixel, policy, bán hàng, xử lý dữ liệu; bắt buộc trong FULL AUDIT.
- [20 điểm UI/UX tránh rập khuôn](references/ui-ux-20.md) — đọc khi thiết kế/thay đổi trang và component; bắt buộc trong FULL AUDIT.
- [Mẫu báo cáo](templates/audit-report.md) và [mẫu GitHub Issue](templates/github-issue.md) khi cần xuất kết quả.

## Quy trình bắt buộc

### A. Khám phá trước khi sửa

1. Đọc README, cấu trúc, branch, trạng thái Git, cấu hình chạy/test/deploy, CI, database, API contracts, trang và thành phần đang render thật.
2. Phân định môi trường **local / test / staging / production**; ghi rõ cái nào thực sự kiểm tra được.
3. Xác định nguồn dữ liệu thật. Không nhúng dữ liệu người dùng, giá, tồn kho, review, đơn hàng giả trong mã nguồn vận hành. Seed/fixture chỉ dùng có chủ đích trên môi trường demo/test riêng.
4. Nhận diện phạm vi quyền và tin cậy: anonymous/customer/staff/admin; client/server; third-party OAuth/payment; browser cookie/storage; secrets.
5. Đọc code đủ xuyên suốt luồng liên quan: **UI → API → permission → validation → service → model → DB → response**, và các test đang có.

### B. Threat model & privacy model trước triển khai

- Liệt kê assets: mật khẩu, JWT/session, OAuth tokens, PII, đơn hàng, thanh toán, kho, file upload, secret.
- Liệt kê actor và misuse case: khách xem đơn khác, staff vượt quyền, giả callback, replay, XSS, CSRF, file độc, SQLi, race condition.
- Liệt kê dữ liệu thu thập và thời gian lưu, mục đích sử dụng, căn cứ xử lý, bên nhận, vị trí lưu, yêu cầu xóa/truy cập, retention exceptions.
- Với UX, định nghĩa khách hàng mục tiêu, brand words, visual references hợp pháp, design tokens, thông điệp bán hàng cụ thể; phân tích ít nhất một bố cục khác khuôn AI phổ biến.

### C. Thiết kế & code

- **Security-by-default**: bảo vệ server-side, least privilege, deny-by-default, secrets qua môi trường, chống injection, mã hóa truyền tải, giới hạn input, transaction/idempotency cho nghiệp vụ tiền và kho. Đừng thay đổi permission hay auth vì UI gặp lỗi.
- **Privacy-by-design**: thu thập tối thiểu, giải thích trước khi thu, minh bạch về tracking/third-party, phân biệt consent với các căn cứ xử lý khác; tách test data khỏi production.
- **Distinctive UX**: không copy 3-card hero mặc định hoặc gradient/neon/glassmorphism một cách tự động; sử dụng visual language nhất quán, tránh những lời quảng cáo sáo rỗng hoặc chưa được kiểm chứng; giữ keyboard, contrast, labels, empty/error/loading/reduced-motion.
- Không xóa database, reset tài khoản, chạy destructive migration, public secret hoặc bật cổng thanh toán thật trong test mà không có yêu cầu rõ.

### D. Kiểm chứng

1. Chạy test/lint/build/migration/security checks hiện có; ghi lệnh, môi trường, exit code, số test, lỗi.
2. Test positive + negative: auth, IDOR, staff RBAC, input/size/type, expired/replay tokens, concurrent payment/checkout, XSS/CSRF và failure recovery **trên môi trường được phép**.
3. Chụp ảnh/kiểm tra browser ở desktop + mobile, keyboard-only, focus, alt, contrast, tương phản sáng/tối, reduced motion, nội dung/footer; so sánh với thiết kế/brand brief thay vì chấm theo sở thích cá nhân.
4. Đối chiếu pháp lý theo **quốc gia, mô hình kinh doanh, dữ liệu thực tế, thời điểm**, tra nguồn nhà nước/primary sources hiện hành; đánh dấu `LEGAL_REVIEW_REQUIRED` khi cần tư vấn chuyên môn.
5. Với mục cần hạ tầng thật (Cloudflare/WAF, backup restore, logs, HTTPS, DB network), nếu không truy cập được cấu hình vận hành, ghi `UNVERIFIED`, **không** ghi PASS.

### E. Ghi kết quả & hoàn thiện

- FULL AUDIT: có **đủ 60 ID**. Mỗi ID có `PASS | FAIL | PARTIAL | NOT_APPLICABLE | UNVERIFIED`, severity, confidence, bằng chứng (file:dòng/test/ảnh/cấu hình), nguyên nhân và next action. Không đánh đồng `NOT_APPLICABLE` với `PASS`.
- Finding chỉ coi là **verified** nếu có bằng chứng reproducible (test fail, code-path, screenshot hoặc cấu hình); giả thuyết phải tách riêng.
- Prioritize P0: rò secret, admin bypass, payment forged, PII leak, destructive DB; P1: auth/IDOR/XSS, sai tiền, unhandled retention; P2: UX/a11y và vấn đề không blocker theo ngữ cảnh; P3: cosmetic.
- Tạo Issue theo `templates/github-issue.md`: một root cause/một Issue; tìm trùng theo fingerprint (rule ID + module + lỗi logic), kiểm tra issues cũ. Không tạo 60 Issues nếu không có 60 lỗi.
- **Release gate**: từ chối đánh dấu “ready for production” nếu còn P0/P1 đã xác minh liên quan dữ liệu, tài khoản, thanh toán, hoặc kiểm soát pháp lý bắt buộc chưa được làm rõ. Trình bày block và owner/action; không hứa có thể chứng nhận tuân thủ pháp luật.

## Điều chỉnh để tránh hiểu sai các video

- **Password**: Argon2id/bcrypt được ưu tiên; PBKDF2 cấu hình đúng có thể phù hợp. Không buộc thay thuật toán chỉ vì tên khác; quan trọng việc sử dụng chuẩn password hashing và migration an toàn.
- **Cookies**: `HttpOnly`, `Secure`, `SameSite` áp dụng theo chức năng cookie/session; CSRF token và các cookie JS cần truy cập có ngoại lệ hợp lý. Nếu JWT dùng localStorage, đánh giá nguy cơ XSS thay vì tuyên bố cookie flags đã bảo vệ token.
- **Consent**: không mặc định mỗi form đều cần một checkbox đồng ý; xác định căn cứ xử lý, mục đích, cookie/tracking và quy định cụ thể. Khi consent là căn cứ, phải tự nguyện, cụ thể, minh bạch, có khả năng rút lại.
- **Pháp lý VN (2026)**: ngoài Nghị định 13/2023/NĐ-CP, phải xem **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** và **Nghị định 356/2025/NĐ-CP**, có hiệu lực 01/01/2026, cùng văn bản liên quan; xác minh tình trạng hiệu lực mới nhất.
- **TMĐT**: với website bán hàng tại Việt Nam, kiểm tra nghĩa vụ thông báo/đăng ký TMĐT và thông tin chủ thể phù hợp mô hình; không kết luận chỉ từ giao diện.
- **Accessibility**: nhắm WCAG 2.2 AA như chuẩn chất lượng; không khẳng định nghĩa vụ luật áp dụng ngang nhau mọi website/quốc gia.
- **Cloudflare**: WAF/CDN/DDoS mitigation là phương án, không phải điều kiện pháp lý hoặc kỹ thuật bắt buộc phải dùng thương hiệu Cloudflare.
- **“AI-looking”**: tím, Inter, gradient, 3 cards hay bo góc **không phải lỗi tự thân**. Đánh giá sự rập khuôn, nhận diện thương hiệu, nội dung và khả năng sử dụng. Các thống kê “120 trang/63%/60%/6 dấu hiệu” từ video chưa được kiểm chứng; không sử dụng làm thước đo khoa học.

## Kết quả trả về trong chat

1. Phạm vi: branch/commit, môi trường, URL, tool đã dùng và không dùng.
2. Bảng tổng quan S/L/U (PASS, FAIL, PARTIAL, N/A, UNVERIFIED).
3. Vấn đề quan trọng nhất với bằng chứng và mức độ.
4. Các file đã chỉnh nếu được giao triển khai; test run thực tế; ảnh trước/sau nếu có.
5. Release gate và các việc cần làm, nêu rõ owner (dev/ops/business/legal).
6. Nếu chỉ được giao **audit**, mặc định **không tự sửa code hoặc tạo GitHub Issues** khi chưa được yêu cầu; có thể đề xuất backlog.

## Tài liệu tham chiếu

- OWASP ASVS 5: https://asvs.owasp.org/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Luật BV Dữ liệu cá nhân 91/2025/QH15: https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578.htm
- Nghị định 356/2025/NĐ-CP: https://vanban.chinhphu.vn/?classid=0&docid=216387&pageid=27160
- Hướng dẫn thông báo website TMĐT: https://dichvucong.online.gov.vn/Huong-Dan-Sct/QUY-TRINH-THONG-BAO-WEBSITE-TMDT-BAN-HANG-yJkpX0Qpjc
