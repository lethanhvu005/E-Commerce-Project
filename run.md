# Hướng Dẫn Chạy & Vận Hành Hệ Thống NEXA / CommerceOS

Tài liệu lệnh chuẩn chạy hệ thống, worker, kiểm thử và sao lưu phục hồi dữ liệu.

---

## 1. Môi Trường Phát Triển (Development)

### Khởi động Backend (Django REST Framework):
```powershell
.\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

### Khởi động Frontend (React SPA):
```powershell
npm --prefix frontend start
```

### Khởi động Outbox Dispatcher Worker (xử lý hàng đợi sự kiện nền):
```powershell
.\.venv\Scripts\python.exe backend\manage.py dispatch_outbox --poll-interval 2.0 --batch-size 50
```

---

## 2. Kiểm Thử Hệ Thống (Automated Testing)

### Chạy toàn bộ Unit Tests Django Backend:
```powershell
.\.venv\Scripts\python.exe backend\manage.py test accounts carts catalog community inventory operations orders payments promotions wishlists --keepdb --noinput
```

### Chạy Unit Tests Frontend React:
```powershell
npm --prefix frontend test -- --watchAll=false
```

### Build Production Frontend:
```powershell
npm --prefix frontend run build
```

---

## 3. Kiểm Tra Bảo Mật & Sẵn Sàng Triển Khai (Production Readiness)

```powershell
$env:DJANGO_DEBUG="False"
$env:DJANGO_SECRET_KEY="production-secret-key-1234567890"
$env:DJANGO_ALLOWED_HOSTS="nexa.vn,www.nexa.vn"
$env:DJANGO_SECURE_HSTS_SECONDS="31536000"
$env:DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS="True"
$env:DJANGO_SECURE_HSTS_PRELOAD="True"
.\.venv\Scripts\python.exe backend\manage.py check --deploy
```

---

## 4. Sao Lưu & Khôi Phục Cơ Sở Dữ Liệu (Backup & Restore)

### Sao lưu database:
```powershell
# Windows PowerShell:
powershell -ExecutionPolicy Bypass -File scripts\backup_postgres.ps1

# Linux / macOS Bash:
./scripts/backup_postgres.sh
```

### Khôi phục database:
```bash
./scripts/restore_postgres.sh ./backups/commerceos_apps_YYYYMMDD_HHMMSS.dump commerceos_apps
```

Xem tài liệu chi tiết:
- [docs/DEPLOYMENT.md](file:///c:/ProjectCV/E-Commece_Project/docs/DEPLOYMENT.md)
- [docs/WORKER_OUTBOX.md](file:///c:/ProjectCV/E-Commece_Project/docs/WORKER_OUTBOX.md)
- [docs/BACKUP_RESTORE.md](file:///c:/ProjectCV/E-Commece_Project/docs/BACKUP_RESTORE.md)
- [docs/API_CONTRACTS.md](file:///c:/ProjectCV/E-Commece_Project/docs/API_CONTRACTS.md)
- [docs/CI_AUDIT.md](file:///c:/ProjectCV/E-Commece_Project/docs/CI_AUDIT.md)
