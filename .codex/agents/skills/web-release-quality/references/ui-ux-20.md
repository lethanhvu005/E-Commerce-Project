# U01–U20 — 20 dấu hiệu UI/UX rập khuôn cần chủ động tránh

Đây là **design heuristics**, không phải lệnh cấm màu tím/font Inter/3 cột. Không có căn cứ xác minh cho các số liệu “120 trang / 63% / 60% / từ 6 dấu hiệu = biết AI làm” trong video. Hãy đánh giá mỗi điểm bằng mức độ **generic + không phục vụ mục đích + không đúng thương hiệu**, không tự cộng điểm rồi kết luận khoa học.

## Trước khi thiết kế

Viết *design brief* 1 trang: người dùng mục tiêu, 3–5 tính từ thương hiệu, hành vi quan trọng, sản phẩm thật, hình ảnh hợp lệ, 3 ràng buộc chức năng, 2 định hướng layout khác nhau, typography/color/spacing/shape/motion tokens. Ưu tiên giọng nói và nhu cầu cụ thể, không lấy bất kỳ template AI nào làm mục tiêu mặc định.

## Nhóm 1. Bố cục sao y

### U01 — Hero căn giữa khổng lồ + mô tả + 2 CTA
- **Tránh:** lặp cấu trúc landing page chung trên mọi trang, lấn át sản phẩm và hành động chính.
- **Thay bằng:** hero theo mục tiêu (category discovery, best-selling products, campaign, contextual navigation), bố cục bất đối xứng hoặc editorial nếu có lý do. Giữ hierarchy rõ và responsive.

### U02 — Badge viên thuốc ngay trên hero
- **Tránh:** thêm “Mới”, “AI”, “Premium” trang trí mà không có thông tin mới.
- **Thay bằng:** status thực, offer có hạn, dữ liệu từ backend hoặc bỏ; badge phải có ngữ nghĩa.

### U03 — Một từ trong headline được tô màu khác
- **Tránh:** nhấn một từ ngẫu nhiên như một mẹo tạo ấn tượng, lặp khắp site.
- **Thay bằng:** typographic rhythm, text size/weight, ảnh, vị trí và khoảng trắng có ý đồ; chỉ accent khi có brand system.

### U04 — Đúng ba feature cards giống nhau
- **Tránh:** tạo 3 cột/icon/description cho mọi landing page bất kể nội dung.
- **Thay bằng:** chọn số nhóm từ thông tin thật; có thể là comparison table, sticky section, gallery, stepper, list, evidence/data và FAQ. 3 cards được phép nếu đúng 3 lựa chọn thực.

## Nhóm 2. Màu và chữ mặc định

### U05 — Violet theo mặc định
- **Tránh:** chọn tím vì template quen, không phải định vị thương hiệu.
- **Thay bằng:** palette có lý do sản phẩm/ngành, quy tắc secondary/semantic, màu accessibility. Tím vẫn hợp lệ nếu có chiến lược.

### U06 — Gradient tím → xanh khắp headline
- **Tránh:** dùng gradient như phong cách mặc định, gây giảm tương phản.
- **Thay bằng:** accent tiết chế, typography, hình ảnh thương hiệu, nền tảng tương phản; chỉ dùng gradient nơi có ý đồ và đạt WCAG.

### U07 — Bộ màu mặc định chỉ đổi nút
- **Tránh:** CSS variables rời rạc, card/header/footer/feedback thiếu đồng bộ.
- **Thay bằng:** design tokens có state và cả light/dark; kiểm chromatic rhythm và consistency.

### U08 — Font Inter mặc định toàn site
- **Tránh:** không xem xét tính cách, ngôn ngữ tiếng Việt và chiều dài nhãn.
- **Thay bằng:** typography system có font body/display, font fallback, scale, line-height, tải font hợp pháp. Inter được phép nếu chủ động chọn và phù hợp.

## Nhóm 3. Cards, buttons, icon

### U09 — Border radius quá nhiều
- **Tránh:** mọi control, card, dialog tròn như nhau bất kể vai trò.
- **Thay bằng:** radius scale có chủ đích, thể hiện hierarchy; tránh bo góc cản layout/overflow.

