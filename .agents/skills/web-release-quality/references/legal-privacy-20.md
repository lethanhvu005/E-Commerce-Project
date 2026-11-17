# L01–L20 — 20 kiểm tra pháp lý, dữ liệu cá nhân và khả năng tiếp cận

**Cách dùng:** đây là checklist **rủi ro và nghĩa vụ cần xác minh**, không phải 20 điều luật áp dụng đồng loạt cho mọi website. Xác định loại hình (portfolio/demo, blog, marketplace, website TMĐT bán hàng, SaaS), đối tượng, nơi vận hành, người dùng quốc tế, loại dữ liệu, căn cứ xử lý, thời điểm pháp luật. Ghi `LEGAL_REVIEW_REQUIRED` cho chỗ cần luật sư hoặc bộ phận pháp chế. Tại Việt Nam năm 2026 cần đọc Luật BV Dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP, không chỉ Nghị định 13/2023/NĐ-CP.

## Nhóm 1. Văn bản và chính sách

### L01 — Privacy Policy đúng thực tế
- **Triển khai:** trang dễ tìm, mô tả controller/chủ thể, loại dữ liệu, mục đích/căn cứ, thời gian lưu, bên xử lý/đối tác, chuyển dữ liệu, quyền người dùng, kênh liên hệ, ngày cập nhật.
- **Kiểm tra:** so với thực tế database, logs, analytics, OAuth, payment, email, support; link footer và ngay nơi thu thập; không sao chép policy không phù hợp.
- **Điều kiện:** nghĩa vụ công bố thông tin phụ thuộc luật và hoạt động thực tế; phải đánh giá cụ thể.

### L02 — Terms of Service / điều khoản giao dịch
- **Triển khai:** điều khoản rõ chủ thể, phạm vi dịch vụ, đơn hàng/giá/thuế, lỗi đặt hàng, quyền và nghĩa vụ, tranh chấp, nội dung do user tạo, liên hệ.
- **Kiểm tra:** không đưa điều khoản bất công hoặc mâu thuẫn pháp luật bắt buộc; đã được bên kinh doanh/pháp chế duyệt trước công bố.

### L03 — Cookies/tracking notice
- **Triển khai:** kiểm kê cookie/session/tracker và mục đích; nêu ở chính sách privacy/cookie phù hợp. Trang cookie riêng khi cần thiết/giúp minh bạch, không coi luôn là yêu cầu bắt buộc độc lập.
- **Kiểm tra:** trình duyệt sạch, Network/Storage, consent management; cookie thiết yếu vs analytics/ads.

### L04 — Refund, return, cancellation & delivery policy
- **Triển khai:** điều kiện đổi trả/hoàn tiền, thời hạn, phí vận chuyển, hàng ngoại lệ theo luật, quy trình liên hệ, trạng thái refund; với giao dịch online, hiển thị trước checkout khi cần.
- **Kiểm tra:** khớp với API `orders/payments`, chính sách thực tế, luật bảo vệ người tiêu dùng và điều khoản cổng thanh toán.

## Nhóm 2. Bảo vệ dữ liệu cá nhân

### L05 — Data minimization
- **Triển khai:** chỉ yêu cầu trường cần thiết, phân biệt bắt buộc/tùy chọn; tránh thu CCCD, ngày sinh, danh bạ nếu không cần; giới hạn access/retention.
- **Kiểm tra:** form schema, serializer, tables, log, SDK payload, exports; có bảng data inventory.

### L06 — Căn cứ xử lý, consent khi cần
- **Triển khai:** xác định căn cứ xử lý cho từng mục đích; khi cần đồng ý, thiết kế lựa chọn tự nguyện, cụ thể, có thể rút, không pre-check, không ép đồng ý quảng cáo để mua hàng.
- **Kiểm tra:** consent record/time/version và withdrawal, giao diện không dark patterns; **không bắt mọi form phải có checkbox** nếu có căn cứ xử lý khác phù hợp.

### L07 — Thông báo mục đích trước khi thu
- **Triển khai:** giải thích tại form về mục đích, dữ liệu, chia sẻ/cookie/tracker, liên hệ; không thu vượt mục đích hoặc tái sử dụng âm thầm.
- **Kiểm tra:** form đăng ký, checkout, OAuth, upload, newsletter, chat; so sánh policy với API/network.

### L08 — Quyền của chủ thể dữ liệu & xóa dữ liệu
- **Triển khai:** kênh yêu cầu truy cập/sửa/xóa/rút consent; xác minh người yêu cầu, xử lý đúng thời hạn luật, bảo vệ khỏi xóa nhầm và giữ dữ liệu phải lưu theo nghĩa vụ thuế/kế toán/tranh chấp nếu có.
- **Kiểm tra:** có workflow/ticket, status, log, thông báo hạn chế hợp lệ; không xóa đơn hàng/kế toán nếu phải giữ theo luật.

### L09 — Third-party analytics, pixels, SDKs
- **Triển khai:** kiểm kê Google Analytics, Meta Pixel, Hotjar, live chat, CDN, crash tools; kê khai chia sẻ dữ liệu, mục đích, căn cứ, region, retention; chặn non-essential tracking trước khi có consent nếu luật áp dụng yêu cầu.
- **Kiểm tra:** Network tab trong clean profile trước/sau lựa chọn; không coi script chỉ tải khi scroll là đã tuân thủ.

## Nhóm 3. Nội dung, bản quyền, thông tin nhà bán

