# Admin React UI parity

Ngày kiểm tra: 2026-11-13

## Nguồn đối chiếu

- `frontend_html/E-Commerce/admin_*.html`
- `frontend_html/E-Commerce/assets/css/pages/admin.css`
- `frontend_html/E-Commerce/assets/css/themes/admin-dark.css`

## Kết quả hiện tại

| Trang | Route | Trạng thái UI | API |
|---|---|---|---|
| Tổng quan | `/admin/dashboard` | Đã dùng đúng Admin layout, KPI, hai panel biểu đồ, đơn gần đây và tồn thấp | `/api/admin/dashboard/`, `/api/admin/inventory/` |
| Sản phẩm | `/admin/products` | Đã có cấu trúc intro, toolbar và bảng gốc | Backend chưa có Admin CRUD API |
| Đơn hàng | `/admin/orders` | Đã có cấu trúc intro, toolbar và bảng gốc | Backend chưa có API danh sách toàn hệ thống |
| Tồn kho | `/admin/inventory` | Đã chuyển vào Admin layout, giữ thao tác điều chỉnh kho | 4 API inventory/audit hiện có |
| Báo cáo | `/admin/analytics` | Đã có KPI và panel biểu đồ, không tạo số liệu giả | Backend chưa có chuỗi analytics |
| Khách hàng | `/admin/customers` | Đã có cấu trúc bảng gốc | Backend chưa có Admin customer API |
| Ưu đãi | `/admin/promotions` | Đã có cấu trúc bảng gốc | Backend chưa có Admin promotion API |
| Đánh giá | `/admin/reviews` | Đã có cấu trúc bảng gốc | Backend chưa có moderation API |
| Hỗ trợ | `/admin/support` | Đã có cấu trúc bảng gốc | Backend chưa có support queue API |
| Cài đặt | `/admin/settings` | Đã có cấu trúc bảng gốc | Backend chưa có system settings API |

## Kiểm tra

- React build: đạt, còn các cảnh báo hook đã tồn tại ở nhiều trang.
- React test: 1 suite, 1 test đạt.
- Playwright Admin desktop 1440×900: đạt; ảnh `docs/audit/admin-dashboard-react.png`.
- Playwright mobile 390×844: sidebar off-canvas mở được; ảnh `docs/audit/admin-dashboard-mobile.png`.

Không tuyên bố pixel-perfect: Dashboard và layout chính đã bám HTML/CSS gốc; Inventory và tám trang chưa có API cần tiếp tục tinh chỉnh sau khi backend cung cấp dữ liệu tương ứng.
