# Hệ Thống Kiểm Toán Tự Động CI/CD (Security & Code Audit Pipeline) - Issue #28

Tài liệu thiết kế và vận hành quy trình kiểm toán mã nguồn, bảo mật phụ thuộc và tự động phát hiện lỗi tích hợp GitHub Actions.

---

## 1. Mục Tiêu & Cơ Chế Hoạt Động

Pipeline `.github/workflows/audit.yml` được thiết kế nhằm:
1. **Kiểm tra tự động đa tầng**:
   - `ruff`: Linter tốc độ cao kiểm tra cú pháp và chất lượng mã nguồn Python.
   - `bandit`: Quét lỗ hổng bảo mật trong mã nguồn backend (injection, hardcoded secrets, unsafe deserialization).
   - `pip-audit`: Đối chiếu các thư viện Python với cơ sở dữ liệu lỗ hổng bảo mật CVE / PyPA.
   - `npm audit`: Quét các gói phụ thuộc JavaScript frontend nhằm cảnh báo các lỗ hổng đã được công bố.
2. **Chuẩn hóa & Khử trùng lặp (Fingerprinting)**:
   - Tập lệnh `.github/scripts/collect_findings.py` tổng hợp kết quả thành file `findings.json`.
   - Mỗi phát hiện được cấp một mã băm duy nhất:
     `fingerprint = sha256(tool + rule_id + file_path + context)[:16]`
   - Thuật toán băm độc lập với số dòng (`line`) và commit SHA, giúp mã nhận dạng giữ nguyên qua các lần tái cấu trúc hoặc thêm bớt dòng code lân cận.
3. **Quản lý Vòng Đời Issue (Deduplication & Rate-Limiting)**:
   - Tập lệnh `.github/scripts/report_issues.py` truy vấn toàn bộ GitHub Issues (cả đang mở `open` và đã đóng `closed`).
   - Kiểm tra thẻ `<!-- audit-fingerprint: <fp> -->` trong nội dung issue. Nếu fingerprint đã từng tồn tại, bot sẽ **không** tạo lại issue mới.
   - Giới hạn tối đa **5 issues mới mỗi lần chạy** (`MAX_ISSUES_PER_RUN = 5`) để chống quá tải thông báo (notification storm).
4. **Chống Vòng Lặp Vô Hạn (Loop Guard)**:
   - Workflow tự động bỏ qua nếu commit được tạo bởi bot (`github-actions[bot]`) hoặc commit message chứa chuỗi `[skip-audit]`.
   - Job tạo issue (`report-issues`) **chỉ** chạy trên nhánh mặc định `main` và không bao giờ chạy trên Pull Request.

---

## 2. Kích Hoạt Thủ Công (Manual Trigger / Dry-Run)

Quản trị viên có thể kích hoạt quy trình quét thông qua giao diện GitHub Actions:
- Đi đến tab **Actions** → Chọn **CI Security & Code Audit**.
- Bấm **Run workflow**.
- Tùy chọn **dry_run**:
  - `true`: Quét và xuất báo cáo `findings.json`, in ra console nhưng không tạo GitHub Issues.
  - `false`: Tạo tối đa 5 GitHub Issues cho các phát hiện mới.

---

## 3. Quy Tắc Bỏ Qua Phát Hiện Hợp Lệ (Suppression / False Positives)

1. **Python (Ruff)**:
   Thêm chú thích inline `# noqa: <RULE_ID>` tại dòng được xác nhận là an toàn.
2. **Python (Bandit)**:
   Thêm chú thích inline `# nosec <TEST_ID>` tại dòng code đã được rà soát.
3. **NPM Audit**:
   Nếu lỗ hổng chỉ xuất hiện trong môi trường phát triển (devDependencies) không ảnh hưởng đến build production, đóng issue tương ứng với lý do `as designed` hoặc cập nhật phiên bản phụ thuộc trong `frontend/package.json`.
