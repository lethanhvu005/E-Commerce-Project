# Checklist QA — CommerceOS Multi-page Demo

**Hướng dẫn:** Chạy từ Live Server/HTTP server để các file có chung origin. Kiểm tra trên Chrome/Edge/Firefox; Chrome device emulation 320×568, 390×844, 768×1024, 1440×900.

- [ ] Mở `home.html`, kiểm tra 3 slide sản phẩm, tên/ảnh/giá/link thay đổi đồng bộ; chấm chọn slide, phím trái/phải và vuốt ngang. Tự chuyển mỗi 5 giây, quay vòng sau slide cuối, kể cả khi chuột nằm trên slider hoặc vừa bấm vào vùng trống. Focus bằng bàn phím/tab ẩn tạm dừng. Nút dừng/phát hoạt động; reduced motion mặc định dừng tự chạy và tắt animation. Các lớp hình trượt vào bằng JavaScript khi chuyển slide.
- [ ] Chuyển dark → light → tải lại → mở `cart.html` và `admin_dashboard.html`: chế độ vẫn được giữ.
- [ ] Mở menu mobile, nhấn liên kết, không tràn ngang ở 320/390px.
- [ ] Mở `prd.html`, lọc danh mục/giá/brand, sắp xếp, tìm kiếm; mở `prd_detail.html?id=1`.
- [ ] Thêm vào giỏ, reload, chuyển trang; giỏ vẫn đúng; thử thêm vượt tồn kho demo.
- [ ] Mở `vouchers.html`, thử lần lượt NEXA10/NEXA5/FREESHIP và kiểm tra total ở giỏ hàng.
- [ ] COD: điền form bằng thông tin GIẢ, đặt hàng, thấy trang thành công và orders/tracking.
- [ ] VNPay: chọn VNPay demo ở checkout, thấy `payment.html`, chọn thành công/hủy, kiểm tra trạng thái đơn.
- [ ] Reviews: gửi 1–5 sao, refresh `reviews.html`, bình luận đúng product, không chèn được `<script>`/HTML từ input.
- [ ] Product detail: gửi bình luận Q&A, refresh trang, vẫn có bản ghi demo trên máy.
- [ ] Login/Register: email không hợp lệ và password ngắn báo lỗi; Google/Facebook phải báo chưa cấu hình, không được nhận như đăng nhập thật.
- [ ] Contact: browser mở email client; không có mail bị gửi ngầm; KHÔNG dùng địa chỉ thật để thử.
- [ ] Chatbot: mở/đóng, gợi ý, phản hồi voucher/ship/VNPay/tracking, input dài cắt 250 ký tự.
- [ ] Admin: sản phẩm/tồn kho/đơn hàng demo, menu trên mobile, responsive bảng ngang.
- [ ] DevTools Console không có JS errors; Network không có 404 cho JS/CSS.
- [ ] Kiểm tra tab key, Enter, focus-visible, zoom 200%, nhãn input và tương phản.

## QA phải có khi nối backend thật (chưa triển khai)

- [ ] Xác thực quyền truy cập từng object, không truy cập đơn của người khác.
- [ ] Thử 100–500 phiên concurrent theo tài nguyên triển khai thực tế, đo lỗi và p95; không hứa khả năng chịu tải khi chưa benchmark.
- [ ] Đồng thời mua SKU chỉ còn 1 sản phẩm: chỉ một thanh toán/đơn giữ hàng thành công.
- [ ] Verify chữ ký/IPN của VNPay/MoMo; gửi webhook trùng liên tục mà không cộng doanh thu/giảm tồn hai lần.
- [ ] Không lưu secrets/token vào client hoặc source public; dùng HTTPS/HSTS/CSP.
- [ ] Email có queue retry, chống gửi trùng, giám sát bounce/rate-limit.
- [ ] Tìm kiếm và quản trị có pagination / SQL indexes; tải ảnh CDN ở định dạng phù hợp.
- [ ] Sao lưu/khôi phục dữ liệu, log audit, lỗi backend, giám sát và rollback production.
