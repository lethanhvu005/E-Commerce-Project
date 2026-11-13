# Tài liệu API CommerceOS

Tài liệu này mô tả các API đang được khai báo trong source backend hiện tại.

- Base URL khi chạy local: `http://127.0.0.1:8000/api/`
- Dữ liệu gửi và nhận: JSON
- Các URL đều có dấu `/` ở cuối.
- API cần đăng nhập dùng header:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

- Access token có thời hạn 5 phút.
- Refresh token có thời hạn 7 ngày, được xoay vòng khi refresh.
- Các giá trị `Decimal` như giá tiền thường được DRF trả dưới dạng chuỗi, ví dụ `"220000"`.
- Lỗi validate thường trả theo field, ví dụ:

```json
{
  "email": ["Email đã tồn tại."]
}
```

## 1. Xác thực và tài khoản

### `POST /api/auth/register/`

Quyền: công khai, không cần token.

Tạo tài khoản khách hàng mới. Password được hash bằng Django và không xuất hiện trong response. Client không được tự gửi `role`, `is_staff`, `is_superuser`, `groups` hoặc `user_permissions`.

Request:

```json
{
  "email": "buyer@example.com",
  "password": "Strong!Password123",
  "first_name": "An",
  "last_name": "Nguyen"
}
```

Response `201 Created`:

```json
{
  "id": 1,
  "email": "buyer@example.com",
  "first_name": "An",
  "last_name": "Nguyen",
  "phone": "",
  "email_verified_at": null,
  "date_joined": "2026-11-12T...Z"
}
```

Lỗi chính: email trùng, password yếu, password quá giống thông tin tài khoản hoặc cố tự cấp quyền trả `400`.

### `POST /api/auth/login/`

Quyền: công khai. Có giới hạn số lần gọi cho anonymous.

Request:

```json
{
  "email": "buyer@example.com",
  "password": "Strong!Password123"
}
```

Response `200 OK`:

```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>"
}
```

Sai email, password hoặc tài khoản không hoạt động trả `401` với thông báo chung.

### `POST /api/auth/token/refresh/`

Quyền: công khai nhưng phải có refresh token hợp lệ trong body. Không gửi access token.

Request:

```json
{
  "refresh": "<refresh_token>"
}
```

Response `200 OK`:

```json
{
  "access": "<access_token_moi>",
  "refresh": "<refresh_token_moi>"
}
```

Refresh token cũ bị blacklist sau khi xoay vòng. Token sai, hết hạn hoặc đã bị thu hồi trả `401`.

### `POST /api/auth/logout/`

Quyền: cần access token trong header và refresh token của cùng tài khoản trong body.

Request:

```json
{
  "refresh": "<refresh_token>"
}
```

Response: `204 No Content`.

Refresh token của tài khoản khác trả `403`. Token sai hoặc đã thu hồi trả `400`.

### `GET /api/accounts/me/`

Quyền: cần đăng nhập.

Trả hồ sơ của `request.user`:

```json
{
  "id": 1,
  "email": "buyer@example.com",
  "first_name": "An",
  "last_name": "Nguyen",
  "phone": "0900000000",
  "email_verified_at": null,
  "date_joined": "2026-11-12T...Z"
}
```

### `PATCH /api/accounts/me/`

Quyền: cần đăng nhập.

Chỉ cho sửa `first_name`, `last_name`, `phone`.

```json
{
  "first_name": "Anh",
  "phone": "0912345678"
}
```

Trả hồ sơ sau khi sửa. Không cho sửa email, password hoặc quyền qua endpoint này.

### `GET /api/accounts/me/addresses/`

Quyền: cần đăng nhập.

Trả các địa chỉ của tài khoản hiện tại:

