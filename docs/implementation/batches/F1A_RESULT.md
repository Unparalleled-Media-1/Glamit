# F1A implementation result — private-media backend and client foundation

Date: 2026-11-08. Branch: `feat/private-media-foundation`. Plan: [F1A_PRIVATE_MEDIA.md](F1A_PRIVATE_MEDIA.md). This is a scoped implementation receipt, not a replacement general audit.

## Requirements and closure

GB-022 / FINAL-GB-022 and GB-107 / FINAL-GB-107 received private-media API, Storage adapter, canonical candidate migration, cleanup worker and shared web/native clients. GB-013 / FINAL-GB-013 received current-consent/adult-eligibility enforcement; GB-128 / FINAL-GB-128 received media expiry and confirmed deletion execution. All four broader requirements and defects remain PARTIAL / OPEN. No entire feature or defect is closed by backend-only evidence.

The authoritative CSVs record the implemented components, acceptance evidence and remaining code separately from provider activation, deployed and real-device verification. The other requirements and historical platform reports have not been reclassified.

## Implemented and tested

- Authenticated owner-scoped media intents, upload, list, metadata, binary retrieval and deletion requests. Storage readiness reports NOT CONFIGURED, DEGRADED or CONNECTED according to actual checks; it does not certify analysis.
- A durable committed intent precedes the object write. UUID idempotency keys and request fingerprints handle retries; ambiguous Storage writes remain discoverable for cleanup.
- Actual JPEG/PNG/WebP decoding, dimension/body limits, orientation normalization and newly encoded pixel-only PNG output remove metadata. Retrieval checks integrity, current consent epoch, approved policy, eligibility and expiry; responses are private and non-cacheable.
- Private Storage bucket and restrictive direct-access policy, metadata RLS/privilege checks and original-project-only server adapter. No public photo URLs, client service keys or runtime provider doubles.
- Explicit retention configuration, consent/policy/eligibility fencing, queued deletion, confirmed physical-object absence, retry/backoff and fingerprint scrubbing. Withdrawal/regrant cannot resurrect old media. Deletion remains available when uploads are disabled or access requirements fail.
- Generated OpenAPI and typed shared web/native clients with platform hashing factories, session fences, bounded errors and no photo/token persistence.

Implementation files: `services/api/src/glam_api/{private_media.py,media_cleanup.py,main.py}`, `services/api/src/glam_api/integrations/private_storage.py`, `packages/product/private-media.ts`, `apps/web/lib/private-media.ts`, `apps/mobile/private-media.ts`, generated contracts, canonical migration/release artifacts, migration/export/deployment validation tooling, Pillow dependency/lock, CI and targeted tests. See the Git diff for exact changed files.

## Passing acceptance evidence

All receipts are in [F1A/evidence](F1A/evidence).

| Check | Result and scope |
| --- | --- |
| Backend regression | 316 passed against isolated local PostgreSQL; one upstream Starlette deprecation warning |
| Python lint / formatting | All checks passed; 270 files formatted |
| Shared media client contracts | Web factory plus explicit native crypto-port doubles pass; not hardware evidence |
| Web and mobile TypeScript | Both pass |
| Next production build | Pass |
| Existing authentication regression | Pass; native biometric checks use doubles |
| Release locks | 16 tests pass; existing mandatory release gates preserved |
| Frozen dependency checks | Pass |
| Candidate migration | Exact upgrade SQL replayed locally from canonical0014;0015 head verified, sandbox0009 excluded |
| Provider-compatible rollback | 17 targeted tests pass, including actual-style Storage delete protection |

Failing-before receipts demonstrate the absent media endpoint and a reproduced NULL-policy cleanup bug before their fixes. PostgreSQL tests exercise owner/role restrictions, broader permissive-policy interference, revoked sessions, consent races, concurrent retries, ambiguous writes, provider corruption, retention and rollback. Storage HTTP calls are contract-tested with injected transport; local tests are not hosted provider verification.

## Independent platform status

| Platform | Scoped source verification | Remaining application work | Deployed / device status |
| --- | --- | --- | --- |
| Web | Backend, typed client and build PASS locally | Wire actual photo screens and authenticated transport, integrate persistent analysis jobs/results | Deployed media journey NOT TESTED |
| iOS | Shared factory/types and crypto-port contract doubles PASS | Wire native picker/camera, permissions, transport, job/result state and recovery | Actual native build and installed-device journey NOT TESTED |
| Android | Shared factory/types and crypto-port contract doubles PASS | Wire native picker/camera, permissions, transport, job/result state and recovery | Actual native build and installed-device journey NOT TESTED |

Existing applications use hosted Edge endpoints. This batch adds FastAPI media endpoints and reusable clients, but does not yet connect those application transports/screens. That is an implementation gap for F1B, not a missing-key excuse. Persistent analysis jobs/reports, corrections and Style Passport remain F1B work. Complete account export/deletion, retention/legal-hold coordination and backup/provider-erasure coverage remain F1C work. Existing guardian/age-assurance and administrative onboarding gaps are not solved by requiring an already trusted adult record.

## Migration, rollout and rollback gates

No production schema, objects or records were changed. A targeted read-only Storage trigger inspection of `bkkmsbxrxkqaveymcrgi` found that Supabase protects direct SQL bucket deletion. The candidate rollback was corrected to respect that guard. The minimal inspected definition is preserved in evidence; it is not proof of an applied migration.

Candidate `0015_private_media` depends on `0014_creator_studio`; neither revision may be skipped, stamped or applied here without exact-SQL approval and the required recoverable production backup. Release SQL SHA256: `67f172d7ea775b7fa65895ab5f77250e61debf53969f4ed2801a8995cffdcf12`. The manifest records canonical-source checksums. Local catalog fixtures are never production migrations.

Before any authorized activation:

1. Review both pending migration artifacts and restricted backend grants against the original production project. Keep anon/authenticated access denied and do not recreate a deleted development branch.
2. Configure server-only Storage credentials, the original project URL and a reviewed explicit `GLAM_PRIVATE_MEDIA_RETENTION_SECONDS`. `GLAM_PRIVATE_MEDIA_ENABLED` remains off by default. Do not invent privacy-policy approval or enable this flag automatically.
3. Obtain privacy review for the current-consent/policy semantics: publishing a replacement policy, withdrawing consent or losing eligibility fences earlier media and can queue its erasure. Approve legal text and the retention duration; full legal holds remain unimplemented. Only a genuinely approved published `private_photo_storage` policy and trusted eligibility record permit uploads.
4. Deploy and monitor the cleanup worker explicitly, validate hosted Storage/ownership behavior and finish application wiring before claiming the photo journey works. No credentials are required to build or run the isolated tests; authenticated live-provider verification still requires environment secrets and approved activation.

Application rollback disables new uploads while keeping erasure processing operational. Preserve nonempty media metadata, tombstones and objects; migrations refuse to drop them. Only when both registry and object set are empty may an authorized operator remove the empty bucket through the official Storage API, confirm absence, then run the empty-only Alembic downgrade. The operator adapter provides no force-empty behavior and is not exposed as an application endpoint. Never bypass Supabase's SQL deletion guard.

No financial/authentication rules, production data, live payment state or approved visual patterns were changed. No public deployment, release merge or overall completion percentage is asserted by this batch.
