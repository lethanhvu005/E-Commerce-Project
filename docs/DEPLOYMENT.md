# Hướng Dẫn Triển Khai Production (Deployment & Security Guide) - Issue #23

Tài liệu chuẩn hóa quy trình triển khai môi trường Production cho dự án NEXA / CommerceOS (Django REST Framework + React SPA + PostgreSQL + Redis).

---

## 1. Kết Quả Kiểm Tra Bảo Mật Tự Động (`manage.py check --deploy`)

Khi kích hoạt các biến môi trường Production tiêu chuẩn:
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS="nexa.vn,www.nexa.vn"`
- `DJANGO_SECURE_HSTS_SECONDS="31536000"`
- `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS="True"`
- `DJANGO_SECURE_HSTS_PRELOAD="True"`

Lệnh kiểm tra đạt kết quả hoàn hảo **0 lỗi, 0 cảnh báo**:

```text
$ python manage.py check --deploy
System check identified no issues (0 silenced).
```

### Các biện pháp bảo mật cốt lõi đã kích hoạt:
1. `SESSION_COOKIE_HTTPONLY = True`: Ngăn chặn hoàn toàn việc đánh cắp session qua XSS.
2. `SESSION_COOKIE_SECURE = True` & `CSRF_COOKIE_SECURE = True`: Cookie chỉ truyền tải qua giao thức HTTPS.
3. `SECURE_BROWSER_XSS_FILTER = True` & `SECURE_CONTENT_TYPE_NOSNIFF = True`: Chống MIME-sniffing.
4. `X_FRAME_OPTIONS = 'DENY'`: Chống tấn công Clickjacking.
5. `SECURE_REFERRER_POLICY = 'same-origin'`: Bảo vệ rò rỉ URL nhạy cảm qua header Referer.
6. `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`: Tương thích proxy SSL ngược (Cloudflare, Nginx, Render).

---

## 2. Bảng Biến Môi Trường Production (.env)

| Tên biến | Bắt buộc | Ví dụ mẫu | Mô tả |
| :--- | :--- | :--- | :--- |
| `DJANGO_DEBUG` | **Có** | `False` | Luôn đặt `False` trên Production. |
| `DJANGO_SECRET_KEY` | **Có** | `khóa-bảo-mật-ngẫu-nhiên-64-ký-tự` | Chuỗi bí mật mã hóa cryptographic của Django. |
| `DJANGO_ALLOWED_HOSTS` | **Có** | `nexa.vn,www.nexa.vn,api.nexa.vn` | Danh sách tên miền được phép truy cập. |
| `DATABASE_URL` | **Có** | `postgres://user:pass@host:5432/nexa_prod` | Chuỗi kết nối cơ sở dữ liệu PostgreSQL. |
| `REDIS_URL` | Tùy chọn | `redis://:pass@host:6379/1` | Cache phân tán và rate-limit. |
| `DJANGO_SECURE_HSTS_SECONDS` | Khuyến nghị | `31536000` | Kích hoạt Strict-Transport-Security (1 năm). |
| `GOOGLE_CLIENT_ID` | Tùy chọn | `xyz.apps.googleusercontent.com` | Xác thực Google OAuth cho Web & Mobile. |
| `FACEBOOK_APP_ID` | Tùy chọn | `123456789012345` | Xác thực Facebook OAuth Graph API. |
| `FACEBOOK_APP_SECRET` | Tùy chọn | `abcdef0123456789abcdef` | Secret xác thực token phía server. |

> [!CAUTION]
> **CẢNH BÁO TUYỆT ĐỐI KHÔNG CHẠY SEED DEMO TRÊN PRODUCTION:**
> Tuyệt đối **KHÔNG ĐƯỢC CHẠY** lệnh `python manage.py seed_frontend_demo` trên cơ sở dữ liệu Production. Lệnh này chỉ dành riêng cho môi trường Development / Local QA; nếu chạy trên Production, nó sẽ tạo các tài khoản demo với mật khẩu cố định và ghi đè số liệu giao dịch kinh doanh thật.

---

## 3. Kiến Trúc Triển Khai

### Phương án A: Triển khai VPS Linux (Ubuntu 22.04 LTS / Debian 12)

