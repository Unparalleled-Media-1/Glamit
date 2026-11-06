# Supabase development connection — API verification first

The user selected project `bkkmsbxrxkqaveymcrgi` in response to the development-project question. Latest request authorizes preparing this development-only connection. It does not authorize production data changes, schema deployment, authentication replacement, live payments or removal of G0 safeguards. The project's production-data classification and earlier password rotation have not been independently verified.

Project dashboard: https://supabase.com/dashboard/project/bkkmsbxrxkqaveymcrgi

## Saved environment draft

| Name                      | Configuration                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| SUPABASE_URL              | Suggested public URL `https://bkkmsbxrxkqaveymcrgi.supabase.co`                                                                       |
| SUPABASE_ANON_KEY         | Configured securely at runtime. The existing variable accepts a public publishable key or legacy anon key; no value is recorded here. |
| GLAM_SUPABASE_ENVIRONMENT | Suggested non-secret value `development`                                                                                              |

The draft preserves previous Stripe requirements and allowed hosts, adding only `bkkmsbxrxkqaveymcrgi.supabase.co` for this check. No DB hostname/TCP grants or service-role secret requirement were added. Only non-secret URL/environment suggestions were supplied. Updated runtime observations report the project URL/public key ready and the exact project host allowed. The explicit read-only API check has now succeeded. The development marker was set for that command; its persistent non-secret setting is suggested in the draft.

The public key is now supplied through secure runtime settings. For persistent probe configuration, review/save the suggested `GLAM_SUPABASE_ENVIRONMENT=development` setting and publish/apply that draft. Never paste keys/passwords into chat or commit `.env`. Do not enter a service-role/secret key in the public-key field. The previously exposed database password still requires rotation/revocation; it is neither reused nor needed for this API check.

## Explicit read-only check

Run from repository root after settings are applied:

```sh
UV_CACHE_DIR=/tmp/glam-uv-cache uv run --frozen python scripts/supabase_readonly_check.py
```

The probe requires the development environment marker and a strict HTTPS Supabase project origin. It makes only `GET /auth/v1/settings`, supplying the public API key in a header. It uses inherited TLS/proxy configuration, rejects redirects through the shared transport, bounds the response and never logs key values, provider bodies or exception details. Service-role JWTs and `sb_secret_` keys are rejected before any request. Legacy JWT role inspection is only a privilege refusal check; server authentication remains authoritative.

`CONNECTED` means only that the project gateway accepted the public key and returned the expected Auth-settings response. It does **not** verify a user login, database tables, schema/RLS correctness, stock, bookings, AI or application connectivity. Separate booleans remain false for database/application/migration/production activation. Missing settings return `NOT CONFIGURED`; failed provider checks return `DEGRADED`; the CLI exits2 for either and0 only for the scoped successful response.

The command never reads a database URL/service-role key, opens a PostgreSQL connection, calls a mutation endpoint, runs Alembic or installs a live SDK in application startup. Existing global Supabase application readiness stays G0-gated. Actual SQL/app integration requires a separately reviewed schema/RLS/migration plan; canonical0009 remains sandbox-only and must not be applied to this project.

## Evidence

- [Current safe status](../audits/pre-supabase/evidence/supabase-readonly-status.json): authenticated read-only API request succeeded; no database/application connection.
- [Probe/adapter tests](../audits/pre-supabase/evidence/supabase-probe-tests.txt): transport doubles, not live connectivity.
- [Full core regression](../audits/pre-supabase/evidence/supabase-core-checks.txt).
- [Production web build](../audits/pre-supabase/evidence/supabase-web-build.txt).

The scoped API connectivity check is now VERIFIED against the selected project. Database/application connectivity, schema/RLS correctness and user login remain unverified. No release baseline, migrations or production changes are authorized by that success.