```json
{
  "results": [
    {
      "id": 1,
      "recipient": "Nguyen Van An",
      "phone": "0900000000",
      "address": "1 Nguyen Van Linh",
      "ward": "Hai Chau",
      "province": "Da Nang",
      "country_code": "VN",
      "is_default": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### `POST /api/accounts/me/addresses/`

Quyền: cần đăng nhập.

```json
{
  "recipient": "Nguyen Van An",
  "phone": "0900000000",
  "address": "1 Nguyen Van Linh",
  "ward": "Hai Chau",
  "province": "Da Nang",
  "is_default": true
}
```

Trả địa chỉ vừa tạo với status `201`. Nếu đặt làm mặc định, địa chỉ mặc định cũ của user được bỏ mặc định.

### `GET /api/accounts/me/addresses/{id}/`

Quyền: chủ địa chỉ. Trả một địa chỉ. ID của user khác trả `404`.

### `PATCH /api/accounts/me/addresses/{id}/`

Quyền: chủ địa chỉ. Nhận một hoặc nhiều trường giống API tạo địa chỉ và trả địa chỉ sau khi sửa.

### `DELETE /api/accounts/me/addresses/{id}/`

Quyền: chủ địa chỉ. Trả `204 No Content`.

## 2. Catalog sản phẩm

### `GET /api/categories/`

Quyền: công khai. Chỉ trả category active, theo `sort_order`.

```json
{
  "results": [
    {
      "id": 1,
      "name": "Bàn phím",
      "code": "keyboard",
      "slug": "ban-phim",
      "image_key": "images/keyboard.png",
      "sort_order": 1
    }
  ]
}
```

### `GET /api/brands/`

Quyền: công khai. Chỉ trả brand active.

```json
{
  "results": [
    {"id": 1, "name": "NEXA", "slug": "nexa", "logo_key": "images/nexa.png"}
  ]
}
```

### `GET /api/products/`

Quyền: công khai. Chỉ trả sản phẩm active có category và brand active.

Query parameters:

- `search`: tìm theo tên, mô tả ngắn hoặc SKU.
- `category`: slug category.
- `brand`: slug brand.
- `ordering`: `name`, `-name`, `price`, `-price`, `created_at`, `-created_at`.
- `page`: số trang.
- `page_size`: số item, tối đa 50, mặc định 12.

Response có phân trang:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "NEXA X75",
      "slug": "nexa-x75",
      "short_name": "X75",
      "badge": "Mới",
      "summary": "Bàn phím cơ 75%",
      "category": {"id": 1, "name": "Bàn phím", "code": "keyboard", "slug": "ban-phim", "image_key": null, "sort_order": 1},
      "brand": {"id": 1, "name": "NEXA", "slug": "nexa", "logo_key": null},
      "cover_image": null,
      "min_price": "2490000",
      "created_at": "..."
    }
  ]
}
```

### `GET /api/products/{slug}/`

Quyền: công khai. Draft, archived hoặc slug không tồn tại trả `404`.

Trả thông tin của product list và thêm:

- `description`
- `specifications`
- `warranty_months`
- `images`: `id`, `object_key`, `alt_text`, `width`, `height`, `sort_order`, `is_cover`, `variant_id`
- `features`: `id`, `content`, `sort_order`
- `variants`: SKU, option, giá và tồn khả dụng

### `GET /api/products/{slug}/variants/`

Quyền: công khai. Chỉ trả variant active:

```json
{
  "results": [
    {
      "id": 1,
      "sku": "NEXA-X75-BROWN",
      "option_key": "brown",
      "color": "Black",
      "switch_type": "Brown",
      "connection": "Wireless",
      "layout": "75%",
      "price": "2490000",
      "compare_at_price": null,
      "currency": "VND",
      "available": 10
    }
  ]
}
```

### `GET /api/collections/`

