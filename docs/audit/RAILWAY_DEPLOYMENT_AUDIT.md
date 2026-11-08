# Actual Railway deployment audit

08 November 2026 08:04 SAST. **NO-GO. Audit plus one tested P0 candidate repair; no agent-initiated production deployment, schema write, login message or financial mutation.**

[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Fresh remote metadata](evidence/remote-readiness.json) · [Production catalog](evidence/production-catalog.json) · [Deployed receipt](evidence/railway-ci-receipt.json).

Fresh read-only [CI run](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42452036311) observed `2026-11-08T05:46:30.998Z`. Served SHA `ff62f6403e9b44202792bf033bdea0e57587c217` matches the newly merged default at observation. Agent did not deploy or change source/domain/service settings.

| Endpoint | HTTP | State |
| --- | --- | --- |
| /api/health/live | 200 | alive |
| /api/health/ready | 503 | not_configured |
| /health/live | 404 | None |
| /health/ready | 404 | None |

78/78 desktop/mobile anonymous route responses succeeded;0/31 qualified business journeys. Route existence does not verify functionality or native parity. No favicon link or logo image was found by the home-page DOM probe. Exact artwork is still only inline; source files were not available in attachments. PR28 is open and not part of the observed deployment.

Readiness checks NEXT_PUBLIC_SUPABASE_ANON_KEY and returns503 not_configured. A tested candidate guard now makes the production Docker build refuse missing public configuration. Local/offline builds remain allowed, and server-role keys remain forbidden. This only prevents another invalid candidate; runtime settings/logs and actual build mechanism are not inspected without RAILWAY_TOKEN.

The Codex managed proxy blocks Railway tunnels and GitHub artifact/log CDN download hosts. External CI is authorized and succeeded; screenshots, trace and full report are retained in its artifact (metadata/hash in evidence/railway-ci-artifacts.json). The receipt was inspected through GitHub annotations; the full artifact was not downloaded or visually reviewed here. Runtime/build logs, restart stability and rollback remain blocked by credentials/access. No new services or domains were created.
