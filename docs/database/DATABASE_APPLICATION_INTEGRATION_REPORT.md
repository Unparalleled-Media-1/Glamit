# Database application integration report

**Application is not connected to Supabase data.** Actual verified scope is Auth-settings public-key API connectivity plus administrative PostgREST/storage metadata. Current main/branch state is in [pre-migration audit](DATABASE_PRE_MIGRATION_AUDIT.md).

Existing API repositories use SQLAlchemy/psycopg transactions and typed OpenAPI; consumers use authenticated API contracts. There is no parallel Prisma/Supabase client database layer to replace. Configured Supabase public/service keys do not set Settings.database_url or create schema. No normal application GLAM_DATABASE_URL was changed. Service-role keys remain server-only; no credential or database URL was committed.

Supabase Auth must integrate with canonical app_user issuer/subject through existing verified RS256/ES256 claims and exact issuer/audience/JWKS, not a second password store. Phase 6 login/session and persistence changes wait for Phase 0 completion and reviewed deployed tables. User-approved analysis storage needs consented private media/job/report/correction data and uncertainty; merely persisting a fixture must not make it real analysis.

Planned typed commands retain current contracts for look revisions, routines, organization authorization and catalog drafts. Additive/versioned contracts then cover Passport/history, wardrobe/trips, real variants/stock, carts/suborders, bookings, financial evidence, ads and admin reporting. Independent look component changes use version checks to preserve other choices. Only replace an empty/mock UI state once the underlying authenticated writes/reads and policy tests pass. No existing mock/editorial screen was relabeled operational.

For each batch qualify transaction pooling/connection limits/TLS, owner/org projections, transactional outbox/idempotency, rate limits, stale revision behavior, retries/errors and actual application read/write tests. No real-user signin, remote application write/read, booking, payment, provider model or product matching accuracy is claimed. All backend/browser regressions in this report use current local schema and explicit fixtures where identified.
