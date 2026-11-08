# Actual deployed evidence

**NO-GO.** Current local candidate evidence is distinct from actual deployed/service/device evidence. No production deployment, migration, account creation, messages or financial mutation was performed by this audit.

[Control inventory](COMPLETE_CONTROL_INVENTORY.csv) · [Results](CONTROL_CLICKTHROUGH_RESULTS.csv) · [Feature matrix](../audit/GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Evidence summary](evidence/qa-summary.json).

Observed deployed SHA `ff62f6403e9b44202792bf033bdea0e57587c217` at `2026-11-08T05:46:30.998Z` via [authorized CI](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42452036311).

| Endpoint | HTTP | State |
| --- | --- | --- |
| /api/health/live | 200 | alive |
| /api/health/ready | 503 | not_configured |
| /health/live | 404 | None |
| /health/ready | 404 | None |

The existing site is reachable through CI; this workspace proxy still denies direct access. Readiness503 is a real configuration failure; proxy tunnel denial is a runner-access problem, not evidence all routes are broken. New business access code is not deployed. Provider config/CORS/actual Railway logs/settings/rollback remain blocked. New read-only probes include candidate entry routes and anonymous role-picker/sign-in visibility; receipt scope is exact. No service/domain/source setting changed.
