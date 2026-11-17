# S01–S20 — 20 kiểm tra bảo mật

Mỗi mục phải ghi: **trạng thái**, **bằng chứng**, **mức độ**, **test đã chạy**, **đề xuất fix**. Không đánh dấu PASS chỉ do có thư viện/cấu hình; cần xác minh luồng thực tế. Tham chiếu kỹ thuật: OWASP ASVS 5.0, OWASP Cheat Sheets, Django deployment checklist.

## Nhóm 1. Tài khoản

### S01 — Hash mật khẩu chuẩn
- **Ngăn ngừa:** không lưu plaintext/MD5/SHA256 đơn thuần. Dùng Argon2id, bcrypt hoặc PBKDF2 với thông số phù hợp; Django password hashers được cấu hình đúng. Có rehash/migrate an toàn nếu hệ thống cũ dùng thuật toán yếu.
- **Chứng minh:** tìm đường create_user/set_password, test rằng DB không có plaintext, login đúng và sai, migration; kiểm tra cả seed/import.

### S02 — Rate limit/anti-brute-force
- **Ngăn ngừa:** throttle login, register, reset, OTP, OAuth callback/exchange, MFA; phân biệt IP, account và nguồn trusted proxy. Không khóa cố định tài khoản chỉ vì attacker thử sai.
- **Chứng minh:** test vượt ngưỡng ra 429 hoặc bảo vệ tương đương, phân tích Redis/cache nhiều replica, logging cảnh báo; không coi Django DRF throttle mặc định là chống DDoS.

### S03 — Session/JWT expiry, revoke
- **Ngăn ngừa:** TTL ngắn cho access; refresh rotation + revocation; logout revoke; khóa user làm mất hiệu lực refresh; hạn tối đa session, risk-based re-auth; OAuth token không lưu lâu dài không cần thiết.
- **Chứng minh:** test access expired, refresh revoked/replay, logout, password changed, disabled account, parallel refresh.

## Nhóm 2. Không tự lộ thông tin

### S04 — Debug/logging an toàn
- **Ngăn ngừa:** DEBUG=False ở production; không log password, token, OTP, secret, số thẻ, PII; log structured với redaction. Không xóa toàn bộ log vì cần audit/giám sát.
- **Chứng minh:** kiểm tra settings, build, log sinks và log của auth/payment thất bại; kiểm tra console.log chứa dữ liệu nhạy cảm.

### S05 — Secrets/config đúng nơi
- **Ngăn ngừa:** secret OAuth/VNPay/DB/SMTP chỉ ở server/secret store; client chỉ có public IDs; .env không commit; rotate nếu lộ; kiểm soát CI secrets và JS bundle.
- **Chứng minh:** git tracked, git history/secret scan trong phạm vi cho phép, frontend bundle, repo public, deployment variables. Không hiển thị giá trị secret trong báo cáo.

### S06 — Error messages an toàn
- **Ngăn ngừa:** lỗi 500 chung ở client; không lộ stack trace, SQL, host, đường dẫn máy, token. Server lưu correlation ID và log nội bộ đã redacted; tránh user enumeration.
- **Chứng minh:** test 400/401/403/404/429/500, backend/React error paths, production DEBUG=False.

## Nhóm 3. Dữ liệu upload/input

### S07 — Allowlist file types
- **Ngăn ngừa:** xác thực extension + magic bytes/MIME server-side; không tin filename; chặn executable, SVG nguy hiểm, polyglot; lưu file ngoài executable path, scan phù hợp, dùng signed URL khi cần.
- **Chứng minh:** test file đổi đuôi, malicious content, traversal, unauthorized file read.

### S08 — File size/quantity/resource limits
- **Ngăn ngừa:** giới hạn byte, pixel, số lượng file, quota user, timeout, proxy/body limits, decompression bomb; xử lý lỗi sạch, không OOM.
- **Chứng minh:** boundary tests quá size, nhiều upload đồng thời, 413/400 phù hợp.

### S09 — Server-side validation
- **Ngăn ngừa:** validate type/length/range/ownership/price/stock/status trên server; không tin field `is_staff`, amount, discount, owner từ client; chống mass assignment.
- **Chứng minh:** gửi payload bypass frontend: quantity âm, role admin, order amount giả, nested JSON trái schema.

## Nhóm 4. Tự thử phá trong phạm vi được phép

### S10 — IDOR/BOLA
- **Ngăn ngừa:** object scoping bởi `request.user` và permission ở từng endpoint, kể cả UUID khó đoán; tài nguyên guest phải có ownership token an toàn.
- **Chứng minh:** dùng 2 account kiểm tra GET/PATCH/DELETE đối tượng của người kia; expect 403/404; chỉ test môi trường/đối tượng được phép.

