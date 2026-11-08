# Configuration and migration 0014 review

8 November 2026. Prepared from the actual repository and read-only hosted probes. No production setting, database schema, Auth provider or payment mode was changed. Migration0014 is **not approved for execution** by this report.

## OIDC: existing Supabase identity, not another login system

FastAPI `services/api/src/glam_api/config.py` uses the `GLAM_` prefix and requires all three fields together. `auth.py` verifies RS256/ES256 signatures and validates issuer, audience, expiry, issued-at and subject.

| Runtime variable | Expected production value | Component / setting location |
| --- | --- | --- |
| `GLAM_OIDC_ISSUER` | `https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1` | FastAPI service environment in Railway, if that service is actually deployed |
| `GLAM_OIDC_AUDIENCE` | `authenticated` for normal Supabase user access tokens | Same FastAPI service; confirm actual JWT audience |
| `GLAM_OIDC_JWKS_URL` | `https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1/.well-known/jwks.json` | Same FastAPI service |

All three names are present in this Codex environment; that does not establish their values in Railway. The actual public JWKS returned200 with one ES256 key, compatible with the verifier. A successful real user JWT verification was not performed.

These settings validate Supabase-issued customer tokens. They are not GitHub/Railway CI authentication and do not require adding an OIDC client secret or a second identity provider. Google/Apple/Facebook provider client IDs, secrets and callbacks belong in original-project Supabase Authentication. Twilio belongs in its SMS provider configuration. Public web/native Supabase API keys belong in the respective client build settings; privileged keys never belong there. The Edge Function uses Supabase user JWT/RPC authority separately from FastAPI's environment variables.

## CORS: two independent service settings

FastAPI `main.py` reads `GLAM_ALLOWED_ORIGINS` through `deployment.cors_origins`. Supabase Edge `index.ts` independently reads the same name from Edge secrets. Setting it on Railway does not set it in Supabase.

The exact format is a comma-separated string of origins: HTTPS scheme and host, no trailing slash, URL path, query or credentials. FastAPI disallows `*` and allows no cookies. Edge validates its allowlist independently. A proposed value for currently requested browser callers is:

```
https://www.glam.beauty,https://glam.beauty,https://glamit-web-production.up.railway.app
```

Preserve any still-required legacy browser origin during the reviewed transition; do not replace the existing list blindly. `https://api.glam.beauty` is an API destination, not automatically a browser origin that needs adding. Add it only if an actual browser application is hosted there. No new API service, domain or DNS switch is authorized by this review.

Fresh actual Edge results at14:09 SAST are recorded in [value-safe evidence](evidence/configuration-readonly.json):

| Origin | OPTIONS | GET without user session |
| --- | --- | --- |
| www.glam.beauty |403|403|
| glam.beauty |403|403|
| existing Railway website |403|403|
| www.glamit.beauty |204, matching allow-origin|401, matching allow-origin|
| untrusted.example |403|403|

This demonstrates an actual current allowlist mismatch, not a successful connection. The allowed legacy request correctly remains unauthorized without a user token. There is no valid authenticated-success claim. Local CORS/security regressions pass; actual production configuration and valid-user requests require a reviewed service configuration change and a consented test session. No such settings change was executed in this turn. Browser CORS does not replace JWT/RLS authorization; native clients do not establish browser-origin trust.

## Exact migration 0014 for separate review

- Canonical Python revision: [0014_creator_studio.py](../../db/migrations/versions/0014_creator_studio.py); predecessor `0013_passwordless_accounts`.
- Complete canonical SQL: [0014_creator_studio.sql](../../db/migrations/versions/0014_creator_studio.sql).
- Exact incremental deployment SQL: [0014_application.sql](../../db/migrations/releases/0014_application.sql).
- [Checksum/source manifest](../../db/migrations/releases/0014_application.manifest.json). Deployment artifact SHA256: `0f5fde1f8915739e1bb3bf2a667025bf0de17f7022e592077551666a13f730eb`.
- The Stripe test-only sibling remains excluded. Existing migration files and production financial records are unchanged.

