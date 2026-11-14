# Đặc Tả Giao Diện Lập Trình Ứng Dụng (REST API Contracts & RBAC Matrix) - Issue #29

Tài liệu quy chuẩn toàn bộ hợp đồng API (Request / Response / Status Codes) và ma trận phân quyền theo vai trò (Role-Based Access Control) của hệ thống NEXA / CommerceOS.

---

## 1. Chuẩn Quy Ước API (Conventions)

- **Giao thức**: HTTPS / RESTful JSON.
- **Tiêu đề Xác thực**: `Authorization: Bearer <access_token>` (SimpleJWT, hạn 5 phút).
- **Mã phản hồi chuẩn**:
  - `200 OK`: Truy vấn hoặc xử lý thành công.
  - `201 Created`: Tạo mới tài nguyên thành công.
  - `204 No Content`: Thao tác thành công, không trả nội dung body (VD: Logout).
  - `400 Bad Request`: Dữ liệu gửi lên vi phạm validation hoặc ràng buộc kiểm tra. Định dạng: `{"<field>": ["<thông báo lỗi>"]}` hoặc `{"detail": "..."}`.
  - `401 Unauthorized`: Token không hợp lệ, hết hạn, hoặc tài khoản đã bị khóa.
  - `403 Forbidden`: Người dùng đã đăng nhập nhưng không đủ quyền theo ma trận RBAC.
  - `404 Not Found`: Không tìm thấy tài nguyên tương ứng với id / slug.
  - `409 Conflict`: Xung đột trạng thái tài nguyên (VD: retry sự kiện outbox không ở trạng thái `failed`, hoặc đơn đã được thanh toán).

---

## 2. Ma Trận Phân Quyền Theo Vai Trò (Role Permission Matrix)

| Nhóm chức năng | Endpoint | Anonymous (Khách vãng lai) | Customer (Khách hàng) | Staff CSR (Chăm sóc KH) | Staff Warehouse (Kho vận) | Superuser (Quản trị tối cao) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Catalog** | `GET /api/products/` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Giỏ hàng** | `GET/POST /api/cart/` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Đơn hàng cá nhân** | `GET/POST /api/orders/` | ❌ | ✅ (Chỉ xem đơn của mình) | ✅ | ✅ | ✅ |
| **Admin Dashboard** | `GET /api/admin/dashboard/` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Admin Analytics** | `GET /api/admin/analytics/` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Admin Quản lý Đơn** | `GET /api/admin/orders/` | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Admin Đổi trạng thái Đơn** | `POST /api/admin/orders/<id>/status/` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Admin Xác nhận thu COD** | `POST /api/admin/orders/<id>/confirm-payment/` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Admin Tồn kho** | `GET /api/admin/inventory/` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Admin Điều chỉnh Tồn kho** | `POST /api/admin/inventory/` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Admin Khách hàng** | `GET /api/admin/customers/` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Admin Khóa tài khoản** | `POST /api/admin/customers/<id>/status/` | ❌ | ❌ | ❌ | ❌ | ✅ (Chỉ superuser khóa staff) |
| **Admin Ưu đãi / Voucher** | `GET/POST /api/admin/promotions/` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Admin Kiểm duyệt Đánh giá**| `POST /api/admin/moderation/reviews/<id>/` | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Admin Trả lời câu hỏi** | `POST /api/admin/questions/<id>/reply/` | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Admin Sự kiện Outbox** | `GET/POST /api/admin/outbox-events/` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Đặc Tả Chi Tiết Các Endpoint Trọng Yếu

