<div align="center">

# NEXA GEAR · CommerceOS

**Nền tảng thương mại điện tử gaming gear với storefront React, API Django REST Framework và cổng quản trị vận hành.**

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Django](https://img.shields.io/badge/Django-6.1-0C4B33?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![DRF](https://img.shields.io/badge/Django_REST_Framework-3.18-A30000)](https://www.django-rest-framework.org/)

</div>

---

## Giới thiệu

NEXA GEAR là dự án full-stack mô phỏng một hệ thống thương mại điện tử hoàn chỉnh dành cho thiết bị gaming. Dự án bao gồm luồng mua hàng phía khách, quản lý sản phẩm và tồn kho, đơn hàng, thanh toán, khuyến mãi, đánh giá và cổng quản trị theo quyền.

### Chức năng chính

- Danh mục, thương hiệu, sản phẩm, phiên bản và tồn kho theo SKU.
- Tìm kiếm, lọc, sắp xếp và phân trang sản phẩm.
- Đăng ký, đăng nhập JWT, Google OAuth và Facebook Login.
- Hồ sơ người dùng, địa chỉ nhận hàng, wishlist và voucher.
- Giỏ hàng, checkout nguyên tử và chống tạo đơn trùng.
- Thanh toán COD và VNPay Sandbox.
- Quản lý vòng đời đơn hàng và lịch sử trạng thái.
- Đánh giá sản phẩm, hỏi đáp và trả lời bình luận.
- Admin Dashboard, sản phẩm, kho, đơn hàng, khách hàng và khuyến mãi.
- Outbox worker cho các tác vụ nền và tích hợp email.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19, React Router 6, CSS responsive |
| Backend | Python 3.12, Django 6.1, Django REST Framework 3.18 |
| Xác thực | SimpleJWT, Google OAuth, Facebook Login |
| Database | PostgreSQL 17, Psycopg 3 |
| Thanh toán | COD, VNPay Sandbox |
| Triển khai | Render, Gunicorn, WhiteNoise |
| Kiểm thử | Django TestCase, React Testing Library, Playwright |
| CI/CD | GitHub Actions, Ruff, Bandit, pip-audit, npm audit |

## Kiến trúc thư mục

```text
E-Commece_Project/
├── backend/                 # Django REST API
│   ├── accounts/            # Tài khoản, JWT, OAuth, OTP
│   ├── catalog/             # Danh mục và sản phẩm
│   ├── carts/               # Giỏ hàng
│   ├── orders/              # Checkout và đơn hàng
│   ├── payments/            # COD và VNPay
│   ├── inventory/           # Tồn kho và movement
│   ├── promotions/          # Voucher, banner, khuyến mãi
│   ├── community/           # Đánh giá và hỏi đáp
│   ├── operations/          # Admin, audit log, outbox
│   └── wishlists/           # Danh sách yêu thích
├── frontend/                # React SPA và Admin Portal
├── commerceos-demo/         # PostgreSQL Docker Compose
├── loadtests/               # Locust load tests
├── scripts/                 # Backup, restore và tiện ích
├── docs/                    # API, deployment và audit
├── render.yaml              # Render Blueprint
└── run.md                   # Lệnh vận hành chi tiết
```

## Chạy dự án trên Windows

### 1. Clone và tạo môi trường Python

```powershell
git clone https://github.com/lethanhvu005/E-Commerce-Project.git
cd E-Commerce-Project

py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 2. Khởi động PostgreSQL

Tạo file `commerceos-demo/.env`:

```env
POSTGRES_PASSWORD=your_local_password
```

```powershell
docker compose --env-file commerceos-demo\.env -f commerceos-demo\compose.yaml up -d
```

### 3. Cấu hình backend

Tạo `backend/.env` hoặc khai báo các biến môi trường tương ứng:

```env
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=change-me-in-local-development
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=postgresql://commerceos:your_local_password@127.0.0.1:5432/commerceos_demo
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:3000
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:3000

# Tùy chọn
GOOGLE_CLIENT_ID=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
```

> Không commit file `.env` hoặc khóa bí mật lên Git.

### 4. Migration và tài khoản quản trị

```powershell
.\.venv\Scripts\python.exe backend\manage.py migrate
.\.venv\Scripts\python.exe backend\manage.py createsuperuser
```

### 5. Chạy backend

```powershell
.\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

API health check: [http://127.0.0.1:8000/api/health/](http://127.0.0.1:8000/api/health/)

### 6. Chạy frontend

Mở terminal khác:

```powershell
npm --prefix frontend install
npm --prefix frontend start
```

Frontend: [http://localhost:3000](http://localhost:3000)

### 7. Chạy outbox worker

```powershell
.\.venv\Scripts\python.exe backend\manage.py dispatch_outbox --poll-interval 2 --batch-size 50
```

## API

Tất cả endpoint nghiệp vụ nằm dưới prefix `/api/`.

| Nhóm | Ví dụ |
|---|---|
| Health | `GET /api/health/` |
| Authentication | `/api/auth/` |
| Catalog | `/api/categories/`, `/api/products/` |
| Cart | `/api/cart/` |
| Orders | `/api/orders/` |
| Payments | `/api/payments/` |
| Inventory | `/api/inventory/` |
| Admin | `/api/admin/` |

Xem contract chi tiết tại [read_api.md](read_api.md) và [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md).

API cần đăng nhập sử dụng access token:

```http
Authorization: Bearer <access_token>
```

## Kiểm thử và chất lượng mã nguồn

### Backend

```powershell
.\.venv\Scripts\python.exe backend\manage.py check
.\.venv\Scripts\python.exe backend\manage.py test accounts carts catalog community inventory operations orders payments promotions wishlists
.\.venv\Scripts\python.exe -m ruff check backend
```

### Frontend

```powershell
npm --prefix frontend test -- --watchAll=false
npm --prefix frontend run build
```

### Load test

```powershell
pip install -r loadtests\requirements.txt
locust -f loadtests\locustfile.py
```

## Triển khai

Repository có sẵn [render.yaml](render.yaml) để triển khai hai service:

1. Django API với Gunicorn.
2. React static site với SPA rewrite.

Database production được cấu hình qua `DATABASE_URL`. Các biến bí mật trong `render.yaml` sử dụng `sync: false` và phải nhập trực tiếp trên Render Dashboard.

Xem [hướng dẫn triển khai](docs/DEPLOYMENT.md) để cấu hình Render, PostgreSQL, HTTPS, email và OAuth.

## Tài liệu

- [Hợp đồng API](docs/API_CONTRACTS.md)
- [Hướng dẫn triển khai](docs/DEPLOYMENT.md)
- [Backup và restore](docs/BACKUP_RESTORE.md)
- [Outbox worker](docs/WORKER_OUTBOX.md)
- [Kiểm tra CI/CD](docs/CI_AUDIT.md)
- [Báo cáo audit repository](docs/FULL_REPOSITORY_AUDIT_2026-11-19.md)

## Trạng thái phát triển

- [x] Catalog và storefront React
- [x] JWT, Google OAuth và nền tảng Facebook Login
- [x] Giỏ hàng, checkout và quản lý tồn kho
- [x] Đơn hàng, COD và VNPay Sandbox
- [x] Wishlist, voucher, review và hỏi đáp
- [x] Admin Dashboard và phân quyền nhân viên
- [x] Docker PostgreSQL và Render Blueprint
- [ ] Hoàn thiện cấu hình Facebook App Live
- [ ] Chạy toàn bộ E2E trên môi trường production-like
- [ ] Hoàn tất diễn tập backup/restore production

## Lưu ý bảo mật

- Backend luôn tính lại giá, voucher, phí vận chuyển và tổng tiền.
- Không cho frontend tự chọn `user_id` để truy cập dữ liệu người khác.
- Checkout và tồn kho sử dụng transaction, lock và idempotency key.
- Refresh token được rotate và blacklist theo cấu hình SimpleJWT.
- Không lưu hoặc ghi log password, token và khóa bí mật.

---

<div align="center">

**NEXA GEAR — Elevate Your Play**

</div>
