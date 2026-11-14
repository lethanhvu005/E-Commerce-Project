# Kế Hoạch Sao Lưu & Khôi Phục Cơ Sở Dữ Liệu PostgreSQL (Backup & Restore Plan) - Issue #23

Tài liệu hướng dẫn quy trình tự động sao lưu dự phòng, lưu trữ xoay vòng và khôi phục khi có sự cố cho cơ sở dữ liệu PostgreSQL của hệ thống NEXA / CommerceOS.

---

## 1. Chiến Lược Sao Lưu (Backup Strategy)

| Loại sao lưu | Tần suất | Thời gian lưu trữ (Retention) | Định dạng | Công cụ |
| :--- | :--- | :--- | :--- | :--- |
| **Full Backup hàng ngày** | 02:00 sáng mỗi ngày | 14 ngày | Custom Archive (`.dump`) | `pg_dump --format=custom` |
| **Giao dịch Outbox & Audit** | Lưu thời gian thực | Vĩnh viễn (Phân vùng theo tháng) | Bảng quan hệ | PostgreSQL Native |

---

## 2. Kịch Bản Tự Động Hóa

### Trên môi trường Windows / Local Server:
Sử dụng script PowerShell: [scripts/backup_postgres.ps1](file:///c:/ProjectCV/E-Commece_Project/scripts/backup_postgres.ps1)
```powershell
# Chạy thủ công:
powershell -ExecutionPolicy Bypass -File scripts\backup_postgres.ps1 -DbName commerceos_apps

# Đặt lịch tự động với Task Scheduler:
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\ProjectCV\E-Commece_Project\scripts\backup_postgres.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "NexaDatabaseBackupDaily" -Description "Daily PostgreSQL backup for NEXA"
```

### Trên môi trường Linux / VPS Production:
Sử dụng script Bash: [scripts/backup_postgres.sh](file:///c:/ProjectCV/E-Commece_Project/scripts/backup_postgres.sh)
```bash
# Phân quyền thực thi:
chmod +x scripts/backup_postgres.sh scripts/restore_postgres.sh

# Chạy thử sao lưu:
./scripts/backup_postgres.sh

# Cấu hình crontab tự động chạy 02:00 sáng mỗi ngày:
0 2 * * * /var/www/nexa/scripts/backup_postgres.sh >> /var/log/nexa/cron_backup.log 2>&1
```

---

## 3. Quy Trình Khôi Phục (Disaster Recovery Runbook)

Khi cơ sở dữ liệu gặp sự cố phần cứng, lỗi dữ liệu do người dùng hoặc cần rollback khẩn cấp:

### Bước 1: Tạm dừng dịch vụ Web & Worker để đảm bảo tính nhất quán
```bash
sudo systemctl stop nexa-backend
sudo systemctl stop nexa-outbox-worker
```

### Bước 2: Thực hiện khôi phục qua script
```bash
# Khôi phục vào database thật:
./scripts/restore_postgres.sh /var/www/nexa/backups/commerceos_apps_YYYYMMDD_HHMMSS.dump commerceos_apps

# Hoặc khôi phục vào database thử nghiệm (scratch DB) để đối soát dữ liệu:
./scripts/restore_postgres.sh /var/www/nexa/backups/commerceos_apps_YYYYMMDD_HHMMSS.dump commerceos_scratch_verify
```

### Bước 3: Chạy migration kiểm tra tính toàn vẹn
```bash
python manage.py migrate --check
```

### Bước 4: Khởi động lại dịch vụ
```bash
sudo systemctl start nexa-backend
sudo systemctl start nexa-outbox-worker
```

---

## 4. Kiểm Thử Khôi Phục Định Kỳ (Drill Test)
Mỗi tháng một lần, quản trị viên hệ thống có trách nhiệm:
1. Lấy bản backup ngẫu nhiên gần nhất từ thư mục lưu trữ.
2. Khôi phục vào database tạm thời `commerceos_drill_test`.
3. Chạy lệnh `python manage.py test operations.SensitiveModelAdminTests --keepdb` trên database tạm để xác nhận dữ liệu giải mã và các ràng buộc toàn vẹn không bị hỏng hóc.
