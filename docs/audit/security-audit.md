# Security audit

Status: in progress (2026-11-13).

## Confirmed fixes

- Production secret, debug mode, allowed hosts, trusted origins and HTTPS-related controls are environment-driven.
- Production startup fails when secret or allowed hosts are missing.
- CORS uses an explicit allow-list rather than `*`.
- Login and registration use separate scoped throttles.
- Registration rejects privilege fields and creates users through `create_user()`.
- Logout verifies refresh-token ownership and blacklists the token.
- Customer address and order queries are scoped to `request.user`.
- Existing inventory and audit admin APIs require both staff status and the relevant Django permission.
- React production source contains no `dangerouslySetInnerHTML` usage.

## Remaining security work

- Add cross-account IDOR tests for every customer-owned resource.
- Add negative RBAC tests for every new and existing admin endpoint.
- Validate and constrain future image uploads by MIME content, size and object key; upload endpoints do not yet exist.
- Add a deployment CSP compatible with the final asset set.
- Use a shared cache (for example Redis) before relying on DRF throttles across multiple workers; throttling is not DDoS protection.
- Run dependency audits and secret scanning and record the exact output.
- Review secret history outside the working tree. No secret value is reproduced in this report.

## Dependency audit evidence

- `npm audit --omit=dev` initially reported 39 findings: 0 Critical, 18 High, 5 Moderate and 16 Low.
- React Router was upgraded within major version 6 from 6.30.1 to 6.30.4. Tests and production build still pass.
- The follow-up audit reports 38 findings: 0 Critical, 15 High, 7 Moderate and 16 Low.
- Most remaining findings are transitive dependencies in the deprecated Create React App / `react-scripts` toolchain. They are not silently force-upgraded because `npm audit fix --force` proposes breaking toolchain changes. Replacing the toolchain requires a separately tested migration and is still a High open item.

## Production environment contract

Required:

- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY=<long random secret>`
- `DJANGO_ALLOWED_HOSTS=<comma-separated hosts>`
- `POSTGRES_PASSWORD=<secret>`

Deployment-specific:

- `DJANGO_CORS_ALLOWED_ORIGINS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `DJANGO_SECURE_SSL_REDIRECT=True`
- `DJANGO_SESSION_COOKIE_SECURE=True`
- `DJANGO_CSRF_COOKIE_SECURE=True`
- `DJANGO_SECURE_HSTS_SECONDS=31536000` only after HTTPS is verified end-to-end
- `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS` and `DJANGO_SECURE_HSTS_PRELOAD` only when their operational requirements are understood

The local `.env` is ignored by Git. If any credential was previously committed publicly, it must be rotated; deleting it from the current file is not sufficient.
