# CommerceOS API inventory

Audit date: 2026-11-13. Source commit: `2a772274ed4ed7d8561033e4616310f2552f3776`.

Status legend: **A** implemented and covered by tests; **B** implemented but not consumed by React; **C** incomplete or needs hardening; **D** model/business data exists but no Admin REST API; **E** business module does not exist; **F** complete for its current scope.

| Module | Function | Method / endpoint | Route + view | Serializer / service | React | Tests | Status | Required work |
|---|---|---|---|---|---|---|---|---|
| Common | Health | `GET /api/health/` | `backend.urls.health` | direct response | deployment only | common tests | A | Add dependency health detail only if deployment requires it |
| Accounts | Register/login/refresh/logout | `POST /api/auth/*` | `accounts.urls`, FBV views | account serializers, SimpleJWT | auth pages/client | accounts tests | A | Continue throttle and production review |
| Accounts | Own profile/addresses | `GET/PATCH /api/accounts/me/`, address CRUD | `accounts.views` | `UserSerializer`, `AddressSerializer` | account page | accounts tests | A | Retain owner scoping |
| Catalog | Public catalog | `GET /api/products/`, detail, variants, categories, brands, collections, banners | `catalog.views` | public catalog serializers | storefront | catalog tests | A | No Admin mutations here |
| Catalog Admin | Product management | `GET/POST /api/admin/products/`, `GET/PATCH /api/admin/products/<id>/`, variant/image endpoints | `catalog.views` FBVs | Admin product/variant/image serializers | Admin Products page uses list, create and status update | catalog Admin API tests | A | Add dedicated category/brand/collection mutation APIs and product editor for variants/images |
| Cart | Current user cart | `GET /api/cart/`, item mutations | `carts.views` | cart serializers/services | cart/checkout | cart tests | A | Preserve server-side totals |
| Wishlist | Current user wishlist | `GET/POST/DELETE /api/wishlist/` | `wishlists.views` | wishlist serializers | wishlist page | wishlist tests | A | Owner scoped |
| Community | Customer reviews/Q&A | product review/question/answer endpoints | `community.views` | community serializers | review/product pages | community tests | A | Customer endpoints are not moderation endpoints |
| Community Admin | Moderation | none | none | content models exist | Admin placeholder | none | D | Add approve/reject workflow and permissions |
| Promotions | Customer vouchers/cart voucher | `GET /api/vouchers/`, `POST/DELETE /api/cart/voucher/` | `promotions.views` | voucher serializer | vouchers/cart | promotions tests | A | Customer-facing only |
| Promotions Admin | Voucher CRUD/usage | none | none | `Voucher`, `VoucherRedemption` exist | Admin placeholder | none | D | Add Admin API and validation tests |
| Orders | Shipping/preview/create/list/detail/history/cancel | `/api/shipping-methods/`, `/api/checkout/preview/`, `/api/orders/*` | `orders.views` | serializers + transactional services | checkout/orders | order tests including concurrency | A | Add remaining conflict/cancellation race tests |
| Orders Admin | System-wide order management | none | none | order service/models exist | Admin placeholder | none | D | Add staff list/detail and service-based transitions |
| Payments | Customer order payment view | `GET /api/orders/<id>/payments/` | `payments.views` | `PaymentSerializer` | order detail | payment tests | A | No direct payment mutation API |
| Inventory Admin | Balance/list and adjustment | `GET/POST /api/admin/inventory/` | `inventory.views.inventory` | inventory serializers, row locks, idempotency key | Admin Inventory | inventory API + concurrency tests | F | Monitor timeout/reconciliation UX |
| Inventory Admin | Movements | `GET /api/admin/inventory/movements/` | `inventory.views.movements` | movement serializer | Admin Inventory | inventory tests | A | Add pagination before large datasets |
| Operations Admin | Dashboard | `GET /api/admin/dashboard/` | `operations.views.dashboard` | ORM aggregates | Admin Dashboard | operations tests | A | Analytics time series still missing |
| Operations Admin | Audit log | `GET /api/admin/audit-logs/` | `operations.views.audit_logs` | audit serializer | Admin Inventory | operations tests | A | Add pagination/filter when volume grows |
| Customers Admin | Customer management | none | none | User model exists | Admin placeholder | none | D | Add safe list/detail/activate APIs |
| Analytics Admin | Date-range analytics | none beyond dashboard totals | none | source models exist | Admin shell | none | D | Add aggregate endpoint with explicit revenue rules |
| Support Admin | Ticket system | none | none | no support model | Admin placeholder | none | E | Design ticket model/API before enabling UI |
| Settings Admin | Store settings | none | none | no safe whitelist model | Admin placeholder | none | E | Define a whitelisted store-setting model; never expose environment secrets |

## Verified P0 findings

- Inventory adjustment previously replayed any matching `event_key` without comparing payload and the React page generated a new key for every submit. Fixed on this branch: key claims are concurrency-safe, payload/actor mismatch returns `409`, and React retains one key for one logical operation.
- Checkout already locks the user, active cart and inventory rows, stores a request hash, and has PostgreSQL concurrency tests for same-key replay and overselling.
- Sensitive accounting, inventory, order, payment, redemption and audit records were directly editable through default Django ModelAdmin. They are now registered read-only; business changes must use services/APIs.