### U10 — Mọi button dạng pill
- **Tránh:** primary/secondary/destructive và filter tags không phân biệt.
- **Thay bằng:** button language nhất quán, trọng lượng, outline, states theo interaction; pill hợp lệ khi có mục đích.

### U11 — Glassmorphism phủ khắp
- **Tránh:** blur/backdrop gây giảm contrast, performance và legibility.
- **Thay bằng:** vật liệu giao diện rõ ràng, phân lớp bằng elevation/spacing/border/background; dùng kính chỉ một số surface.

### U12 — Icon mặc định, lặp tia sét/ngôi sao
- **Tránh:** không phù hợp ngữ nghĩa, mọi card chung icon set mà thiếu hierarchy.
- **Thay bằng:** icon family nhất quán có role rõ, custom icon khi thiết thực; text label không phụ thuộc icon.

## Nhóm 4. Chuyển động thiếu mục đích

### U13 — Reveal on scroll giống nhau khắp site
- **Tránh:** mọi khối fade-up gây mệt, lag, che nội dung/SEO.
- **Thay bằng:** motion có chức năng (transition context, skeleton, status feedback); tôn trọng prefers-reduced-motion.

### U14 — Hover nhấc mọi card
- **Tránh:** card không tương tác cũng nâng lên đổ bóng, gây hiểu sai clickability.
- **Thay bằng:** chỉ hover/focus khi actionable; keyboard focus tương đương và pointer affordance thật.

### U15 — KPI counter 0 → N
- **Tránh:** animation số vô căn cứ, có thể làm sai ngữ nghĩa/ảnh hưởng accessibility.
- **Thay bằng:** hiển thị số liệu đã xác minh trực tiếp, xu hướng rõ ràng; motion tiết chế và có thể bỏ.

### U16 — Nền đen neon glow sau hero
- **Tránh:** aesthetic mặc định lấn át nội dung, gây khó đọc.
- **Thay bằng:** nền theo sản phẩm, chất liệu/ảnh/editorial, ánh sáng có chủ đích, kiểm readability và performance.

## Nhóm 5. Nội dung và brand identity

### U17 — Kicker uppercase tracking rộng ở mọi section
- **Tránh:** `eyebrow` lặp lại không truyền tải thông tin, tạo nhiễu.
- **Thay bằng:** heading hierarchy có tác vụ, section label khi cần định vị người dùng; text bình thường khi phù hợp.

### U18 — Copy sáo rỗng
- **Tránh:** “Nâng tầm trải nghiệm”, “Mở khóa sức mạnh”, “Định nghĩa lại tương lai” nếu không có lợi ích cụ thể.
- **Thay bằng:** mô tả sản phẩm thật: SKU, đặc tính, chính sách thật, mức giá, shipping, returns, use case; diễn đạt ngắn và có thể xác minh.

### U19 — Footer trống, thiếu tin cậy
- **Tránh:** footer chỉ logo/social fake, thiếu liên hệ và nội dung chính sách cần thiết.
- **Thay bằng:** contact thật, thông tin doanh nghiệp áp dụng, chính sách liên quan, hỗ trợ/FAQ, payment/delivery info đã xác minh, links không 404.

### U20 — Thử nghiệm nhận diện thương hiệu tổng thể
- **Tránh:** kết luận “AI-made” chỉ bằng đếm 6 dấu hiệu; nhận xét cảm tính không dẫn tới fix.
- **Thay bằng:** thực hiện **5-second test** về thông điệp, task test mua hàng, đánh giá distinctiveness so với 3 đối thủ thực, responsive/keyboard/a11y; đưa ra 3 dấu ấn riêng và đo trước/sau.

## Definition of Done UI/UX

- Có brand brief và design tokens, có lý do chọn màu/chữ/bố cục.
- Trang chính ít nhất 1 yếu tố nhận diện riêng **có giá trị cho người dùng**, không chỉ trang trí.
- Trạng thái empty/loading/error/disabled, mobile menu, focus, skeleton, pagination, keyboard và reduced motion được kiểm tra.
- Ảnh/lời hứa/giá/review/stock lấy từ nguồn đáng tin cậy; không dùng text/score fake trong production.
- Các thay đổi so với thiết kế cũ có screenshot mobile+desktop và ghi lại rủi ro/khả năng cải thiện, không chỉ “đã đẹp”.