### L10 — Asset licensing
- **Triển khai:** lưu provenance/licence ảnh, font, SVG, nhạc/video, logo, thương hiệu và ảnh AI; xác minh quyền sử dụng thương mại, model releases khi cần; không suy ra ảnh AI tự do dùng cho mọi mục đích.
- **Kiểm tra:** asset manifest, nguồn và giấy phép; file thiếu license = UNVERIFIED.

### L11 — Review/testimonial trung thực
- **Triển khai:** không giả mạo đánh giá khách hàng đã mua, số sao, số lượng đơn, đánh giá xác thực; gắn nhãn demo/test nếu dùng trên staging; kiểm duyệt hợp pháp và giữ trace.
- **Kiểm tra:** dữ liệu DB nguồn review, verified purchase logic, seed, frontend fallback, rating aggregate; sản phẩm chưa có review không tự hiện 5 sao.

### L12 — Claims có bằng chứng
- **Triển khai:** tránh “số 1”, “tốt nhất”, “chính hãng”, “bảo hành 24 tháng”, “giao 2h”, “giảm 90%” khi chưa có hồ sơ hỗ trợ; hiển thị giá/stock/khuyến mãi thật.
- **Kiểm tra:** grep marketing claims ở frontend, CMS, banners, metadata SEO; business owner xác nhận bằng chứng.

### L13 — Công khai danh tính bên bán / nghĩa vụ TMĐT
- **Triển khai:** xác định cá nhân/doanh nghiệp kinh doanh, thông tin liên hệ, địa chỉ, mã số thuế khi pháp luật áp dụng; kiểm tra thủ tục thông báo website TMĐT bán hàng hoặc đăng ký website cung cấp dịch vụ TMĐT theo mô hình.
- **Kiểm tra:** footer/checkout/contact, trạng thái thông báo/đăng ký tại cổng Bộ Công Thương, business documents; portfolio demo không mặc nhiên có cùng nghĩa vụ với website bán hàng thực.

## Nhóm 4. Accessibility (mục tiêu chất lượng WCAG 2.2 AA)

### L14 — Alt text
- **Triển khai:** ảnh thông tin có `alt` mô tả ý nghĩa, ảnh trang trí `alt=""`; icon-button cần accessible name; ảnh sản phẩm có tên/thuộc tính.
- **Kiểm tra:** DOM tree, axe/WAVE, screen reader spot-check; không nhồi keyword.

### L15 — Color contrast
- **Triển khai:** văn bản phổ thông >= 4.5:1, large text >=3:1 theo WCAG 2.2 AA, non-text UI indicator phù hợp; kiểm cả light/dark/hover/disabled hợp lý.
- **Kiểm tra:** công cụ contrast thực tế trên màn hình; không phán đoán bằng mắt.

### L16 — Keyboard, focus, form controls
- **Triển khai:** tab order hợp lý, focus visible, Escape modal, skip link, label/input association, không keyboard trap.
- **Kiểm tra:** chỉ dùng Tab/Shift+Tab/Enter/Escape; checkout và modal, mobile nav; axe/Playwright a11y.

### L17 — Action labels rõ
- **Triển khai:** nút dùng động từ cụ thể (“Thêm vào giỏ”, “Thanh toán VNPay”, “Đặt hàng”), accessibility name, loading/disabled states; không dùng CTA vô nghĩa nếu ảnh hưởng clarity.
- **Kiểm tra:** kiểm Screen Reader labels và click targets, test trạng thái loading/errors.

## Nhóm 5. Tiền phát hành và phạm vi pháp lý

### L18 — Consent gating / tracking choices
- **Triển khai:** nếu tracker cần consent thì non-essential scripts không chạy trước đồng ý; cho từ chối dễ tương đương chấp nhận; lưu choice, cho đổi lại, phân biệt essential cookies.
- **Kiểm tra:** network sạch ngay lần đầu, Reject/Accept, reload, consent version, browser DNT/global privacy signals khi phù hợp.

### L19 — GDPR, CCPA/CPRA, luật khác theo scope
- **Triển khai:** đánh giá nếu hướng tới/đáp ứng điều kiện pháp luật EU, California hoặc nước khác; không suy ra chỉ cần người nước ngoài truy cập là đương nhiên chịu mọi nghĩa vụ.
- **Kiểm tra:** markets, targeting, volume thresholds, entities, data transfers, contracts, DPO/representative khi bắt buộc; xin legal signoff.

### L20 — Change impact / định kỳ audit
- **Triển khai:** mỗi thay đổi feature/data/third-party/new country đánh giá tác động pháp lý, policy, retention, consent, accessibility, supplier contracts; tracking/versioned approvals.
- **Kiểm tra:** PR checklist, changelog, DPIA/impact assessment nếu áp dụng, policy date; owner rõ ràng.

## Điều cần nhớ cho Việt Nam 2026

- **Luật số 91/2025/QH15** về Bảo vệ dữ liệu cá nhân có hiệu lực **01/01/2026**: https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578.htm
- **Nghị định 356/2025/NĐ-CP** hiệu lực **01/01/2026**: https://vanban.chinhphu.vn/?classid=0&docid=216387&pageid=27160
- **Hướng dẫn thông báo website TMĐT bán hàng**: https://dichvucong.online.gov.vn/Huong-Dan-Sct/QUY-TRINH-THONG-BAO-WEBSITE-TMDT-BAN-HANG-yJkpX0Qpjc
- **WCAG 2.2** (chuẩn kỹ thuật, nghĩa vụ pháp lý tùy hoàn cảnh): https://www.w3.org/TR/WCAG22/

**Không đánh dấu COMPLIANT chỉ từ mã nguồn.** Cần hồ sơ pháp lý, vận hành thật, nhà cung cấp, thông tin doanh nghiệp và chuyên gia duyệt khi thích hợp.
