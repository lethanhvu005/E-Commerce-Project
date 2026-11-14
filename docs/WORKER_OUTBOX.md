# Hướng Dẫn Vận Hành & Triển Khai Outbox Dispatcher Worker (#22)

Tài liệu hướng dẫn triển khai tiến trình worker xử lý hàng đợi sự kiện giao dịch tin cậy (**Transactional Outbox Pattern**) cho hệ thống NEXA / CommerceOS.

---

## 1. Nguyên lý Hoạt động & Kiến trúc

- **Mô hình Transactional Outbox**: Khi các giao dịch nghiệp vụ (đặt hàng, thanh toán, điều chỉnh tồn kho) diễn ra, bản ghi `OutboxEvent` được ghi vào PostgreSQL trong cùng một `transaction.atomic()`.
- **Worker bất đối xứng**: Lệnh quản trị `python manage.py dispatch_outbox` chạy liên tục (daemon) hoặc từng đợt (cron), trích xuất các sự kiện sẵn sàng (`status='pending'` và `available_at <= now()`).
- **Khóa hàng an toàn**: Sử dụng `select_for_update(skip_locked=True)` cho phép nhiều instance worker chạy song song mà không tranh chấp hoặc khóa chéo (deadlock).
- **Chống trùng lặp (Idempotency)**: Bảng `operations_outboxdeliveryreceipt` lưu lại bản ghi nhận hàng với khóa `event_key` duy nhất (`UUID`). Nếu sự kiện đã được xác nhận gửi, worker tự động bỏ qua.
- **Thử lại với lũy thừa (Exponential Backoff)**:
  - Lần 1: 30s
  - Lần 2: 60s
  - Lần 3: 120s
  - Lần 4: 240s
  - Vượt quá `MAX_ATTEMPTS = 5`: Chuyển sang trạng thái `failed` (Dead-Letter) để kiểm tra thủ công.
- **Phục hồi khóa treo (Stale Lock Recovery)**: Các sự kiện bị treo ở `processing` quá 300 giây (do worker crash đột ngột) sẽ được hoàn về `pending` để điều phối lại.

---

## 2. Lệnh Quản trị (CLI)

```bash
# Chạy worker liên tục dạng daemon (chu kỳ thăm dò mặc định 2.0s, xử lý tối đa 50 sự kiện/lô)
python backend/manage.py dispatch_outbox --poll-interval 2.0 --batch-size 50

# Chạy một lần (phù hợp với cron job hoặc kiểm thử CI/CD)
python backend/manage.py dispatch_outbox --once --batch-size 100
```

---

## 3. Cấu hình Dịch vụ (Production)

### Cách 1: Systemd Service (Khuyến nghị cho máy chủ Linux / VPS)

Tạo file dịch vụ tại `/etc/systemd/system/nexa-outbox-worker.service`:

```ini
[Unit]
Description=NEXA Outbox Dispatcher Worker Service
After=network.target postgresql.service redis.service
Wants=postgresql.service

[Service]
Type=simple
User=nexa
Group=nexa
WorkingDirectory=/var/www/nexa/backend
EnvironmentFile=/var/www/nexa/backend/.env
ExecStart=/var/www/nexa/.venv/bin/python manage.py dispatch_outbox --poll-interval 2.0 --batch-size 50
Restart=always
RestartSec=5s
KillMode=process
StandardOutput=journal
StandardError=journal
SyslogIdentifier=nexa-outbox

# Giới hạn tài nguyên bảo vệ hệ thống
LimitNOFILE=65535
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```

Kích hoạt và khởi động:
```bash
sudo systemctl daemon-reload
sudo systemctl enable nexa-outbox-worker
sudo systemctl start nexa-outbox-worker
sudo systemctl status nexa-outbox-worker
```

### Cách 2: Supervisor (CentOS / Debian / Ubuntu cũ)

Tạo file `/etc/supervisor/conf.d/nexa-outbox.conf`:

```ini
[program:nexa-outbox]
command=/var/www/nexa/.venv/bin/python manage.py dispatch_outbox --poll-interval 2.0 --batch-size 50
directory=/var/www/nexa/backend
user=nexa
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/nexa/outbox.err.log
stdout_logfile=/var/log/nexa/outbox.out.log
environment=DJANGO_SETTINGS_MODULE="backend.settings"
```

Cập nhật supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status nexa-outbox
```

### Cách 3: Docker Container / Background Worker (Render / Railway / Fly.io)

Trong file `docker-compose.yml` hoặc cấu hình Background Worker của PaaS:

```yaml
services:
  outbox-worker:
    build: .
    command: python backend/manage.py dispatch_outbox --poll-interval 2.0 --batch-size 50
    restart: always
    env_file:
      - ./backend/.env
    depends_on:
      db:
        condition: service_healthy
```

---

## 4. Giám sát & Chỉ số (Monitoring & Alerts)

API quản trị cung cấp báo cáo tình trạng outbox theo thời gian thực tại:
- `GET /api/admin/outbox-events/` trả về payload kèm trường `summary`:
  ```json
  {
    "summary": {
      "pending": 0,
      "due_backlog": 0,
      "processing": 0,
      "sent": 1420,
      "failed": 2,
      "oldest_pending_age_seconds": 0,
      "backlog_alert_threshold": 100,
      "alert": false
    }
  }
  ```

### Các ngưỡng cảnh báo (Alert Rules):
1. **Backlog đọng**: `due_backlog > 100` trong 5 phút liên tục → Cảnh báo tắc nghẽn hàng đợi hoặc worker bị tắt.
2. **Sự kiện quá hạn**: `oldest_pending_age_seconds > 600` → Có sự kiện bị nghẽn chưa được giải phóng.
3. **Sự kiện thất bại (Dead-Letter)**: `failed > 0` → Xuất hiện lỗi nghiêm trọng cần kỹ sư kiểm tra nguyên nhân tại `last_error_code`.

---

## 5. Quy trình Xử lý Sự cố (Runbook)

1. **Khi sự kiện bị trạng thái `failed`**:
   - Truy cập trang Quản trị Admin: **Nhật ký & Sự kiện** (`/admin/settings?tab=outbox&status=failed`).
   - Kiểm tra mã lỗi `last_error_code` và chi tiết ngoại lệ được ghi log.
   - Sau khi khắc phục nguyên nhân (ví dụ: máy chủ nhận webhook bên ngoài phục hồi), bấm nút **"Thử gửi lại"** để worker tiếp nhận và xử lý lại ngay lập tức.
2. **Khởi động lại Worker khi cập nhật mã nguồn**:
   ```bash
   sudo systemctl restart nexa-outbox-worker
   ```
