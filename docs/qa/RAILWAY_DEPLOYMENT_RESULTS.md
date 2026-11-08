# Actual deployed evidence

**NO-GO.** Current local candidate evidence is distinct from actual deployed/service/device evidence. No production deployment, migration, account creation, messages or financial mutation was performed by this audit.

[Control inventory](COMPLETE_CONTROL_INVENTORY.csv) · [Results](CONTROL_CLICKTHROUGH_RESULTS.csv) · [Feature matrix](../audit/GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Evidence summary](evidence/qa-summary.json).

Observed deployed SHA `ff62f6403e9b44202792bf033bdea0e57587c217` at `2026-11-08T07:08:36.124Z` via [authorized CI](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42457519183).

| Endpoint | HTTP | State |
| --- | --- | --- |
| /api/health/live | 200 | alive |
| /api/health/ready | 200 | ready |
| /health/live | 404 | None |
| /health/ready | 404 | None |

The web readiness endpoint now returns200 with scope web_build_configuration; this supersedes the earlier503 observation. It does not prove API/provider/database readiness. The separate /health API paths return404. Of86 anonymous route responses,78 are200 and the eight responses for the four new entry paths (desktop/mobile) are404. The current deployed business/admin DOM still has one role picker and one tools navigation each, with zero sign-in or registration entries. New private-entry code is not deployed. Provider config/CORS, actual Railway logs/settings and rollback remain unverified. No service, domain or source setting was changed by this audit.

| Route | Role picker | Tools nav | Sign in | Register |
| --- | --- | --- | --- | --- |
| /business | 1 | 1 | 0 | 0 |
| /admin | 1 | 1 | 0 | 0 |
