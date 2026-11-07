# Database pre-migration audit — Phase 0

> Historical Phase 0 snapshot. Management SQL access and a development branch are now verified; see [first foundation execution](FIRST_FOUNDATION_DEPLOYMENT.md) for the current migration path and actual deployment evidence.

6 November 2026, Africa/Johannesburg. **Remote migration decision: BLOCKED. No schema/storage/data mutation was performed.** The connected API is not evidence of SQL migration permissions.

## Repository and integration target

Canonical architecture is FastAPI + SQLAlchemy/psycopg, PostgreSQL, Alembic `db/migrations`, generated OpenAPI and shared web/Expo contracts. No Prisma schema or competing Supabase migration directory was found. Main is `feat/platform-foundations` at `d03f6d45a8ffb99a26fd1a5a7df6c51689185ffb`. Dedicated implementation branch `feat/supabase-database-foundation` starts from `9b9286194cd40c7e0405481d1a46da1e61e54c6a`, contains current main by ancestry, and depends on unmerged consolidation [PR #10](https://github.com/Unparalleled-Media-1/Glamit/pull/10). PR #10 is draft; backend/clients CI succeed, no approving review is recorded; branch protection inspection returns 403. Being mergeable does not satisfy approval.

All current refs were fetched and inventoried in [branch snapshot](evidence/branch-snapshot.json); every original application branch is included in the proposed consolidation, while gh-pages remains separate publishing history. No force push, history overwrite or branch deletion occurred. Original pre-Supabase full feature/branch audit is retained in `docs/audits/pre-supabase`.

## Canonical schema inventory

Nine Alembic revisions (0001–0009), plus SQL source read by0001; **41 literal CREATE TABLE definitions**. Alembic's own version table and dynamic statements require catalog verification; source regex count is not a complete deployed inventory. Existing normalized user/org/consent/credit/look/catalog structures must be extended rather than duplicated. No alternate password database. [File hashes and table definitions](evidence/canonical-migration-manifest.json).

Known conflicts: 0009 intentionally refuses non-\_test database names; current application setup/`upgrade head` cannot target standard hosted `postgres`. Existing look_revision components and catalog facts use versioned JSON contracts; wholesale normalization must preserve those contracts. Foundation app_user identity is issuer+subject, not assumed equal to auth.uid(). Direct client owner policies cannot simply compare the wrong IDs. Current API uses server SQLAlchemy queries, not a Supabase service-key REST adapter.

## Actual selected project observations

Project `bkkmsbxrxkqaveymcrgi` was selected by the user for the development task. Its deployment tier, organization and presence of valuable private/Auth data are **not independently established**. No production classification is asserted. Read-only API checks succeeded: Auth settings; service-key GET PostgREST OpenAPI; service-key GET storage bucket metadata. Observed **0 API-exposed tables**, **0 storage buckets**, exposed RPC name `rls_auto_enable`. No RPC was invoked and no user rows were fetched. Zero API-visible tables is not proof of an empty database; auth/storage/internal/private schemas/functions/policies can exist. [Actual sanitized remote inventory](evidence/remote-inventory.json).

## Permissions, drift and backup

SUPABASE_URL/public/service-role keys are configured securely, but no dedicated migration DSN/password or Management API access token is present. API service-role privileges do **not** provide DDL or SQL catalog access. No project table/function/policy/index/extension inventory, Alembic version/drift check, DDL privilege check or full schema/data backup can yet be completed. The earlier exposed password was not reused and its rotation remains unverified. No connection pool/SQL permissions are guessed.

A secure `SUPABASE_ACCESS_TOKEN` requirement and exact `api.supabase.com` destination have been saved in the environment draft for SQL catalog/migration authorization checks; token values must be entered through secure settings and runtime application verified. Alternatively an approved dedicated migration DSN would require verified TLS and appropriate TCP networking. Neither route has been used. Do not point the normal runtime GLAM_DATABASE_URL at the remote project before audit approval.

## Phase 0 outcomes

Repository/migration/persistent-feature inventory: PASS within source scope. Remote API metadata: PARTIAL. Full schema/data inventory, environment classification, migration privileges, backup/drift, reviewed consolidation: BLOCKED. Consequently no new table, policy, bucket or application connection has been created. Before applying anything, finish those checks and stop for specific approval if production or valuable data is discovered. Remaining reports are proposals/status reports, not deployed SQL or completion claims.

## Disposable local catalog verification

Read-only SQL catalog inspection of local `glam_test` confirms 42 public tables (including alembic_version), 49 foreign keys, and RLS enabled on all 42 tables. Local head is `0009_stripe_test_ledger`. [Catalog evidence](evidence/local-catalog.json). This is a local baseline, not hosted-project introspection or proof that RLS policies isolate future user/org records.