It adds14 public tables:

```
creator_profiles
connected_social_accounts
social_media_items
creator_collections
creator_collection_items
creator_campaign_briefs
creator_campaign_applications
creator_campaign_deliverables
creator_referrals
creator_attribution_events
creator_commission_agreements
creator_earnings
creator_payout_eligibility
creator_social_sync_logs
```

It also adds `creator_private.social_credentials`, with no client or service-role grants; `creator_private` is not an exposed public schema. All15 new tables enable RLS. The14 public tables grant authenticated SELECT only and use14 scoped SELECT policies. No direct client writes are granted. Access combines own identity or active organization membership, unexpired verified creator capability, adult eligibility and scoped roles. New foreign keys, checks and unique constraints cover ownership, source provider, revisions and content relationships; two explicit secondary indexes cover creator organization and campaign organization (primary/unique constraints also create indexes).

Functions added: `glam_private.creator_access`, `glam_private.creator_append_only`, `glam_private.creator_url` and a new public `glam_api_v1` dispatcher. The migration renames/moves the existing dispatcher to `glam_private.glam_account_api_v1` and forwards existing non-creator calls to it. Two triggers make creator earnings and attribution events append-only. The RPC derives ownership and rejects unapproved fields. Provider OAuth, publication, earnings and payouts are not activated by these tables. No default creator commission is introduced; the existing10% physical-product commission is unchanged.

Risks and compatibility: there are no migration-time DROP/TRUNCATE operations or deletion/backfill of existing rows. Nevertheless, dispatcher rename/schema/permission changes are material compatibility and locking risks. Local existing-account RPC tests cover forwarding, but compatibility with the actually deployed clients is not yet a production pass. DDL is transactional; requests may briefly wait for locks. Zero downtime is not guaranteed; use an approved maintenance window and observe lock/statement timeouts and failures.

Tests: fresh isolated PostgreSQL run of `test_creator_studio.py`, `test_creator_security.py` and `test_deployment_runtime.py`: **26 passed**, one upstream deprecation warning. Tests cover tenant/owner isolation, revoked sessions, forbidden direct writes, invalid fields/rights, unavailable provider/publication paths, encryption binding/tampering and CORS rejection. Earlier clean base and exact0013→0014 replay are documented in [Creator Studio evidence](../creator-studio/IMPLEMENTATION_REPORT.md). The current targeted tests do not repeat that clean replay and do not prove production deployment.

Recovery and approval requirements:

1. Reinspect actual original production revision, dispatcher signatures, grants and current data before execution; the last audit observed0013/41 public tables.
2. Confirm a recent COMPLETED recoverable physical backup/PITR point for original project `bkkmsbxrxkqaveymcrgi`. Fresh backup/restore readiness was not verified in this turn. No development project or deleted branch may be recreated.
3. Review the exact artifact checksum, SQL, client compatibility and operational window. Obtain explicit approval for these exact changes. Do not stamp unapplied migrations or substitute Supabase history for canonical Alembic history.
4. Use the existing [guarded deployment tooling](../../scripts/deploy_application_foundation.py) with its original-project, production-authority, backup and checksum checks. Do not bypass a refusal.
5. If execution fails transactionally, rollback the transaction. After committed deployment, automatic Alembic downgrade intentionally refuses. Prefer a separately reviewed forward repair that preserves new records. A whole-project PITR restore can lose writes after its recovery point and requires explicit impact review and authorization. Never use DROP or a database reset as an improvised rollback.
6. Verify all new tables/policies, dispatcher forwarding, old and new authenticated client flows, and actual data/queryability. Record execution IDs and final schema state before marking deployment complete.

## Remaining blockers

OIDC code and a compatible public JWKS exist; actual hosted runtime values and real session verification remain unqualified. CORS rejection is demonstrated and still unresolved in production. Migration0014 has a precise review artifact and local tests, but fresh recovery readiness and explicit approval remain pending. Logos require downloadable original artwork. None of these review documents proves AI, marketplace, financial, native-device or public-launch acceptance.
