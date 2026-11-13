# Concurrency test report

Date: 2026-11-13

## Executed

Command:

```powershell
..\.venv\Scripts\python.exe manage.py test inventory operations orders
```

Result: **15 tests passed** on the configured PostgreSQL test database.

Covered cases include:

- Same checkout key replay under concurrency creates one order.
- Twenty buyers competing for five units create exactly five orders and do not oversell.
- Same inventory adjustment event key submitted twice changes stock once.
- Same inventory adjustment event key submitted concurrently changes stock once.
- Reusing an event key with different payload returns HTTP `409` and does not change stock again.
- Two different staff adjustments for the same variant are serialized without a lost update; both movements are retained and final stock equals both deltas.
- Cancelling an order releases its active reservation.

## Not yet covered

- Simulated client disconnect after database commit.
- Two concurrent cancellation/state-transition requests for one order.
- Voucher usage-limit contention.
- 30-minute, 100-user load test. No performance result is claimed yet.
