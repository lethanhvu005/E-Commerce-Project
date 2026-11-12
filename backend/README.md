######                      CÁC BƯỚC XÂY DỰNG DỰ ÁN 
##### BƯỚC 1: XÂY DỰNG VÀ KẾT NỐI DATABASE
## Khởi động theo cấu hình đã định sẵn
docker compose -f commerceos-demo/compose.yaml up -d
docker compose -f commerceos-demo/compose.yaml ps
=>>> nếu mà  thành công hiện healthy
## Tạo database mới, trống
docker compose -f commerceos-demo/compose.yaml exec db createdb -U commerceos commerceos_apps
## Kiểm tra coi thử có bảng chưa:
docker compose -f commerceos-demo/compose.yaml exec db psql -U commerceos -d commerceos_apps -c "\dt"
=>> nếu thành công và db trống , sẽ báo : Did not find any relations.
## Kiểm tra tên database Django thực sự kết nối
.\.venv\Scripts\python.exe backend/manage.py shell -c "from django.db import connection; c = connection.cursor(); c.execute('SELECT current_database()'); print(c.fetchone()[0])"
==>> nếu hiện kết quả :commerceos_apps

$env:POSTGRES_DB = 'commerceos_apps'
.\.venv\Scripts\python.exe backend/manage.py migrate
.\.venv\Scripts\python.exe backend/manage.py createsuperuser
.\.venv\Scripts\python.exe backend/manage.py runserver
```

`createdb` chạy một lần, với tên database chưa tồn tại. Biến môi trường trên chỉ
áp dụng cho terminal hiện tại; khi mở terminal khác phải đặt lại POSTGRES_DB
trước khi chạy Django. Không cần đổi POSTGRES_DB trong Compose để kết nối tới
database được tạo bằng createdb. Mật khẩu tiếp tục đọc từ commerceos-demo/.env.

Admin: http://127.0.0.1:8000/admin/. Chưa triển khai API hay nghiệp vụ checkout.
Sau khi đã dùng database mới, mỗi lần sửa models chạy `makemigrations` rồi `migrate`.
Không chạy schema.sql/seed.sql cũ; thêm dữ liệu qua ORM, Admin hoặc fixture mới.

## Ràng buộc và giới hạn

- CheckConstraint/UniqueConstraint, indexes và validators được khai báo trong models.
- Hai khóa ngoại ghép giữ tính nhất quán ảnh/phiên bản sản phẩm và voucher/chủ đơn
  được thêm bằng migrations RunSQL có reverse SQL vì Django 4.2 không có trường
  ForeignKey ghép tương ứng. Model.clean() cũng kiểm tra hai quan hệ này.
- JSON object, số lượng, giá, tổng tiền, chủ giỏ hàng, trạng thái và tính duy nhất
  được kiểm tra ở PostgreSQL. `save()` không tự gọi `full_clean()` của Django.
- Các quy tắc nhiều bản ghi như tổng các dòng đơn, giới hạn voucher, tổng giữ kho,
  chuyển trạng thái hợp lệ và xử lý đồng thời cần service với transaction/locking.
  Models chưa tự thực hiện các nghiệp vụ này. Đăng ký Admin chưa thay thế service.
- Review.is_verified_buyer tính từ chủ đơn, sản phẩm và trạng thái delivered;
  clean() xác minh liên kết. API/service sau này vẫn phải kiểm tra quyền người gọi.
- UUID mặc định là callable uuid.uuid4. Retry phải dùng lại checkout_key hoặc
  idempotency_key của yêu cầu cũ, không tạo khóa mới cho mỗi lần thử lại.
- updated_at dùng auto_now; QuerySet.update()/bulk_update() cần tự đặt timestamp.

## Kiểm tra

```powershell
.\.venv\Scripts\python.exe backend/manage.py check
.\.venv\Scripts\python.exe backend/manage.py test accounts catalog carts orders inventory promotions payments community wishlists operations
```

Tests tạo database PostgreSQL riêng rồi xóa sau khi chạy, không nạp dữ liệu vào
database ứng dụng. Tài khoản PostgreSQL cần quyền tạo database test.