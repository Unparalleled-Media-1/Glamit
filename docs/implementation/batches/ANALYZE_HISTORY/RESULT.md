# Analyze history and private-photo recovery — scoped continuation

The clean Flutter app remains in apps/glam_mobile on feat/flutter-analyze-vertical-slice, under [draft PR46](https://github.com/Unparalleled-Media-1/Glamit/pull/46). This batch completes additional Analyze client operations; it does not close the first real backend journey or approve the mobile design.

## Implementation and verification

Tested source: `df4f22cb4d2c587cb86bd8cac87a0fe4ffa18871`.
[Run42849509362](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42849509362).

- Actual account history uses GET /v1/analysis/jobs, bounded list validation, server creation timestamps and the canonical selected Passport ID.
- Opening a report retrieves ready private-media metadata and its authenticated PNG from the configured canonical API origin. Owner/session fences, expiry, PNG MIME/signature and stored-size validation apply. No public/provider URL, disk photo cache or substitute portrait is used.
- Missing/revoked private records clear the displayed report and photo. Transport failures offer retry. Lock/expiry rejects late responses. Saving an older report preserves another active job's account recovery handle.
- Dart analysis and all26 isolated tests PASS, including seven added tests for history, fresh-session photo recovery, denied media, invalid content, late-response protection, duplicate history and independent pending-request preservation. Fixtures are test-only; these results do not establish live API operation.
- Android x86_64 emulator: actual camera permission, preview/capture, review, truthful unconfigured-account gate and back/retake PASS.
- Android ARM64 debug phone-review APK: compile and signature verification PASS. Physical-phone installation, camera and workflow verification NOT TESTED.
- iOS simulator: native compilation, actual OS photo-library selection, review, truthful unconfigured-account gate and swipe-back PASS. Physical-iPhone camera and workflows NOT TESTED.

The existing native interaction flows do not exercise authenticated history/results against a deployed backend. Their successful source interactions cannot be used as live analysis, visual approval or device acceptance evidence.

## Native packages and evidence

- [Android artifact](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42849509362/artifacts/13781580531): recordings/screenshots, source/SDK/checksum receipts, `glam-analyze-x64-emulator.apk` and `glam-analyze-arm64-review-UNTESTED.apk`.
- [iOS artifact](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42849509362/artifacts/13780243668): actual simulator screenshots/recording, simulator application, checksums and source/SDK receipts. Its selected gradient is a test-only OS library fixture; it was not analyzed or bundled in the app.
- [Shared generated native inputs and dependency lock](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42849509362/artifacts/13778384448).
- [Source-check output](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42849509362/artifacts/13780550437).

The ARM64 package is a debug review build, not a signed store release. The iOS package is simulator-only, not TestFlight or a physical-iPhone package. Artifact download/inline inspection remains unavailable in this executor; no recording playback or visual comparison is claimed. See [installation instructions](../../../../apps/glam_mobile/README.md).

All three jobs completed successfully. The filtered GitHub job/artifact metadata is retained in evidence/native-run.json. Later documentation-only commits do not change the tested application or harness at df4f22c.

## Live dependency and preservation

A fresh read-only lookup on 10 November2026 against the original Supabase project bkkmsbxrxkqaveymcrgi again returned NULL for public.private_media, public.analysis_job, public.analysis_correction and public.style_passport_analysis; glam-api is ACTIVE. No user rows were read or modified. Active function metadata is not qualification of the canonical FastAPI media/analysis routes. See the [existing live-readiness requirements](../ANALYZE_RESTART/LIVE_READINESS.md).

The required schema/routes, public build configuration, eligible authorized test identity, private storage/policies/worker and provider qualification remain unresolved. Separate skin/hair findings are absent from the current report contract. Existing migrations require their review, local validation, recovery and production approval gates. No alternate schema, duplicate migration or migration stamp was introduced.

Actual live upload/job/save IDs: NONE. Full photo→analysis→correction→saved Passport→fresh-session recovery: BLOCKED. Physical-device verification and first-feature design approval: NOT COMPLETE. Overall application/launch completion is not claimed.

No backend/Auth/financial/database code, production settings or data changed. Comparison against backup/flutter-rejected-2026-11-10 confirms the old Flutter, Expo and web applications, services, db and packages are unchanged. No migrations were required for these client changes, and no production migration, deployment, merge, provider activation or payment occurred. Related requirements GB-014/019/021/022 retain their broader acceptance gates; no broad requirement or defect is closed by these scoped tests.

## Affected source

- apps/glam_mobile/lib/analysis/{contracts,controller,repository}.dart
- apps/glam_mobile/lib/core/transport.dart
- apps/glam_mobile/lib/main.dart and lib/presentation/design.dart
- apps/glam_mobile/test/analysis_contract_test.dart
- .github/workflows/flutter-analyze-restart.yml
- apps/glam_mobile/README.md and this batch's PLAN/RESULT/evidence

Continue only the Analyze feature until the actual authenticated cross-platform journey and device/privacy checks pass; then request the required first-feature design approval before expanding Home, Studio, Discover or Profile.