### 3.1. Báo Cáo Phân Tích Kế Toán
- **Endpoint**: `GET /api/admin/analytics/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- **Quyền hạn**: `orders.view_order`, `payments.view_payment`, `accounts.view_user`
- **Response `200 OK`**:
  ```json
  {
    "timezone": "Asia/Ho_Chi_Minh",
    "revenue": 1500000,
    "paid_revenue": 1500000,
    "gross_order_value": 3200000,
    "refund_amount": 200000,
    "net_revenue": 1500000,
    "settled_gross": 1700000,
    "orders_count": 3,
    "avg_order_value": 1066667,
    "customers_count": 10,
    "daily_series": [
      {
        "day": "2026-11-14",
        "orders": 2,
        "gross_order_value": 2200000,
        "paid_revenue": 1500000,
        "refund_amount": 200000,
        "net_revenue": 1500000,
        "revenue": 1500000
      }
    ],
    "metric_definitions": {
      "paid_revenue": "Tổng Payment status=succeeded trong khoảng lọc theo paid_at (VN).",
      "gross_order_value": "Tổng grand_total đơn hợp lệ tạo trong khoảng lọc (kể cả COD chờ thu)."
    }
  }
  ```

### 3.2. Quản Trị Voucher / Khuyến Mãi
- **Endpoint**: `POST /api/admin/promotions/`
- **Quyền hạn**: `promotions.add_voucher`
- **Request Body**:
  ```json
  {
    "code": "NEXA50K",
    "kind": "fixed",
    "value": 50000,
    "max_discount": null,
    "min_subtotal": 300000,
    "usage_limit": 100,
    "per_user_limit": 1,
    "starts_at": "2026-11-14T00:00:00+07:00",
    "ends_at": "2026-12-31T23:59:59+07:00",
    "is_active": true
  }
  ```
- **Response `201 Created`**: Trả về chi tiết voucher kèm `used_count: 0`.

### 3.3. Khóa & Mở Khóa Tài Khoản Khách Hàng
- **Endpoint**: `POST /api/admin/customers/<user_id>/status/`
- **Quyền hạn**: `accounts.change_user`
- **Request Body**:
  ```json
  {
    "is_active": false,
    "reason": "Phát hiện dấu hiệu đặt hàng ảo số lượng lớn"
  }
  ```
- **Ràng buộc nghiệp vụ**:
  - Tự khóa chính mình: `400 Bad Request` ("Không thể tự khóa tài khoản của chính bạn.").
  - Nhân viên khóa Staff/Superuser khác: `403 Forbidden` ("Chỉ superuser mới được khóa/mở tài khoản nhân viên hoặc quản trị.").
  - Khóa tài khoản Superuser: `403 Forbidden` ("Không được khóa tài khoản superuser qua API này.").
  - Khóa tài khoản không có lý do: `400 Bad Request` ("Vui lòng nhập lý do khóa tài khoản.").
  - Cố tình gửi các trường khác (`is_staff`, `password`): `400 Bad Request`.
- **Response `200 OK`**:
  ```json
  {
    "id": 15,
    "is_active": false,
    "revoked_refresh_tokens": 3
  }
  ```

### 3.4. Kiểm Duyệt Nội Dung & Phản Hồi Chính Thức
- **Endpoint kiểm duyệt**: `POST /api/admin/moderation/<reviews|questions|answers>/<object_id>/`
  - Body: `{"status": "published|rejected", "reason": "Lý do từ chối"}`
  - Ràng buộc: `rejected` bắt buộc phải kèm `reason`.
- **Endpoint trả lời**: `POST /api/admin/questions/<question_id>/reply/`
  - Body: `{"body": "Nội dung trả lời từ 5 đến 2000 ký tự"}`
  - Phản hồi tự động gắn cờ `is_staff_answer: true` và chuyển `status: "published"`.

---

## 4. Đặc Tả Sự Kiện Outbox (Outbox Event Topics & Payloads)

| Topic | Aggregate Type | Payload Schema | Thời điểm phát sinh |
| :--- | :--- | :--- | :--- |
| `order.created` | `Order` | `{"order_id": 1, "order_number": "NX-1001", "grand_total": 4500000, "customer_id": 10}` | Đơn hàng được tạo thành công trong `create_order()` |
| `order.status_changed` | `Order` | `{"order_id": 1, "from_status": "pending", "to_status": "confirmed", "actor_id": 2}` | Nhân viên chuyển trạng thái đơn hàng |
| `payment.succeeded` | `Payment` | `{"payment_id": 5, "order_id": 1, "amount": 4500000, "provider": "cod"}` | Xác nhận thanh toán thành công (COD/online) |
| `inventory.adjusted` | `InventoryBalance` | `{"variant_id": 8, "sku": "NX-X75", "delta": 15, "reason": "Nhập thêm hàng"}` | Quản trị viên điều chỉnh kho thủ công |
