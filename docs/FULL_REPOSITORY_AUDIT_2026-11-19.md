# Báo cáo audit và tối ưu CommerceOS / NEXA GEAR

Ngày rà soát: 2026-11-19

Branch làm việc: `audit/full-repository-optimization`

Commit nền: `2b9d61159e0cbd6c97c0e2443d90c5dbf5176ae5`

## A. Tổng quan

- Repository có 784 file được Git theo dõi; phạm vi source/cấu hình đã lập chỉ mục gồm 338 file Python, JavaScript, CSS, HTML, YAML, JSON và Docker/config.
- Thay đổi audit: 12 file thay đổi, 1 file source không dùng được xóa, 3 dependency trực tiếp không dùng được gỡ bỏ, 114 dòng thêm và 102 dòng xóa (không tính file báo cáo này).
- Không xóa migration, public API, dữ liệu, asset động hoặc chức năng Facebook đang phát triển.
- Các file `frontend_html/`, hai tài liệu/archive ở root đã ở trạng thái deleted trước audit. Audit không tạo, khôi phục, stage hoặc sửa các thay đổi đó.
- Không push, merge hoặc thay đổi `main`.

## B. Code đã loại bỏ

| Vị trí | Nội dung | Bằng chứng không sử dụng | Kiểm chứng |
|---|---|---|---|
| `backend/accounts/views.py` | Hàm `_smtp_is_configured()` | Chỉ có định nghĩa, không có call site trong repository | Ruff, Django check |
| `frontend/src/reportWebVitals.js` | CRA Web Vitals bootstrap không được import từ entrypoint | `frontend/src/index.js` chỉ render `App`; Git grep không có call site | React test và production build |
| `frontend/package.json` | `gsap`, `lenis`, `web-vitals` | Không có import/call site trong source đang chạy; `web-vitals` chỉ thuộc file bootstrap không dùng | `npm test`, `npm run build`, `npm ls` |
| `.gitignore` | Chuỗi `findings.json` bị mã hóa kèm null-byte | Không phải pattern hợp lệ | File được chuẩn hóa UTF-8 và bổ sung output tooling |

Không xóa CSS hoặc asset chỉ dựa trên tìm kiếm chuỗi vì chúng có thể được tham chiếu qua dữ liệu/API hoặc class động.

## C. Danh sách tối ưu

### Backend

1. `backend/accounts/throttles.py`, `backend/accounts/views.py`, `backend/backend/settings.py`
   - Thêm throttle theo người dùng cho hai endpoint gửi OTP email.
   - Mặc định: 5 yêu cầu / 10 phút, có thể cấu hình bằng `DRF_OTP_THROTTLE_RATE`.
   - Giảm nguy cơ spam SMTP và abuse nhưng giữ nguyên JWT/RBAC/OTP/Facebook.

2. `backend/catalog/serializers.py`
   - Cache danh sách variant đang hoạt động theo product trong một vòng serialize.
   - Trước đây cùng một danh sách bị lọc/sắp xếp lại cho compare price, default variant và stock; nay dùng lại kết quả.

3. `backend/catalog/views.py`
   - Endpoint variants dùng queryset tối thiểu thay cho `active_products()` vốn prefetch images/reviews và aggregate không cần thiết.
   - Giảm JOIN, aggregate và prefetch dư thừa mà không đổi contract response.

4. `backend/accounts/tests.py`
   - Thêm regression test xác nhận endpoint OTP trả HTTP 429 khi vượt giới hạn.

### Frontend

1. `frontend/src/pages/AdminInventoryPage.js`
   - Chỉ tải movements khi mở tab movements, audit logs khi mở tab audit; tab balances từ 3 request giảm còn 1 request.
   - Thêm request generation guard để response cũ không ghi đè response mới khi đổi tab/search/page nhanh.
   - Không xóa cache của tab không hoạt động.

2. `frontend/src/__tests__/issues_frontend.test.js`
   - Regression test xác nhận tab mặc định chỉ gọi balances API.

3. Dependency frontend
   - Dependency trực tiếp giảm từ 7 xuống 4 package runtime khai báo.
   - Không dùng `npm audit fix --force` vì sẽ ép React Router lên major version 7 và có nguy cơ đổi hành vi.

## D. Vấn đề chưa xử lý