### S11 — Admin RBAC / privilege escalation
- **Ngăn ngừa:** backend kiểm `is_staff` + permission theo action; deny-by-default; customer không được self-promote; admin OAuth linking cần xác minh lại; chức năng nguy hiểm cần audit.
- **Chứng minh:** anonymous/customer/staff-readonly/staff-ops/superuser matrix; thử request trực tiếp bất chấp nút UI ẩn.

### S12 — SQL injection / ORM queries
- **Ngăn ngừa:** Django ORM/parameterized raw SQL, allowlist sort/filter fields, tránh f-string SQL/identifier injection.
- **Chứng minh:** inspect raw SQL, `extra()`, `RawSQL`, search/sort input; test chuỗi đặc biệt không làm đổi logic.

## Nhóm 5. Trình duyệt

### S13 — HTTPS/TLS
- **Ngăn ngừa:** HTTPS production, redirect HTTP, reverse proxy trusted headers chính xác; HSTS khi đủ điều kiện, không tự bật HSTS preload ở staging; webhooks HTTPS.
- **Chứng minh:** curl -I HTTP/HTTPS trên domain thật, redirect chain, TLS cert, mixed content, callback/asset URLs.

### S14 — Security headers
- **Ngăn ngừa:** CSP phù hợp, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors/X-Frame-Options, Permissions-Policy. Đừng đặt CSP yếu chỉ để script hoạt động.
- **Chứng minh:** kiểm response headers thực tế, browser CSP reports; test script/font/iframe của Google, Facebook, VNPay hợp lệ.

### S15 — Cookie/session flags
- **Ngăn ngừa:** session/refresh cookies nhạy cảm có Secure, HttpOnly nếu không cần JS, SameSite theo cross-site flow; CSRF protection khi dùng cookie auth. JWT trong localStorage cần đánh giá XSS; không khẳng định đã bảo vệ bằng cookie flags.
- **Chứng minh:** kiểm `Set-Cookie` production, CSRF tests, cross-origin redirect, refresh behavior.

## Nhóm 6. Server và hạ tầng

### S16 — CORS allowlist
- **Ngăn ngừa:** chỉ origin cần, không wildcard với credentials; server CORS không thay thế auth/CSRF; phân biệt localhost và production.
- **Chứng minh:** inspect env + response preflight cho origin hợp lệ/khác; test Origin bị giả.

### S17 — DB không public không cần thiết
- **Ngăn ngừa:** private DB network, firewall, TLS, IP allowlist, không public 5432 mặc định; kiểm cloud security groups và local bind.
- **Chứng minh:** deploy topology, DB host exposure, inbound firewall; không quét mạng ngoài quyền.

### S18 — Least privilege DB role
- **Ngăn ngừa:** app role chỉ CRUD cần thiết, migration role tách riêng khi có thể, backup role tách; không dùng superuser trong runtime.
- **Chứng minh:** xem pg roles/grants (không log password), test app không thể CREATE ROLE/DROP DATABASE.

## Nhóm 7. Bảo vệ và khả năng phục hồi

### S19 — DDoS/WAF/rate mitigation
- **Ngăn ngừa:** CDN/WAF (Cloudflare hoặc lựa chọn khác), caching, request limits, bot protection, provider DDoS, rate limiting; không khẳng định Cloudflare là bắt buộc.
- **Chứng minh:** kiến trúc thực tế, rules, alerts, thử tải được phép và xác nhận origin không bị bypass.

### S20 — Backup/monitoring/recovery
- **Ngăn ngừa:** backup tự động, mã hóa, retention, restore drill, metrics/errors/alerts, incident response, audit trails, secret rotation; mục tiêu RPO/RTO phù hợp.
- **Chứng minh:** backup job đã chạy, restore test và timestamp, owner nhận alert, health checks. Có lịch backup nhưng chưa thử phục hồi = PARTIAL.

## Bổ sung bắt buộc cho web thương mại điện tử

- Với checkout/payment: HMAC/signature IPN, merchant/amount/currency/order check; idempotency; phân biệt return URL với IPN, late/refund, locking; tránh replay/double charge.
- Với stock/order: DB transaction, row lock, inventory reservations TTL & expiry, voucher race; test 2 request đồng thời.
- Với OAuth: verify issuer/audience/sub/nonce-state khi phù hợp, bảo vệ account linking, không gộp user chỉ dựa vào email; không cấp admin tự động.
- Với secrets hình ảnh/file: kiểm nguồn ảnh, licence và quyền tải xuống.

**Nguồn**: https://asvs.owasp.org/ ; https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/ ; https://cheatsheetseries.owasp.org/
