# Functional test report

Date: 2026-11-13.

## Environment

- Windows development host.
- PostgreSQL 17 in Docker, healthy and bound to loopback only.
- Python runtime uses Django 6.1.2, DRF 3.18.3.
- React Create React App project.

## Commands and actual results

| Command | Result |
|---|---|
| `docker compose ps` | PostgreSQL container healthy. |
| `python manage.py check` | 0 issues. |
| `python manage.py check --deploy` with production environment flags | 0 issues. |
| `python -m pip check` | No broken requirements. |
| `python manage.py test` | 51 tests passed in 40.357 seconds after inventory idempotency, Django Admin protection and Admin Products API changes. |
| `npm test -- --watchAll=false` | 1 test passed. |
| `npm run build` | Build succeeded; 10 React hook dependency warnings remain. |
| `npm audit --omit=dev` after React Router patch update | 0 Critical, 15 High, 7 Moderate, 16 Low; CRA transitive debt remains. |

## Concurrency evidence

- Two concurrent calls with one user and one checkout key produced one order. Results were one `created` and one `replayed`; inventory was reserved once.
- Twenty concurrent users each attempted to buy one unit while only five were available. Exactly five orders were created, `on_hand` stayed 5, and `reserved` ended at 5.
- Two concurrent inventory adjustments with one event key changed stock exactly once; one response created the movement and one replayed it.
- Reusing an inventory event key with a different payload returned `409` without a second stock change.

## Admin Products evidence

- Customer access to `/api/admin/products/` returns `403`.
- A superuser can list/filter, create and update products and create variants/image metadata.
- Product status changes and Admin catalog mutations write audit records.

These are data-integrity regression tests, not a throughput benchmark and not proof of supporting 100 concurrent users.

## Remaining verification

- Playwright route and visual tests at all requested viewports/themes.
- Complete Admin functional flows after missing endpoints are implemented.
- Cross-account IDOR matrix beyond addresses/orders currently covered.
- Dependency vulnerability audit and secret-history scan.
- Reproducible 10/25/50/100/150-user load test and 30-minute soak at 100 users.
