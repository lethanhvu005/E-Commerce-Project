##| Bước | Công việc | Kết quả cần đạt |
|---|---|---|
| **1. Chuẩn bị database mới** | Tạo PostgreSQL database trống, cấu hình Django kết nối, chạy migrations mới. Giữ database cũ để đối chiếu. | Các bảng của 10 app được tạo, không lỗi migrations. |
| **2. Kiểm tra Django Admin** | Tạo superuser, đăng nhập `/admin/`, kiểm tra các nhóm models. | Đăng nhập bằng email và xem được các bảng. |
| **3. Nhập dữ liệu ban đầu** | Thêm danh mục → thương hiệu → sản phẩm → phiên bản → tồn kho; thêm phương thức giao hàng. | Có vài sản phẩm đầy đủ thông tin để thử chức năng. |
| **4. Thiết lập nền tảng API** | Cài và cấu hình Django REST Framework, URL `/api/`, phân trang, xử lý lỗi; cấu hình CORS nếu React chạy khác origin. | Django trả được JSON cho frontend. |
| **5. API sản phẩm** | Viết serializers, views, URLs cho danh mục, thương hiệu, danh sách và chi tiết sản phẩm; thêm tìm kiếm, lọc, sắp xếp. | Gọi API bằng Postman và nhận đúng dữ liệu. |
| **6. Khởi tạo React** | Tạo frontend, cấu hình router, layout, CSS và ảnh dựa trên `C:\ProjectCV\E-Commerce`. | React hiển thị được khung giao diện mẫu. |
| **7. Kết nối giao diện sản phẩm** | Viết hàm gọi API; làm trang chủ, danh sách và chi tiết sản phẩm; xử lý loading, lỗi và danh sách trống. | React hiển thị sản phẩm lấy từ PostgreSQL qua Django. |
| **8. Tài khoản và phân quyền** | Chọn cơ chế xác thực; làm đăng ký, đăng nhập, đăng xuất, hồ sơ và địa chỉ. Kiểm tra quyền ở backend. | Người dùng chỉ xem và sửa dữ liệu của mình. |
| **9. Giỏ hàng** | Làm API và giao diện thêm, sửa số lượng, xóa sản phẩm, xem giỏ. Bắt đầu với người dùng đã đăng nhập. | Giỏ hàng được lưu trong database và lấy giá từ backend. |
| **10. Voucher và phí giao hàng** | Kiểm tra thời hạn, điều kiện, lượt sử dụng voucher; tính phí vận chuyển và tổng tiền dự kiến. | Backend tính đúng tổng tiền trước đặt hàng. |
| **11. Đặt hàng và tồn kho** | Viết service checkout trong transaction: kiểm tra giỏ, tính lại tiền, tạo đơn và snapshot, giữ tồn kho; xử lý yêu cầu gửi lặp. | Đặt hàng không tạo đơn trùng hoặc bán vượt tồn. |
| **12. Thanh toán và vòng đời đơn** | Làm COD trước; xử lý xác nhận, giao, hoàn tất, hủy và hết hạn đơn; cập nhật tồn kho tương ứng. | Đơn hàng chuyển trạng thái đúng và lưu lịch sử. |
| **13. Giao diện quản lý đơn** | Làm thanh toán, đặt hàng thành công, danh sách và theo dõi đơn. | Khách đặt hàng và xem tiến trình đơn của mình. |
| **14. Chức năng bổ sung** | Wishlist, đánh giá, hỏi đáp, banner, bộ sưu tập; bổ sung giỏ khách nếu cần. | Các trang tương ứng của giao diện mẫu hoạt động với API. |
| **15. Quản trị React** | Làm dashboard, sản phẩm, kho, đơn hàng, khách hàng, khuyến mãi và kiểm duyệt. | Nhân viên thao tác theo quyền; backend vẫn kiểm tra quyền. |
| **16. Kiểm thử và triển khai** | Kiểm thử toàn bộ luồng mua hàng, phân quyền và đặt hàng đồng thời; cấu hình môi trường triển khai, HTTPS, static/media và backup. | Chạy được luồng mua hàng hoàn chỉnh trên môi trường triển khai. |