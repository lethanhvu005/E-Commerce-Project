# Production checklist

The system is not yet approved for production. Complete and verify every unchecked item on the actual hosting plan.

## Configuration

- [x] Settings read `DEBUG`, secret, hosts, CORS, CSRF and HTTPS controls from environment.
- [x] Production startup fails without `DJANGO_SECRET_KEY` or `DJANGO_ALLOWED_HOSTS`.
- [x] `python manage.py check --deploy` can pass with a complete production environment.
- [ ] Rotate any credential that has ever been committed publicly.
- [ ] Configure the exact frontend origin; do not use wildcard CORS with credentials.
- [ ] Enable HSTS only after HTTPS works end-to-end and subdomain/preload consequences are accepted.

## Application and database

- [ ] Add and test a production WSGI/ASGI server configuration; do not use `runserver`.
- [x] Add an unauthenticated, non-sensitive database health endpoint at `GET /api/health/`.
- [ ] Size worker count from actual CPU/RAM and load results.
- [ ] Verify PostgreSQL connection limits and introduce pooling only if measurements justify it.
- [ ] Define backup frequency, retention and a tested restore procedure.
- [ ] Run migrations as a controlled release step and document rollback compatibility.
- [ ] Store uploaded media in durable object storage; do not rely on an ephemeral container filesystem.

## Security and operations

- [ ] Configure CSP, secure response headers at the edge, structured logging and error tracking.
- [ ] Ensure logs never record Authorization headers, tokens, passwords or database secrets.
- [ ] Use a shared throttle cache across multiple workers if throttles are part of abuse controls.
- [ ] Add monitoring for 5xx rate, latency, worker memory, DB connections, slow queries and lock waits.
- [ ] Verify graceful shutdown and rollback on the chosen host.

## Acceptance

- [ ] All Critical/High audit findings closed or formally accepted.
- [ ] Complete Admin uses real APIs with permission tests.
- [ ] UI parity report has screenshots for four viewports and both themes.
- [ ] 100-user, 30-minute load test meets the stated latency/error/data-integrity targets on the actual hosting configuration.
- [ ] No load or destructive tests run against production data.
