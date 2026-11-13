# CommerceOS / NEXA system audit

Audit started: 2026-11-13. This is a living report: only findings backed by source inspection or executed checks are marked verified.

| Module | File | Vấn đề | Mức độ | Ảnh hưởng | Cách khắc phục | Trạng thái |
|---|---|---|---|---|---|---|
| Production settings | `backend/backend/settings.py` | `SECRET_KEY`, `DEBUG` and hosts were hardcoded for development; `check --deploy` produced 7 warnings. | High | Unsafe or broken production deployment. | Read secrets/hosts/security flags from environment; fail closed in production; configure security headers. | Fixed; `check --deploy` now reports 0 issues with production env. |
| CORS | `backend/backend/settings.py`, `backend/requirements.txt` | React and API can run on different origins but no CORS middleware was installed. | High | Browser blocks API requests or operators weaken CORS externally. | Add `django-cors-headers`; allow only configured origins. | Fixed. |
| Dependency reproducibility | `backend/requirements.txt` | Django 4.2.30 was pinned with DRF 3.18.3, whose resolver requires Django >=5.2; clean install failed. | High | A new environment cannot be installed deterministically. | Align Django pin with the tested installed runtime and run `pip check`. | Fixed; Django 6.1.2 + DRF 3.18.3, `pip check` clean. |
| Authentication throttling | `backend/accounts/views.py` | Login shared a broad anonymous throttle; registration had no endpoint-specific throttle. | High | Credential stuffing and account creation abuse are easier. | Add scoped login/register throttles with environment-configurable rates. | Fixed; regression tests pending final run. |
| Checkout idempotency | `backend/orders/services.py` | Existing-order lookup occurred before any lock, so concurrent retries with one checkout key could race into the unique constraint and return 500. | High | Bad retry behavior and possible failed checkout UX under concurrency. | Lock the user row at transaction start, then perform idempotency check and cart lock. | Fixed; concurrent same-key regression test passed. |
| Checkout totals | `backend/orders/services.py` | Totals are recomputed from cart, current variant prices, voucher and shipping; client `grand_total` is not trusted. | Low | Positive security control. | Keep server authoritative; add regression coverage. | Verified by existing test. |
| Customer object access | accounts/orders/cart/wishlist views | Customer objects are filtered by `request.user`; cross-account address test exists. | Low | Positive IDOR control, but full matrix is incomplete. | Add cross-account tests for order/cart/wishlist/payment. | In progress. |
| Admin RBAC | `backend/inventory/views.py`, `backend/operations/views.py` | Existing admin APIs check both `is_staff` and model permission. Most requested admin modules/endpoints do not exist yet. | High | React Admin cannot safely perform complete CRUD. | Add permission-scoped FBV endpoints and negative permission tests without duplicating existing APIs. | Open. |
| Admin dashboard | `frontend/src/pages/AdminDashboardPage.js` | Dashboard derived totals by combining customer/product APIs instead of using a dedicated aggregate API. | High | Counts and revenue could be incomplete or wrong due to pagination and customer scoping. | Implement permission-scoped aggregate endpoint with explicit revenue definition. | Fixed for aggregate API; broader Admin modules remain open. |
| Pagination | inventory movements / audit logs | APIs return a fixed slice of 100 rather than a paginated contract. | Medium | Records beyond 100 are inaccessible and metadata is absent. | Use DRF pagination and update API docs/client. | Open. |
| Token storage | `frontend/src/api/client.js` | JWT is stored in `sessionStorage`. | Medium | Any successful XSS can read tokens. | Keep current contract for now; eliminate injection sinks and add CSP in deployment. Consider HttpOnly refresh cookie only as a coordinated architecture change. | Accepted risk / mitigation open. |
| User HTML injection | React source | No `dangerouslySetInnerHTML` found in production React source. | Low | Reduces stored-XSS exposure for review/Q&A text. | Preserve React text rendering; add regression tests. | Verified by source scan. |
| Frontend parity | `frontend/`, `frontend_html/` | React reuses the visual language but no current four-viewport, two-theme screenshot comparison has been executed. | Medium | Pixel parity cannot be claimed. | Run Playwright screenshots and document measured differences. | Open. |
| Load capacity | whole stack | No reproducible 10/25/50/100/150-user benchmark report exists. | High | 100-concurrent-user capability is unproven. | Add a test-only dataset and Locust/k6 workload; record host CPU/RAM/DB limits and real metrics. | Open; no capacity claim made. |
| Production server | deployment config | No verified Gunicorn/production container configuration was found in the initial pass. | High | `runserver` is unsuitable for production. | Add production application server and health check after backend security/data work. | Open. |

## Executed baseline evidence

- `docker compose ps`: PostgreSQL 17 container healthy and bound to `127.0.0.1:5432`.
- `python manage.py check`: 0 issues.
- Baseline backend suite before changes: 40 tests passed.
- Initial `python manage.py check --deploy`: 7 security warnings.
- After settings hardening, production-mode `python manage.py check --deploy`: 0 issues.
- Initial clean dependency resolution failed because Django/DRF pins conflicted.
- After aligning the pins and installing CORS support: `pip check` reports no broken requirements.
- Full backend suite after P0 changes: 44 tests passed.
- Concurrent checkout: 2 same-key requests created one order (one create + one replay).
- Overselling test: 20 concurrent buyers competing for 5 units created exactly 5 orders; `on_hand=5`, `reserved=5`.
- React test: 1/1 passed. Production build succeeded with 10 existing hook dependency warnings.

## Current scope boundary

The audit is not complete and the system is not yet declared production-ready. Admin CRUD, UI parity, full authorization regression coverage, concurrency tests, production hosting checks, and measured load testing remain required.
