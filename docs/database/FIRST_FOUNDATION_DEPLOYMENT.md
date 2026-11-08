# Production foundation deployment

## Only authorized target

Supabase project `bkkmsbxrxkqaveymcrgi`, default `main` (PRODUCTION). The user explicitly authorized non-destructive production schema deployment on 7 November 2026. No development branch or second project may be recreated. Earlier development-branch attempts are retained as [historical evidence](history/2026-11-07-development-attempt.md); they are not active deployment configuration.

## Verified preconditions

The actual production SELECT returned zero public tables, zero Auth users, zero storage objects, no Alembic version table, and postgres CREATE permission. Management API confirms main is the default branch of the exact original project. Supabase backup API confirms completed physical backup 2189281988, 7 November 2026 at 02:07:35.793 UTC. The deployment runner independently rechecks a recent completed physical recovery point before executing anything. PITR is disabled; no restore rehearsal is claimed.

## Canonical schema and validation

Application continuation 0010 branches from existing 0008 in the same Alembic graph. Unchanged sandbox 0009 is a separate test-only sibling, excluded from application@head; no revision is skipped/stamped as applied. The generated SQL contains canonical prerequisites and the ten requested foundation entities: 38 public tables total including Alembic version metadata. Existing organization/member tables are renamed, not duplicated. Products share the existing catalog listing authority. Profiles reference real Supabase auth.users; the local Auth fixture is never deployed. No customers, merchants, products, financial transactions or live payments are seeded.

The application SQL source is committed, checksummed, executed on an empty local build DB and independently replayed from the exact exported SQL on a second fresh local DB. Organization-query references and readiness checks are reconciled without changing HTTP contracts or financial/authentication rules. Local real PostgreSQL tests cover ownership, cross-org access, membership revocation, forbidden self-promotion/verification, FK integrity and anonymous category limits. Existing browser and approved visual regressions pass.

## Explicit operator commands

```sh
uv run --frozen python scripts/deploy_application_foundation.py \
  --project-ref bkkmsbxrxkqaveymcrgi --apply --production-approved \
  --report /tmp/production-foundation-result.json

uv run --frozen python scripts/deploy_application_foundation.py \
  --project-ref bkkmsbxrxkqaveymcrgi --report /tmp/production-foundation-verification.json
```

The runner refuses any other project, unexpected branch, missing explicit production approval, changed checksums, missing completed recovery point, or existing public schema/user/object data during first deployment. SQL is transactional and not automatically retried; verify unknown outcomes before any repeat. It never resets/drops customer data, restores a project or activates payments.

## Scope still to verify

Actual deployment evidence and complete table/security/constraint lists must be recorded after successful execution. A production app runtime DSN and least-privileged role remain separate from the administrative Management API token. Do not use that token as a per-request application DB adapter. Later schema batches and unimplemented business workflows are not declared complete by this foundation.

## Confirmed execution

Production deployment and independent schema verification succeeded. See [actual results and table list](PRODUCTION_DEPLOYMENT_RESULTS.md). Alembic head0010,38 public tables, all ten requested entities, validated FKs and matching RLS/index/constraint metadata. No remaining-domain or application-wiring completion is claimed.
