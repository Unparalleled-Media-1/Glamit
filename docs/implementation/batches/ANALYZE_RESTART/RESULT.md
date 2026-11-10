# Analyze restart — native inputs verified; real vertical slice BLOCKED

The subsequent [Analyze history continuation](../ANALYZE_HISTORY/RESULT.md) adds authenticated history/private-photo recovery, 26 passing isolated tests and fresh Android/iOS native packages, including a separately identified, physically untested ARM64 phone-review APK. The baseline evidence below remains historical and does not replace that continuation's live blockers.

The [latest user directive](../../../specification/sources/2026-11-controlled-flutter-restart.txt) replaces the five-screen prototype cycle with one complete Analyze feature before design approval or other feature expansion. The first COMPLETE feature gate remains OPEN; this report is not approval or a claim of an operational analysis product.

## Preservation and source

- Permanent pushed backup `backup/flutter-rejected-2026-11-10`:3d00960326024a1a5a9cb8070cd5be3131e29ffd, with prior source/build receipts in PLAN.md.
- Clean mobile presentation: apps/glam_mobile; branch feat/flutter-analyze-vertical-slice; [draft PR46](https://github.com/Unparalleled-Media-1/Glamit/pull/46), stacked against the preserved rejected-frontend branch. No merge/deployment is authorized by that stack.
- Tested application/harness source:9b15b0c9b23d89b52df0ce4324c4bf4ec2bd4416. [Successful run42786667941](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42786667941). App Dart code is unchanged from9e74b16; later harness changes replace the failed iOS coordinate tap with actual photo accessibility selection.
- Source comparison against the backup confirms apps/flutter_app, apps/mobile, apps/web, services, db and packages are unchanged. No new Supabase project/branch, schema, Auth/provider settings, financial logic or production data change occurred.

## Four separate measures

| Measure | Evidence and limit |
| --- | --- |
| Implementation | Independent camera-first app, native input/navigation and real canonical API client paths are present. This is one candidate feature, not the entire application or all approved analysis capabilities |
| Functional verification | Dart analysis and19 isolated tests PASS: consent/readiness, hashing/upload contracts, uncertainty, owner/expiry validation, preserving corrections, server-confirmed save/reopen, lock/late-response fencing, per-account recovery metadata, local-scope sign-out, expired-record removal, image-cache eviction and mobile layout. Fixtures do not establish live backend/provider behavior |
| Platform verification | Android emulator camera/capture/review/back PASS; iOS simulator actual library selection/review/swipe-back PASS. Physical devices, live Auth/upload/analysis/save and full cross-platform feature parity NOT VERIFIED |
| Launch readiness | NOT ESTABLISHED; first real vertical slice is BLOCKED by live backend/schema/configuration/identity qualification; no design or release approval |

## Actual native packages

- [Android native source recording/screenshots, tested emulator APK, checksums and receipts](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42786667941/artifacts/13749194435).
- [iOS native source recording/screenshots, simulator application, checksums and receipts](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42786667941/artifacts/13751411514).
- [Exact native inputs and shared dependency lock](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42786667941/artifacts/13748978200).
- [Source-check output](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42786667941/artifacts/13749617990).

Android captures cover camera entry, actual live device-camera preview, actual capture, unavailable sign-in gate and native return/retake. iOS captures cover camera capability/fallback, the real OS picker, selection of an injected synthetic gradient, photo review, the unavailable sign-in gate and swipe-back. The gradient is test-only, not bundled or analyzed. iOS camera hardware/permission behavior on a physical iPhone remains untested. These are x86_64 emulator and iOS simulator packages, not store/physical-phone releases.

The earlier iOS run42783478254 failed after its coordinate tap did not reach photo review. That failure is retained in evidence/ios-picker-first-attempt.json. The new selector operates on the native photo label and retains all review/connection/back assertions. No failure is upgraded to PASS retroactively. The earlier F1-only diagnostic guard was replaced by a separately scoped credential-free Analyze diagnostic helper.

Signed artifact/log download destinations remain blocked in this executor. The actual files are retained on GitHub; no inline screenshot inspection, recording playback or visual comparison against the website is claimed here. User/device visual review remains outstanding.

## Mobile presentation comparison — source evidence, not visual approval

| Area | New Analyze implementation |
| --- | --- |
| Entry/capture | Full camera surface, actual platform permission and sensor preview, framing guide and one-hand shutter/source controls; no marketing hero or website navigation |
| Photo review | The selected/captured photo is the canvas, with native back/retake and explicit analysis entry |
| Consent/account/corrections | Native sheets and a scrollable current-policy view using server text and explicit choices; unconfigured providers are not shown as operational |
| Processing/results | Genuine request/job states over the active photo; draggable findings sheet; no invented face points, score, percentages, report or local-only account save |
| Routing/gestures | Flutter-native Material/Cupertino pages, Android back handling and iOS swipe-back; no WebView or HTML |
| Privacy | Photos remain local before explicit qualified upload; bounded metadata-stripped bytes; private cache eviction; identity fences; RAM-only credentials; account-scoped encrypted recovery handles |

The resulting appearance still requires actual visual review. Structural differences and successful input tests cannot independently certify the user's mobile-first design standard.

## Live backend evidence and blockers

Read-only Supabase metadata/schema inspection confirms original project bkkmsbxrxkqaveymcrgi and active glam-api. Email Auth is enabled; phone/social disabled. The repository Edge handler lacks the canonical FastAPI private-media/analysis routes; no qualified API origin or authenticated deployed route journey has been demonstrated. The public Auth key and an authorized eligible test identity are not supplied to this app build.

A read-only relation lookup returned NULL for private_media, analysis_job, analysis_correction and style_passport_analysis. These required tables are absent in the target. Existing canonical0015–0017 and predecessors remain subject to their review, validation, backup and production-approval gates; no alternate migration or stamp is introduced. Storage, approved policies, eligibility, dispatch and provider qualification are not inferred from a key or Management access. Dedicated skin/hair findings are also absent from the current backend contract.

Actual live upload IDs: NONE. Actual analysis-job/result IDs: NONE. Actual account-save/reopen evidence: NONE. No provider was called and no substitute analysis was displayed. See [LIVE_READINESS.md](LIVE_READINESS.md) and the read-only observation receipt.

## Remaining gate

Qualify the original project's canonical schema and backend under the existing separate approvals; provide public build configuration and an authorized test identity securely; then demonstrate real photo→analysis→uncertainty/correction→Passport save→fresh-session reopen independently on Android/iOS. Verify hardware, privacy/error recovery and physical-device usability. Only after that first real feature passes review is design approval requested and Studio/Discover/Home/Profile expansion allowed. This branch does not silently defer missing operations as credentials or declare the restart successful from compilation.