```
[Khách hàng / Trình duyệt]
           │ HTTPS (443)
           ▼
     [NGINX Reverse Proxy]
      │               │
      │ /api/ & /admin/       │ / (Static SPA)
      ▼                       ▼
[Gunicorn ASGI/WSGI]    [/var/www/nexa/frontend/build]
(4 workers, Uvicorn)
      │
      ├───────────────────────┬───────────────────────┐
      ▼                       ▼                       ▼
[PostgreSQL Database]    [Redis Cache]     [Outbox Worker Service]
                                            (systemd daemon)
```

#### 1. Cấu hình Nginx (`/etc/nginx/sites-available/nexa.vn`):
```nginx
server {
    listen 80;
    server_name nexa.vn www.nexa.vn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nexa.vn www.nexa.vn;

    ssl_certificate /etc/letsencrypt/live/nexa.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexa.vn/privkey.pem;

    root /var/www/nexa/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        alias /var/www/nexa/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

#### 2. Dịch vụ Gunicorn (`/etc/systemd/system/nexa-backend.service`):
```ini
[Unit]
Description=NEXA Backend Gunicorn Application
After=network.target postgresql.service

[Service]
User=nexa
Group=nexa
WorkingDirectory=/var/www/nexa/backend
EnvironmentFile=/var/www/nexa/backend/.env
ExecStart=/var/www/nexa/.venv/bin/gunicorn backend.wsgi:application \
    --workers 4 \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/nexa/access.log \
    --error-logfile /var/log/nexa/error.log
Restart=always

[Install]
WantedBy=multi-user.target
```

### Phương án B: Triển khai Nền tảng Đám mây PaaS (Render / Railway)

1. **Web Service (Backend)**:
   - Build Command: `pip install -r requirements.txt && python backend/manage.py collectstatic --noinput && python backend/manage.py migrate --noinput`
   - Start Command: `gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT`
2. **Background Worker (Outbox Worker)**:
   - Command: `python backend/manage.py dispatch_outbox --poll-interval 2.0 --batch-size 50`
3. **Static Site (Frontend)**:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
   - Rewrite Rule: `/* -> /index.html (200)`

---

## 4. Kế Hoạch Sao Lưu & Khôi Phục (Backup & Disaster Recovery)

Chi tiết quy trình sao lưu và phục hồi dữ liệu được lưu tại [docs/BACKUP_RESTORE.md](file:///c:/ProjectCV/E-Commece_Project/docs/BACKUP_RESTORE.md).
- Kịch bản tự động sao lưu định kỳ: `scripts/backup_postgres.sh` (Linux) hoặc `scripts/backup_postgres.ps1` (Windows Server).
- Kịch bản phục hồi: `scripts/restore_postgres.sh`.

---

## 5. Quy Trình Rollback (Kế hoạch lùi phiên bản)

Khi bản phát hành mới gặp sự cố:
1. **Lùi mã nguồn**:
   ```bash
   git checkout <commit-id-trước-đó>
   ```
2. **Khôi phục migration (nếu có migration đảo ngược)**:
   ```bash
   python manage.py migrate <app_name> <migration_number_cũ>
   ```
3. **Khởi động lại tiến trình**:
   ```bash
   sudo systemctl restart nexa-backend
   sudo systemctl restart nexa-outbox-worker
   ```
4. **Xóa cache Cloudflare / Nginx** để khách hàng nhận bản bundle JavaScript chính xác.

---

## 6. Danh Sách Kiểm Tra Trước Khi Mở Bán (Go-Live Checklist)

- [ ] Đã chạy `python manage.py check --deploy` và kết quả trả về `0 issues`.
- [ ] Biến môi trường `DJANGO_DEBUG` chắc chắn là `False`.
- [ ] Cơ sở dữ liệu PostgreSQL đã hoàn thành lệnh `migrate` mới nhất.
- [ ] Đã thu thập file tĩnh qua `collectstatic`.
- [ ] Đã thiết lập dịch vụ nền Outbox Worker và xác nhận trạng thái `active (running)`.
- [ ] Đã kích hoạt chứng chỉ SSL/TLS (HTTPS) trên toàn bộ domain.
- [ ] Đã cấu hình và kiểm tra lịch tự động sao lưu database hàng ngày (`cron`).
- [ ] Đã kiểm tra tính năng thanh toán COD và tạo đơn hàng thực tế trên môi trường live.
