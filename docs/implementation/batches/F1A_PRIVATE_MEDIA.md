# F1A — private-media foundation implementation plan

Authority: the controlled 140-requirement implementation instruction. The existing feature matrix and defect register remain authoritative; no new broad audit is being generated.

Scope: GB-022 / FINAL-GB-022 (private-photo upload/access/deletion), GB-107 / FINAL-GB-107 (private Storage lifecycle), with scoped dependencies on GB-013 / FINAL-GB-013 (current server-approved photo-storage consent and adult eligibility) and GB-128 / FINAL-GB-128 (media expiry/deletion execution only). These broad requirements remain open until all remaining UI, privacy, deployed and device acceptance is met.

Migration: candidate `0015_private_media`, following canonical `0014_creator_studio`. Add owner-scoped media intents and a private `glam-private-media` Storage bucket with a restrictive policy denying direct browser access. Never overwrite/adopt an existing bucket silently. Rollback only when the new registry/bucket are empty; retain data rather than delete it to satisfy rollback. Local Supabase Storage catalog fixture is test-only. Neither0014 nor0015 may run in production without exact-SQL approval.

Affected files:
- db/migrations/versions/0015_private_media.py and .sql: registry, indexes, state constraints and Storage protection.
- services/api/src/glam_api/private_media.py: authenticated metadata, bounded upload, normalized metadata-free image retrieval and deletion requests.
- services/api/src/glam_api/integrations/private_storage.py: replaceable real binary Supabase Storage adapter, restricted original-project URL, TLS/redirect protection and explicit configuration failures.
- services/api/src/glam_api/media_cleanup.py: retention, withdrawn-consent fencing and confirmed object deletion with retry state.
- services/api/src/glam_api/main.py: mount new router without changing existing identity/financial operations.
- packages/product/private-media.ts and packages/contracts: shared web/native client and generated endpoint contracts.
- tests/test_private_media.py, tests/test_private_storage.py, tests/client/private-media.cjs and test-only Storage fixture: failing-before and passing-after acceptance evidence.

Acceptance tests: owner isolation; absent/current/withdrawn/regranted consent; eligibility; idempotency/replay conflict; real image decode and metadata removal; spoofed/truncated/oversized images; expiry; no-store authenticated retrieval; storage failure without fake success; pending/confirmed deletion; cleanup retry; no resurrection or orphan after ambiguous upload; direct authenticated/anonymous SQL denial even with a broad existing Storage policy; empty-only rollback; shared client requests and errors. Test doubles remain isolated in tests and cannot become a production fallback.

Configuration: explicit feature activation and retention duration, original Supabase URL and server-only service-role key. No default privacy-policy approval, automatic production activation, public media URL, or frontend service key. Missing provider configuration must not prevent building or isolated regression tests.

Dependencies after F1A: F1B persisted analysis jobs/reports, correction versions and Style Passport; F1C full account export/deletion and legal-hold coordination. F1A alone does not close these requirements or claim analysis works. Web/mobile image-picker integration and hosted Edge transport parity must be verified before the full photo feature can be called BUILD COMPLETE.