| Mức | Vị trí | Vấn đề | Lý do giữ nguyên / hướng xử lý |
|---|---|---|---|
| P1 | `frontend/package-lock.json` | `npm audit --omit=dev` còn 2 moderate thuộc React Router 6.30.6 | Fix tự động yêu cầu major v7. Cần nhánh nâng cấp riêng và E2E route/auth trước khi đổi. |
| P1 | Backend integration | 102 backend tests được discovery nhưng chưa chạy trên PostgreSQL | Docker engine không có trên máy. SQLite không tương thích migration PostgreSQL dùng `jsonb_typeof`. Cần PostgreSQL test service/CI. |
| P1 | Production | Backup restore, monitoring, DDoS/WAF và DB least-privilege chưa được xác minh trực tiếp | Cần quyền Render/Neon và diễn tập restore; không suy đoán từ source. |
| P2 | Frontend tooling | Full `npm audit` còn 10 cảnh báo (4 moderate, 6 high), phần lớn từ `react-scripts` toolchain | `react-scripts` đã cũ; nâng cấp/đổi build tool là thay đổi kiến trúc, nằm ngoài cleanup an toàn. |
| P2 | UI | React Router phát cảnh báo future flags v7 trong test | Không ảnh hưởng runtime hiện tại; xử lý cùng đợt nâng React Router. |
| P2 | Source encoding | Một số chuỗi tiếng Việt hiển thị mojibake trong terminal/source | Thay hàng loạt có rủi ro UI/dữ liệu; cần kiểm tra browser và encoding từng file. |
| P2 | `frontend_html/` | Toàn bộ cây đang bị xóa trong worktree | Đây là thay đổi có trước audit; cần chủ sở hữu quyết định khôi phục hay loại khỏi repository. |
| P3 | UI/E2E | Chưa chạy Playwright với backend/database thật | Thiếu PostgreSQL/API runtime; React component regression test và build đã chạy. |

## E. Kết quả kiểm thử

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| React test | PASS | 3 suites, 30/30 tests |
| React production build | PASS | Compile thành công; JS gzip 157.15 kB, CSS gzip 12.55 kB |
| Ruff | PASS | `All checks passed!` |
| Django system check | PASS | 0 issues |
| Python compileall | PASS | Không lỗi cú pháp |
| pip check | PASS | Không dependency Python bị vỡ |
| pip-audit | PASS | Không CVE đã biết trong `backend/requirements.txt` |
| Bandit | PASS có lưu ý | 0 high/medium; 53 low đều là test fixture/default local hoặc false positive chuỗi validation |
| npm audit production | PARTIAL | 2 moderate; chưa force major upgrade |
| Django tests PostgreSQL | UNVERIFIED | Docker/PostgreSQL local không khả dụng |
| Migration runtime | UNVERIFIED | Không có kết nối PostgreSQL; không dùng SQLite thay thế vì migration có SQL PostgreSQL |
| Playwright E2E | UNVERIFIED | Thiếu backend/database runtime hoàn chỉnh |
| Diff whitespace | PASS | `git diff --check` không lỗi |

## F. Ma trận phát hành 60 tiêu chí

### Security S01-S20

| ID | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| S01 | PASS | Django `create_user`/password hash; không lưu plaintext production. |
| S02 | PASS | Auth throttle có sẵn; bổ sung throttle riêng cho OTP. |
| S03 | PASS | SimpleJWT rotate refresh + blacklist; logout blacklist token. |
| S04 | PARTIAL | Có logging Django/Render; chưa xác minh alert tập trung production. |
| S05 | PASS | Secret lấy từ environment; scan tracked source chỉ thấy test fixture và local fallback. |
| S06 | PASS | DRF exception/validation response; DEBUG production bị chặn bởi cấu hình. |
| S07 | N/A | Luồng ảnh sản phẩm dùng object key, không nhận binary upload public trong API đã audit. |
| S08 | N/A | Không có public multipart upload trong contract hiện tại. |
| S09 | PASS | Serializer validation cho auth/catalog/order/payment. |
| S10 | PASS | Query tài khoản/địa chỉ/order gắn `request.user`; payment return kiểm tra owner. |
| S11 | PASS | IsAuthenticated/staff permission và kiểm tra quyền admin. |
| S12 | PASS | ORM/parameterized SQL; không phát hiện SQL nối chuỗi từ request. |
| S13 | PARTIAL | HTTPS redirect/cookie/HSTS cấu hình được; chưa xác minh edge production. |
| S14 | PARTIAL | Django security middleware có; CSP/edge headers chưa được kiểm chứng live. |
| S15 | PASS | Secure/HttpOnly/SameSite cookie cấu hình theo environment. |
| S16 | PASS | CORS allowlist từ environment, không wildcard credentialed. |
| S17 | UNVERIFIED | Neon exposure/network policy không thể xác minh từ source. |
| S18 | UNVERIFIED | Quyền role DB production không thể xác minh từ source. |
| S19 | UNVERIFIED | Render/edge DDoS protection và WAF chưa kiểm chứng. |
| S20 | UNVERIFIED | Chưa có bằng chứng restore drill/alert production. |

