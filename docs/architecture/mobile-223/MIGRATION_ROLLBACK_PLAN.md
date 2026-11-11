# Preservation and rollback plan — proposed,not executed

Phase0 introduces documents/registries/evidence only. No apps,dependencies,contracts,API implementations,migration sources,CI/deployment settings or production records change. Source baseline is97e3e7570c3da9d7ca5b8622ea044c3677040f33. A documentation commit can be reverted without application/data rollback.

## Repository and mobile organization

1. After plan/design approval,create isolated reviewed changes against a reconciled branch. Confirm the current default/release/deployed SHA independently; the audited branch diverges from the default and includes stacked billing/referral work.
2. Preserve apps/mobile and apps/flutter_app and historical native receipts. Verify durable backup retention first: local backup/flutter-rejected-2026-11-10 exists; its name is absent from the remote inventory. Do not delete branches or fabricate a remote-backup pass.
3. Prefer organizing app/router,core and features inside apps/glam_mobile. Capture hashes of current capture/session/controller/contracts and baseline tests before any extraction. Move one boundary at a time; keep imports/generated native bootstrap/CI artifact paths coherent.
4. If a physical rename is later justified,review npm workspace globs,Flutter bootstrap/actions,Android/iOS identifiers,assets,deep links,build locks and test runners together. Never overwrite the existing Expo apps/mobile directory.
5. Rollback of an unshipped extraction/router change is a reviewed source revert or feature-flag rollback to the recorded known package. Do not reset the database or remove user photos to recover a UI release. Avoid force-pushes and preserve independently built native artifacts.

## Canonical data and future additive schemas

- Keep db/migrations as the only Alembic authority. Do not copy histories into supabase/migrations or initialize another ORM. Production is0017 with59 public tables;0018 consumer referrals is a candidate,not an applied migration.
- Before designing a missing domain,inspect current tables/functions/permissions and reuse identity,look/analysis/Passport,catalog/credit/org/financial authorities. Schema design follows approved requests/authorization/retention and tests,not the names in a logical architecture drawing.
- Prepare exact SQL/manifests,local PostgreSQL replay and regression/cross-owner/idempotency tests for every candidate. Inspect actual deployed head/drift and confirm a recent recoverable backup. Obtain the separate production approval with the concrete SQL and non-destructive plan.
- Execute approved migrations once,transactionally with guards/timeouts. For unknown outcomes,verify actual state before retry. Never stamp unapplied revisions,drop valuable data,restore deleted development branches or run destructive/payment fixtures against production.
- Rollback for populated financial/private records is an approved compensating/forward change. Empty-only downgrade is not safe once data exists. Freeze affected writes and preserve evidence; a backup restoration requires separately approved recovery coordination and data-loss assessment.

## Shared API and clients

Version additive contract changes;keep current React and Flutter callers compatible until both are released. Verify response serialization/expiry/owner behavior across Dart,TypeScript,FastAPI and overlapping Edge RPCs. Keep runtime credentials server-only and publishable client settings separate. Do not introduce a mobile-specific user or financial database.

Rollback uses the last qualified API/client combination with explicit supported schema versions. A successful /health/live or table SELECT does not establish end-to-end readiness. Native interrupted jobs need stable server IDs/idempotency and fresh-session recovery,not duplicate dispatch.

## Financial,provider and release limits

The approved pricing/referral/10% rules remain server-authoritative. No activation of Stripe live mode,native digital purchases,merchant payouts,provider spend or referral redemption is authorized by this plan. Use isolated test services and actual reconciliation evidence before the relevant approval.

Preserve the current healthy deployment while release candidates build. No Railway source/builder/domain change,merge or public rollout is performed in Phase0. Require served-SHA evidence,rollback artifact,monitoring and independent real-device verification before a later approved launch. Store URLs must remain truthful while unpublished.
