# Kiến trúc frontend NEXA / CommerceOS

- `*.html`: 31 URL độc lập, mỗi file có nội dung trang HTML và khung dự phòng.
- `assets/css/base/`, `components/`, `pages/`, `themes/`: chia style từ hai file gốc, **giữ đúng thứ tự tải CSS để bảo toàn cascade**. `components/product-images.css` dành cho ảnh.
- `assets/js/data/`: dữ liệu mô phỏng và localStorage (không an toàn cho production).
- `assets/js/utils/`: navigation / toast.
- `assets/js/ui/`: shell và minh họa động.
- `assets/js/pages/`: giao diện từng nhóm nghiệp vụ.
- `assets/js/features/`: slider, dark/light, chatbox, forms, reviews.
- `assets/js/app/`: render, sự kiện và khởi tạo.
- `assets/js/config/`: mapping URL và cấu hình theme ban đầu.
- `assets/images/categories/`: ảnh raster dùng chung cho sản phẩm và danh mục; đổi `image` trong `assets/js/data/catalog.js` để cập nhật ảnh.
- `assets/images/categories/`: hình danh mục.
- `assets/images/illustrations/`: các SVG tách ra từ HTML + hero.

### Kiến trúc hiện tại
Dự án dùng **vanilla JavaScript và các classic script tải theo thứ tự** để giữ nguyên tính tương thích của bản demo trước. Biến/hàm toàn cục được chia file theo nhóm nghiệp vụ, nhưng chưa áp dụng ES modules/import/export hoặc bundler. Đây là cấu trúc chuyển tiếp dễ đọc hơn, không phải kiến trúc production hoàn chỉnh.

### Quy trình mở rộng
1. Tạo file trang mới ở thư mục gốc, sao chép cấu trúc `<head>` và script đã khai báo.
2. Thêm route trong `assets/js/config/routes.js`.
3. Thêm hàm view trong `assets/js/pages/` và đăng ký trong `assets/js/app/app.js`.
4. Thêm CSS vào một file phù hợp theo tính năng, tránh ghi đè trùng lặp.
5. Thêm minh họa vào `assets/images/` và dùng `<img loading="lazy" decoding="async">` khi phù hợp.
6. Cập nhật workbook hướng dẫn bài thực hành và viết test.

### Trước khi có người dùng thật
Chưa có Django API, server-side authentication, Google/Facebook OAuth, gửi email, xử lý webhook VNPay, chống overselling, phân quyền thật, rate limiting, CSP, audit log hay load test. Không dùng dữ liệu/mật khẩu thật. Nội dung thanh toán và đăng nhập hiện chỉ là **demo giao diện**.