### Legal/Compliance L01-L20

| ID | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| L01 | PASS | Route `/privacy` và nội dung chính sách hiện diện. |
| L02 | PARTIAL | Nội dung điều khoản nằm trong info pages; cần rà soát pháp lý chính thức. |
| L03 | PARTIAL | Cookie auth được cấu hình; chưa có consent banner cho tracking nếu sau này bật analytics. |
| L04 | PASS | Chính sách đổi trả/bảo hành hiển thị ở info pages. |
| L05 | PASS | API không trả password/hash/token nhạy cảm; serializer giới hạn field. |
| L06 | PARTIAL | OAuth có thao tác chủ động; consent pháp lý tổng thể chưa được luật sư duyệt. |
| L07 | PARTIAL | Mục đích dữ liệu có mô tả nhưng chưa có data inventory chính thức. |
| L08 | PARTIAL | Có cập nhật hồ sơ; quy trình export/delete account chưa xác minh đầy đủ. |
| L09 | PARTIAL | Google/Facebook/VNPay được dùng; disclosure cần rà soát bản production. |
| L10 | PARTIAL | Font có license trong assets cũ; toàn bộ ảnh sản phẩm cần hồ sơ nguồn. |
| L11 | PASS | Review gắn người mua đã xác minh; reply được tách khỏi rating. |
| L12 | PASS | Không phát hiện claim y tế/tài chính gây hiểu nhầm trong source. |
| L13 | PASS | Thông tin showroom/liên hệ hiện diện trong UI. |
| L14 | PASS | Ảnh React có alt/fallback trong các component chính. |
| L15 | PARTIAL | Dark/light theme tồn tại; chưa chạy đo contrast tự động mọi route. |
| L16 | PARTIAL | Form/button semantic chính có; chưa hoàn tất keyboard E2E toàn site. |
| L17 | PASS | Form auth/checkout/admin chính có label hoặc accessible name. |
| L18 | N/A | Không phát hiện analytics/tracking production trong source hiện tại. |
| L19 | PARTIAL | Chưa có rà soát luật sư về thẩm quyền và pháp luật áp dụng. |
| L20 | PARTIAL | Git có lịch sử; chưa có quy trình duyệt thay đổi policy riêng. |

### UX/UI U01-U20

| ID | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| U01 | PASS | Header/navigation thống nhất qua layout React. |
| U02 | PASS | Active route/tab được biểu thị trong client/admin. |
| U03 | PASS | Loading/error/empty states dùng component chung. |
| U04 | PASS | Form validation lỗi theo field và message API. |
| U05 | PASS | CTA checkout/payment có loading/disable guard. |
| U06 | PASS | Responsive CSS hiện diện cho client/admin. |
| U07 | PASS | Dark/light mode giữ trong layout/theme. |
| U08 | PASS | Ảnh dùng lazy loading/fallback ở danh sách. |
| U09 | PASS | Search có debounce; Products/Admin có request-id guard. |
| U10 | PASS | Pagination thực hiện ở API/database cho danh sách chính. |
| U11 | PASS | Admin Inventory chỉ tải dataset của tab hiện hành. |
| U12 | PASS | Admin Inventory chặn stale response. |
| U13 | PASS | Modal/save có trạng thái processing và error feedback. |
| U14 | PASS | Protected routes và staff checks giữ nguyên. |
| U15 | PASS | Cart/checkout không tin tổng tiền từ client; server tính lại. |
| U16 | PASS | Order/payment status có giao diện phản hồi. |
| U17 | PASS | Reviews/questions/replies giữ luồng mua hàng và thảo luận. |
| U18 | PARTIAL | Chưa có visual regression trên toàn bộ viewport do backend unavailable. |
| U19 | PARTIAL | Admin module lớn còn có thể tách tiếp, nhưng thay đổi sâu cần test PostgreSQL/E2E. |
| U20 | PASS | Production build không có compile error. |

## G. Kết luận

Trạng thái đề xuất: **CONDITIONAL**.

Nhóm thay đổi đã giảm request Admin Inventory, ngăn race condition, giảm xử lý/prefetch catalog, chống spam OTP và loại bỏ dependency/source chết mà không đổi contract nghiệp vụ. Frontend unit/regression test, build và static checks đều đạt. Chưa nên coi là sẵn sàng production tuyệt đối cho tới khi chạy đủ 102 backend tests trên PostgreSQL, E2E với API thật, xử lý lộ trình React Router/CRA và xác minh backup/monitoring/DB policy trên hạ tầng thực tế.
