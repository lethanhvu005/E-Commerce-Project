# Load test report

Status: workload implemented, benchmark not yet executed.

`loadtests/locustfile.py` implements the requested target mix (45/20/15/10/5/5) against real API endpoints. Authenticated scenarios require a test-only JSON credentials file through `LOAD_TEST_ACCOUNTS_FILE`. Credentials must not be committed.

## Reproducible command

```powershell
python -m pip install -r loadtests/requirements.txt
$env:LOAD_TEST_ACCOUNTS_FILE = "C:\secure\commerceos-load-users.json"
locust -f loadtests/locustfile.py --host http://127.0.0.1:8000
```

Run 10, 25, 50, 100 and 150 users in stages. Hold 100 users for 30 minutes. Use only a disposable test database with sufficient accounts, addresses, active products, variants and inventory.

## Results

No latency/RPS/CPU/RAM/DB-connection result is recorded because the staged benchmark has not been run on a defined production-like configuration. Therefore the project does **not** currently claim support for 100 concurrent users.

The separate database concurrency regression test did pass for 20 buyers competing for five units; that verifies the tested inventory invariant, not system capacity.