Quyền: công khai. Trả collection active, có phân trang:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{"id": 1, "name": "Gaming Gear", "slug": "gaming-gear", "sort_order": 1}]
}
```

### `GET /api/collections/{slug}/products/`

Quyền: công khai. Trả sản phẩm active thuộc collection, dùng cấu trúc phân trang và product giống `/api/products/`.

### `GET /api/home-banners/`

Quyền: công khai. Chỉ trả banner active và đang nằm trong thời gian hiển thị.

```json
{
  "results": [
    {
      "id": 1,
      "title": "NEXA Gear",
      "subtitle": "Thiết kế cho bạn",
      "desktop_image_key": "hero/desktop.webp",
      "mobile_image_key": "hero/mobile.webp",
      "link_path": "/products/",
      "sort_order": 1
    }
  ]
}
```

## 3. Giỏ hàng

Tất cả API giỏ hàng cần đăng nhập. Giỏ được lấy từ `request.user`; client không gửi `user_id`, giá hoặc tổng tiền.

### `GET /api/cart/`

```json
{
  "id": 1,
  "items": [
    {
      "id": 1,
      "variant_id": 4,
      "sku": "NEXA-X75-BROWN",
      "product_name": "NEXA X75",
      "quantity": 2,
      "unit_price": "2490000",
      "line_total": 4980000
    }
  ],
  "subtotal": 4980000,
  "discount_total": 0,
  "total": 4980000,
  "voucher_code": null
}
```

### `POST /api/cart/items/`

```json
{
  "variant_id": 4,
  "quantity": 2
}
```

Thêm variant hoặc cộng quantity nếu đã có. Kiểm tra variant đang bán và tồn khả dụng. Trả toàn bộ giỏ đã tính lại.

### `DELETE /api/cart/items/`

Xóa toàn bộ item trong giỏ. Trả `204 No Content`.

### `PATCH /api/cart/items/{item_id}/`

```json
{"quantity": 3}
```

Chỉ sửa item trong giỏ của user hiện tại. Trả toàn bộ giỏ đã tính lại.

### `DELETE /api/cart/items/{item_id}/`

Xóa một item của giỏ hiện tại và trả giỏ đã tính lại. Item của user khác trả `404`.

## 4. Voucher

### `GET /api/vouchers/`

Quyền: công khai. Chỉ trả voucher active, đã bắt đầu và chưa hết hạn.

```json
{
  "results": [
    {
      "code": "SAVE10",
      "kind": "percent",
      "value": "10",
      "max_discount": "100000",
      "min_subtotal": "500000",
      "starts_at": "...",
      "ends_at": "..."
    }
  ]
}
```

`kind` có thể là `percent`, `fixed` hoặc `free_ship`.

### `POST /api/cart/voucher/`

Quyền: cần đăng nhập.

```json
{"code": "SAVE10"}
```

Trả tổng giỏ sau khi áp voucher:

```json
{
  "subtotal": 1000000,
  "discount_total": 100000,
  "total": 900000,
  "voucher_code": "SAVE10"
}
```

### `DELETE /api/cart/voucher/`

Quyền: cần đăng nhập. Gỡ voucher và trả tổng giỏ đã tính lại.

## 5. Giao hàng, checkout và đơn hàng

### `GET /api/shipping-methods/`

Quyền: công khai. Chỉ trả phương thức active:

```json
{
  "results": [
    {
      "id": 1,
      "code": "standard",
      "name": "Giao tiêu chuẩn",
      "base_fee": "30000",
      "free_threshold": "1000000",
      "min_days": 2,
      "max_days": 4
    }
  ]
}
```

### `POST /api/checkout/preview/`

Quyền: cần đăng nhập. Không tạo order, payment hoặc reservation.

Request có thể dùng `shipping_method_id` hoặc `ship_method`:

```json
{
  "address_id": 1,
  "shipping_method_id": 1
}
```

Response:

```json
{
  "subtotal": 1000000,
  "discount_total": 100000,
  "shipping_fee": 30000,
  "shipping_discount": 0,
  "grand_total": 930000,
  "currency": "VND"
}
```

Mọi giá trị được tính lại từ database. `address_id` phải thuộc user hiện tại.

### `GET /api/orders/`

Quyền: cần đăng nhập. Chỉ trả đơn của user hiện tại.

Query:

- `page`: số trang.
- `status`: lọc trạng thái.

Response phân trang, mỗi order gồm:

- `public_id`, `order_number`, `status`, `currency`
- `subtotal`, `discount_total`, `shipping_fee`, `shipping_discount`, `grand_total`
- `voucher_code_snapshot`, `shipping_method_snapshot`
- `contact_email_snapshot`, `customer_note`
- `created_at`, `updated_at`
- `items`
- `delivery_address`

### `POST /api/orders/`

Quyền: cần đăng nhập. Tạo đơn COD trong transaction.

```json
{
  "address_id": 1,
  "shipping_method_id": 1,
  "checkout_key": "b35f733d-02b6-424d-9972-4f34021bb35f",
  "note": "Giao giờ hành chính"
}
```

Server tự đọc giỏ, giá SKU, voucher, phí ship và tồn kho. API tạo snapshot đơn, order items, reservation tồn, payment COD, lịch sử trạng thái và outbox event.

- Lần đầu tạo thành công: `201 Created` và trả order.
- Gửi lại cùng `checkout_key` và cùng dữ liệu: `200 OK`, trả order cũ.
- Cùng key nhưng dữ liệu khác: `409 Conflict`.
- Giỏ trống, địa chỉ sai hoặc thiếu tồn: `400`.

### `GET /api/orders/{public_id}/`

Quyền: chủ đơn. Trả chi tiết order. UUID của người khác trả `404`.

### `GET /api/orders/{public_id}/history/`

Quyền: chủ đơn.

```json
{
  "results": [
    {
      "from_status": null,
      "to_status": "pending",
      "reason": "Đơn hàng được tạo",
      "created_at": "..."
    }
  ]
}
```

### `POST /api/orders/{public_id}/cancel/`

Quyền: chủ đơn.

```json
{"reason": "Tôi muốn đổi sản phẩm"}
```

Chỉ cho hủy đơn `pending`, `confirmed` hoặc `packing`. API giải phóng reservation, voucher và payment pending rồi trả order có status `cancelled`.

### `GET /api/orders/{public_id}/payments/`

Quyền: chủ đơn.

```json
{
  "results": [
    {
      "public_id": "...",
      "provider": "cod",
      "status": "pending",
      "amount": "930000",
      "currency": "VND",
      "paid_at": null,
      "created_at": "..."
    }
  ]
}
```

## 6. Yêu thích

Tất cả endpoint cần đăng nhập và dùng `request.user`.

### `GET /api/wishlist/`

Trả sản phẩm active trong wishlist:

```json
{
  "results": [
    {
      "product": {"id": 1, "name": "NEXA X75", "slug": "nexa-x75"},
      "created_at": "..."
    }
  ]
}
```

Object `product` đầy đủ giống product list.

### `POST /api/wishlist/`

```json
{"product_id": 1}
```

Trả `201` khi thêm mới hoặc `200` nếu đã tồn tại.

### `DELETE /api/wishlist/{product_id}/`

Xóa sản phẩm khỏi wishlist của user hiện tại. Trả `204`.

## 7. Đánh giá và hỏi đáp

### `GET /api/products/{slug}/reviews/`

Quyền: công khai. Chỉ trả review `published`.

```json
{
  "rating": 4.5,
  "count": 2,
  "results": [
    {
      "id": 1,
      "stars": 5,
      "body": "Sản phẩm dùng rất tốt.",
      "order_item": 10,
      "author": "Nguyen Van An",
      "is_verified_buyer": true,
      "status": "published",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### `POST /api/products/{slug}/reviews/`

Quyền: cần đăng nhập.

```json
{
  "stars": 5,
  "body": "Sản phẩm dùng rất tốt.",
  "order_item": 10
}
```

`order_item` không bắt buộc. Nếu gửi, item phải thuộc đơn delivered của user và đúng sản phẩm. Review mới luôn ở trạng thái `pending`. Mỗi user chỉ có một review trên mỗi product.

### `PATCH /api/reviews/{id}/`

Quyền: tác giả review.

```json
{"stars": 4, "body": "Nội dung đã chỉnh sửa."}
```

Sau khi sửa, review quay lại trạng thái `pending`.

### `DELETE /api/reviews/{id}/`

Quyền: tác giả review. Trả `204`.

### `GET /api/products/{slug}/questions/`

Quyền: công khai. Chỉ trả question `published`:

```json
{
  "results": [
    {"id": 1, "body": "Có bảo hành không?", "author": "Nguyen Van An", "status": "published", "created_at": "..."}
  ]
}
```

### `POST /api/products/{slug}/questions/`

Quyền: cần đăng nhập.

```json
{"body": "Sản phẩm có bảo hành không?"}
```

Trả question mới với status `pending` và status code `201`.

### `GET /api/questions/{id}/answers/`

Quyền: công khai. Parent question phải published. Chỉ trả answer published.

```json
{
  "results": [
    {"id": 1, "body": "Sản phẩm bảo hành 12 tháng.", "author": "Nhân viên", "status": "published", "created_at": "..."}
  ]
}
```

### `POST /api/questions/{id}/answers/`

Quyền: cần đăng nhập và parent question phải published.

```json
{"body": "Cảm ơn bạn đã phản hồi."}
```

Trả answer mới với status `pending` và status code `201`.

## 8. API quản trị kho và audit

Các endpoint dưới đây cần access token, `is_staff=true` và Django permission phù hợp. Superuser có toàn bộ permission.

### `GET /api/admin/inventory/`

Quyền: `inventory.view_inventorybalance`.

```json
{
  "results": [
    {
      "variant_id": 1,
      "sku": "NEXA-X75-BROWN",
      "on_hand": 20,
      "reserved": 2,
      "available": 18,
      "low_stock_threshold": 5,
      "updated_at": "..."
    }
  ]
}
```

### `POST /api/admin/inventory/`

Quyền: `inventory.change_inventorybalance`.

```json
{
  "variant_id": 1,
  "quantity_delta": 10,
  "reason": "Nhập kho tháng 11",
  "event_key": "92cab908-90c1-471c-a72f-f15596213810"
}
```

Tăng hoặc giảm `on_hand` trong transaction. Không cho giảm thấp hơn lượng đang reserved. `event_key` giúp retry không tạo adjustment hai lần.

Response `201` khi tạo mới hoặc `200` khi replay cùng event:

```json
{
  "event_key": "92cab908-90c1-471c-a72f-f15596213810",
  "variant_id": 1,
  "sku": "NEXA-X75-BROWN",
  "kind": "adjustment",
  "quantity_delta": 10,
  "reason": "Nhập kho tháng 11",
  "created_at": "..."
}
```

### `GET /api/admin/inventory/movements/`

Quyền: `inventory.view_inventorymovement`. Trả tối đa 100 movement mới nhất trong `results`.

### `GET /api/admin/audit-logs/`

Quyền: `operations.view_auditlog`. Trả tối đa 100 log mới nhất:

```json
{
  "results": [
    {
      "id": 1,
      "actor_email": "admin@example.com",
      "action": "inventory.adjust",
      "entity_type": "ProductVariant",
      "entity_id": "1",
      "request_id": "...",
      "changes": {"quantity_delta": 10, "reason": "Nhập kho tháng 11"},
      "created_at": "..."
    }
  ]
}
```

### `GET /api/admin/dashboard/`

Quyền: tài khoản phải là staff và có đủ `orders.view_order`, `catalog.view_product`, `inventory.view_inventorybalance`, `accounts.view_user`.

Trả số liệu tổng hợp toàn hệ thống từ database, không suy luận từ một trang kết quả phân trang:

```json
{
  "revenue": "12500000",
  "revenue_definition": "Tổng payment có status=succeeded; không tính pending, cancelled, failed hoặc refunded.",
  "orders_count": 42,
  "products_count": 12,
  "customers_count": 20,
  "low_stock_count": 3,
  "orders_by_status": [{"status": "pending", "count": 2}],
  "recent_orders": []
}
```

## 9. Status code thường gặp

| Status | Ý nghĩa |
| --- | --- |
| `200 OK` | Đọc hoặc cập nhật thành công |
| `201 Created` | Tạo mới thành công |
| `204 No Content` | Xóa hoặc logout thành công, không có response body |
| `400 Bad Request` | Dữ liệu sai, vi phạm nghiệp vụ hoặc validate thất bại |
| `401 Unauthorized` | Thiếu access token, token sai/hết hạn hoặc đăng nhập sai |
| `403 Forbidden` | Đã đăng nhập nhưng không có quyền hoặc token không thuộc user |
| `404 Not Found` | Không tồn tại hoặc tài nguyên không thuộc user hiện tại |
| `405 Method Not Allowed` | Endpoint không hỗ trợ HTTP method đó |
| `409 Conflict` | `checkout_key` đã dùng với payload khác |
| `429 Too Many Requests` | Vượt giới hạn request của endpoint có throttle |

## 10. Chạy và thử API

Từ thư mục `C:\ProjectCV\E-Commece_Project`:

```powershell
docker compose -f commerceos-demo\compose.yaml up -d db
.\.venv\Scripts\python.exe backend\manage.py migrate
.\.venv\Scripts\python.exe backend\manage.py runserver
```

Chạy kiểm tra backend:

```powershell
.\.venv\Scripts\python.exe backend\manage.py test accounts catalog carts promotions orders payments wishlists community inventory operations
```

Khi thử API cần đăng nhập trong Postman:

1. Gọi `POST /api/auth/login/`.
2. Sao chép `access` trong response.
3. Chọn Authorization → Bearer Token.
4. Dán access token rồi gọi endpoint cần đăng nhập.
5. Khi access hết hạn, gửi refresh vào `POST /api/auth/token/refresh/` và lưu cả access lẫn refresh mới.
