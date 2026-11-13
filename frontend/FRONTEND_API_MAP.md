# Đối chiếu frontend React NEXA với frontend_html và backend API

Tài liệu này phản ánh source hiện tại. Dữ liệu nghiệp vụ chỉ lấy từ Django REST API; khi database trống, giao diện hiển thị trạng thái rỗng.

| Trang | Component React | UI gốc | API đang dùng | Trạng thái |
|---|---|---|---|---|
| Trang chủ | `src/pages/HomePage.js` | `frontend_html/E-Commerce/home.html` | `GET /home-banners/`, `/categories/`, `/brands/`, `/collections/`, `/products/` | Đã nối API |
| Danh sách sản phẩm | `src/pages/ProductsPage.js` | `prd.html` | `GET /products/`, `/categories/`, `/brands/` | Đã nối tìm kiếm, lọc, sắp xếp, phân trang |
| Chi tiết sản phẩm | `src/pages/ProductDetailPage.js` | `prd_detail.html` | `GET /products/{slug}/`, `/variants/`, `/reviews/`, `/questions/` | Đã nối API |
| Đăng nhập/đăng ký | `src/pages/AuthPage.js` | `login.html`, `register.html` | `POST /auth/login/`, `/auth/register/` | Đã nối API |
| Hồ sơ/địa chỉ | `src/pages/AccountPage.js` | `profile.html` | `GET/PATCH /accounts/me/`, CRUD `/accounts/me/addresses/` | Đã nối API |
| Giỏ hàng | `src/pages/CartPage.js` | `cart.html` | `GET /cart/`, POST/PATCH/DELETE `/cart/items/`, voucher | Đã nối API |
| Thanh toán | `src/pages/CheckoutPage.js` | `checkout.html` | shipping methods, checkout preview, addresses, `POST /orders/` | Đã nối COD; online payment chưa có API tạo giao dịch |
| Đơn hàng | `OrdersPage`, `OrderDetailPage`, `OrderSuccessPage` | `orders.html`, `success.html` | danh sách, chi tiết, history, cancel, payments | Đã nối API |
| Theo dõi đơn | `TrackingPage` | `tracking.html` | chi tiết và history đơn | Cần đăng nhập/chủ đơn theo quyền backend |
| Wishlist | `WishlistPage` | `wishlist.html` | GET/POST/DELETE `/wishlist/` | Đã nối API |
| Voucher | `VouchersPage` | `vouchers.html` | `GET /vouchers/` | Đã nối API |
| Đánh giá/cộng đồng | `ReviewsPage`, phần community trong Product Detail | `reviews.html` | reviews, questions, answers | Đã nối API trong phạm vi backend |
| Admin tổng quan | `AdminDashboardPage` | `admin_dashboard.html` | products, inventory, orders, audit logs | Không giả số liệu; backend quyết định quyền |
| Admin kho | `AdminInventoryPage` | `admin_inventory.html` | admin inventory và movements | Đã nối API |
| Trang nội dung | `InfoPages.js` | about/contact/faq/shipping/privacy | Không có endpoint nội dung CMS | Nội dung trình bày cố định |

## API còn thiếu để hoàn thiện toàn bộ màn hình admin gốc

- CRUD sản phẩm, thương hiệu, danh mục, bộ sưu tập, banner và ảnh sản phẩm cho admin.
- Danh sách/quản trị toàn bộ đơn hàng cho nhân viên (API `/orders/` hiện chỉ trả đơn của `request.user`).
- Quản trị khách hàng.
- CRUD chương trình khuyến mãi/voucher.
- Duyệt và quản trị review, question, answer.
- Quản trị ticket hỗ trợ và nội dung FAQ/contact.
- API analytics/doanh thu thực tế.
- API cài đặt cửa hàng.
- Trường quyền như `is_staff` hoặc danh sách permission trong `/accounts/me/` để frontend có thể ẩn menu admin trước khi gọi API. Hiện backend vẫn chặn đúng bằng `403`.
- API tạo/xác nhận thanh toán online. Backend hiện chỉ có đọc payment của đơn và luồng COD.

Các màn hình phụ thuộc những API trên không được giả lập bằng dữ liệu cứng trong React.
