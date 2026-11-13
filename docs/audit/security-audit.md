# Security audit progress

Date: 2026-11-13

## Fixed in this work group

- Inventory idempotency keys now bind to variant, delta, reason and actor; conflicting reuse returns `409`.
- React keeps the same event key across retries for one stock adjustment.
- Order, order item/address/history, payment, inventory balance/reservation/movement, voucher redemption, audit log and outbox records are read-only in Django Admin.
- Automated tests verify even a superuser cannot add/change/delete those operational records through ModelAdmin.
- Production secret, debug mode, allowed hosts, trusted origins and HTTPS-related controls are environment-driven.
- Production startup fails when the secret or allowed hosts are missing.
- CORS uses an explicit allow-list rather than `*`.
- Registration rejects privilege fields and creates users through `create_user()`.
- Logout verifies refresh-token ownership and blacklists the token.
- Customer address and order queries are scoped to `request.user`.

## Still to audit

- `manage.py check --deploy` against a production environment configuration.
- Authentication throttling and JWT lifetime policy.
- Upload validation once Admin product image upload API is implemented.
- Admin module-level permissions in React and each new Admin endpoint.
- Complete IDOR/BOLA matrix for every owner-scoped API.
- Add negative RBAC tests for every new Admin endpoint.
- Add a deployment CSP compatible with the final asset set.
- Use a shared cache before relying on DRF throttles across multiple workers.

## Deployment check evidence

`python manage.py check --deploy` was run with the local development environment and correctly reported five warnings: HSTS disabled, SSL redirect disabled, session cookie not secure, CSRF cookie not secure, and DEBUG enabled. This local configuration is not production-ready.

Production environment must provide:

- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY=<long random secret>`
- `DJANGO_ALLOWED_HOSTS=<comma-separated hosts>`
- `POSTGRES_PASSWORD=<secret>`
- trusted CORS/CSRF origins
- secure-cookie and HTTPS settings
- HSTS only after HTTPS is verified end-to-end

## Dependency audit evidence retained from the previous audit

- The last recorded `npm audit --omit=dev` result contained 38 findings: 0 Critical, 15 High, 7 Moderate and 16 Low.
- Most remaining findings are transitive dependencies in Create React App / `react-scripts`; no breaking `npm audit fix --force` was applied.
- Dependency and secret scanning must be rerun before a production release.
