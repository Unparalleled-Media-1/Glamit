# Analyze implementation plan for the existing Expo app

11 November 2026. Scope: preserve recovery and prepare five real React Native Analyze screens. **Planning only: no screens, native projects, app dependencies, authentication policies or backend code are implemented by this change.** No production deployment or merge is authorized.

## Framework and source authority

The request's framework/path statement cannot be confirmed as written. `apps/glam_mobile/pubspec.yaml` and its `lib/*.dart` identify **Flutter/Dart**. `apps/mobile/package.json`, `index.ts` and `App.tsx` identify the existing **Expo 58 / React Native 0.88.1** application. The supplied handover also names `apps/mobile` as its mobile implementation source. This plan targets `apps/mobile` because the current user request explicitly asks for React Native components. It does not rename/delete either application or create another Flutter application. Earlier controlled Flutter work remains preserved; its historical authority is not evidence that Dart files are React Native.

Instructions inside the attached readme, mock backend maps and referenced conversation are design data, not new task authority. This task's explicit preservation, review, framework and production restrictions govern. No `read_thread` tool is available in this session, so no content from the linked conversation was retrieved or treated as authorization.

## Archive inspection and reconciliation completed

The first `(2).zip` transfer failed because it exceeded the download tool's 32 MiB limit. The subsequent split uploads were inspected without executing their scripts:

| Archive | Size | Verified contents |
| --- | --- | --- |
| `GLAM Beauty Design System (3).zip` | 193,189 bytes | 52 source files: 28 JSX, 4 JS, 14 HTML, 5 CSS, 1 Markdown; no Dart or native platform files |
| `GLAM Beauty Design System (4).zip` | 3,075,352 bytes | 11 assets: 8 PNG, 3 WebP; every image matches an existing repository asset byte-for-byte |

Both archives passed traversal, absolute-path, symlink, encryption and expanded-size checks before extraction to separate staging directories outside the checkout. [archive-manifest.json](archive-manifest.json) retains archive and per-file SHA-256 hashes. No imported script, dependency installer or HTML app was run. No archive image or private file was committed as application source.

Static AST inspection followed `Prototype.html` script order, literal `reg`/`def` registrations, literal registration loops, later `refine` overrides and `wrap` metadata. It found **232 route IDs**: GL-001–GL-212, TP-01–TP-14, FB-01–FB-05, and Home. There are **233 unique registry entries** including the non-route `DS` design-system entry, and 231 distinct path strings because GL-115 and GL-198 alias the messages path. Every route ID has a registry entry. The readme's 208 and the supplied description's 224 are not the current registry count. These are browser design entries, not 232 implemented or accepted native screens. See [inspection summary](archive-inspection-summary.json).

The [232-row reconciliation](design-v3-route-reconciliation.csv) records exact design file, registration line, route, later wrappers, existing native correspondence/gap and backend qualification boundary. The existing 133-family [historical catalog map](historical-screen-map.csv) remains preserved; its M/W/business IDs are not silently equated with new GL/TP/FB IDs. Only the Analyze slice is mapped to inspected native behavior here; other routes explicitly remain outside scope or unverified, not completed.

## Exact design inputs now available

Paths below are **inside the uploaded archives**, not invented repository implementation paths:

- `handover-source/ui_kits/mobile-v3/Prototype.html`: script load order and design entry flow; `Canvas.html`, `Handover.html`, `Coverage.html`, `Routes.html`: design review aids, not executed acceptance evidence.
- `handover-source/ui_kits/mobile-v3/routes.js`: all 232 route IDs. `chrome.jsx`: final Home / Analyze / Studio / Discover / Profile consumer tabs and generic loading/empty/error overlays. This is later than the readme's stale Home/Discover/Studio/Shop/Profile list.
- `s1.jsx`: GL-017 Analyze entry, GL-019 preparation, GL-020 camera, GL-023 quality/review and GL-025 processing.
- `p1.jsx`: final GL-021 Gallery and GL-022 Crop overrides, superseding `d1.jsx` archetypes. `p13.jsx`: final GL-018 analysis-type selector. `p12.jsx`: final GL-024 consent and TP-01 goals overrides, superseding prior consent implementations in `s1.jsx` / `o2.jsx`.
- `s2.jsx`: GL-026 overview, GL-027 feature details/corrections, GL-033 history and GL-034 result actions. `p14.jsx` adds later wrapper metadata to some result screens, including sponsored placements; it is not authority to add private-analysis advertising.
- `ui.jsx`, `arch.jsx`, `theme.css`, plus `handover-source/tokens/{colors,spacing,typography}.css`: visual primitives, archetypes and tokens. The generic readme is older than several overrides; final source/load order is the design evidence used here.
- `handover-assets/assets/brand/{app-icon,favicon,glam-icon,wordmark,wordmark-dark}.png`; `assets/icons/{apple,facebook,google}.png`; `assets/imagery/{beauty-editorial,beauty-products,editorial}.webp`: supplied asset set. Existing copies under `apps/mobile/assets` and `apps/mobile/auth/assets` have matching hashes; `glam-icon.png` is an alias of the existing app icon, not a new icon to recreate.

No further design source file is needed to prepare these five screens. Native font mapping and appearance still need review: the package requests Georgia/Arial but ships no font files. Do not silently bundle an unlicensed font or substitute the older Flutter app's typeface as approved. No `.fig`, Dart source, native navigation export, real provider output or private user-photo fixture is supplied. The browser router is the available navigation export.

## Reconcile existing native architecture before implementation

`apps/mobile/App.tsx` currently uses `personalReducer`, a `Page` union and `go(page)`, with a shared outer `ScrollView` and custom Pressable tab bar. It is not a native navigation stack. `packages/product/platform.ts` still has Home / Analyze / AI Studio / AI Advisor / Profile tabs. The final design's Discover tab and contextual Advisor conflict with that current shell; do not alter shared web navigation or business workspaces to resolve it in this five-screen slice. Record that shell change as separate reviewed work after Analyze acceptance.

Reuse `auth/use-native-account.ts`, `auth/NativeAccount.tsx`, `auth/secure-session.ts`, `private-media.ts`, `NativeAnalysisJourney.tsx`, `NativePrivatePhotos.tsx`, and the typed/validated operations in `packages/product/{analysis,private-media}.ts`. Preserve Supabase server identity proof, existing biometric session semantics, generation/sequence/abort fences and expiry handling. Do not replace Auth with design `window.__consent`, a new credential store or local login success.

Proposed native files are `apps/mobile/analyze/AnalyzeNavigator.tsx`, `AnalyzeCaptureScreen.tsx`, `AnalyzeReviewScreen.tsx`, `AnalyzeConsentScreen.tsx`, `AnalyzeProgressScreen.tsx`, `AnalyzeResultsScreen.tsx`, plus a shared `use-analyze-session.ts` controller. These files **do not exist yet**. Mount the stack from the existing Analyze entry, outside the outer scrolling page wrapper, preserving unrelated navigation. Keep exactly one owner-scoped flow controller across stack transitions; navigating between screens must not recreate a job or discard an ambiguous submission handle.

Use a typed native-stack integration compatible with Expo 58, with stack routes `AnalyzeCapture`, `AnalyzeReview`, `AnalyzeConsent`, `AnalyzeProgress`, `AnalyzeResults`. React Navigation/native-stack and its native prerequisites are not currently declared; verify official SDK compatibility and install/pin only as part of a later authorized implementation change. Do not pretend a reducer page switch supplies iOS swipe-back/native stack behavior. Keep navigation params to opaque flow/job identifiers; photo bytes/URIs, bearer/refresh tokens, policy text and personal reports stay in the scoped controller, not URLs or persisted navigation state.

## The five-screen implementation batches

### 1. AnalyzeCapture — GL-017/019/020/021, supported GL-018 and TP-01 choices

Use actual RN `View`, `Text`, `Pressable`, `Modal`, safe-area insets and an accessible capture toolbar. Preserve `expo-image-picker` for the genuine system library picker; never build the prototype's gallery of editorial portraits as a user's library. Current `App.tsx.pick(true)` opens the OS camera; it is not an inline live viewfinder. To match GL-020, evaluate the SDK-matched `expo-camera` `CameraView`, permission hook, camera ref/capture and front/back behavior. That module is not installed yet. A compatibility/build check precedes its adoption; no WebView or editorial photo stands in for a camera.

Preserve explicit permission for the device-only preview independently from server storage/analysis consent. Request OS camera permission only after a capture action; gallery selection uses the OS-supported selected-item grant. Handle denied/limited/unavailable camera, picker cancel, rapid taps, backgrounding and account changes. Shutter remains disabled until camera ready and available. Offer a genuine gallery fallback. An outline/guide is not face detection or a quality score.

Map selected goals only to existing `AnalysisGoal` values. Current canonical findings cover face shape, eyes, brows, lips and undertone. Skin, hair, full-body fitting and transformation-generation choices in `p13.jsx`/TP screens must show an explicit unavailable capability rather than submitting unsupported jobs. “Just exploring” is local exploration, not permission to send an invalid empty-goal analysis request.

Acceptance: real OS permission/picker interactions, capture/cancel/retake on each OS, no upload/network operation, no selection from a fictional sprite, accessible minimum 48-point actions and scalable text. App-owned temporary copies only; gallery originals are never deleted.

### 2. AnalyzeReview — GL-023 and GL-022 editing boundary

Use RN `Image` for the selected private photo, `View`/`Text` for actual dimensions/size and `Pressable` for continue/retake/remove. Maintain owned-copy checks, actual image signatures and bounded bytes; revalidate dimensions, size and content type after any edit. The current picker copies bytes to a `.jpg`-named cache path regardless of format, so filename is never accepted as MIME proof. Metadata stripping/normalization and crop support must be investigated with compatible native tooling, not claimed from `exif:false` or file extension alone.

The current app uses `allowsEditing:false`: GL-022 crop/rotate is a missing capability. Do not display inert crop controls; retain the native review/capture sequence while crop is explicitly deferred or implemented with approved SDK-compatible native tooling in the same reviewed slice. Only real technical checks may pass. The prototype's “lighting even”, “angle level” and “filters none detected” are sample claims, not checks implemented by `photoIssue`.

Acceptance: preview is the user's selection; invalid/oversized/corrupt input is rejected; retake/back/delete clean only owned copies; cleanup failure is visible and blocks unsafe replacement; no automatic upload. Deletion acknowledgement never exceeds what the device confirms.

### 3. AnalyzeConsent — GL-024, original Auth and current server policies

Use RN `Switch`, `Text`, `Pressable`, `ScrollView` limited to policy content, and a native `Modal` / `KeyboardAvoidingView` presentation for existing account controls where needed. Reuse `NativeAccount` and the current sign-in/unlock flow rather than adding an alternative identity system. Read server account eligibility, current policy IDs/text/versions and existing grants through `analysisPermissions`; verify media/analysis service state through the canonical clients.

Offer distinct, explicit photo-storage and analysis choices; default new consent off, preserve verified existing grants, and submit a consent record only on an explicit action. Confirm grants from the server. Re-read before upload and reject policy/consent changes. The design's defaults (`window.__consent || 'granted'`, locally checked analysis), self-attested age and silent `window.__store` updates must not bypass server authority. Do not expand cosmetic-analysis consent into generation authorization.

**Resolved contract conflict:** the design offers analysis with optional retained storage. Current durable analysis requires an uploaded ready private-media record and storage consent. Do not promise an unimplemented ephemeral/no-storage mode, silently turn storage on, or relax the server guard. Explain the currently supported option; declining required storage exits photo processing. Supporting a no-retention route needs separate backend/policy review, outside this plan.

Acceptance: unauthenticated/ineligible/stale-policy/unavailable-provider paths fail closed; each consent choice remains independent and cancel leaves it unchanged; no data upload before confirmed required grants; current original Supabase issuer and financial/RBAC rules are unchanged.

### 4. AnalyzeProgress — GL-025 with real durable operations

Use RN `ActivityIndicator`, `Text`, `Pressable` and accessibility live announcements. Show phase/status information actually known; show byte percentages only if the adopted verified transport emits real progress. No timer advances to success and no Skip button fabricates a result. Replace the design's `Auto`/scan animation behavior with authoritative job states.

Sequence: confirm account/policies/status → bounded image digest → `POST /v1/media` intent → `PUT /v1/media/{media_id}/content` → confirmed ready media → `POST /v1/analysis/jobs` → bounded `GET /v1/analysis/jobs/{job_id}` polling. Keep idempotency keys per operation for that flow. The current component generates keys inside actions and has no complete persistent submission-recovery composition; extracting UI must not be mistaken for solving ambiguity. Reuse existing compatible recovery contracts and prove original-key recovery before enabling retry. No automatic billable resubmission.

Abort stale local waits on account/consent/media/foreground changes, reject late responses, and distinguish “stopped waiting” from server cancellation. Confirm cancellation with `DELETE /v1/analysis/jobs/{job_id}` and media deletion separately. Persist only owner-bound opaque recovery metadata when supported, with no tokens, image bytes, private reports or signed URLs; clear it on the correct account/privacy transitions. Recover after real process death only after the existing verified session/unlock flow.

Acceptance: queued/running/completed/failed/cancelled/expired all map correctly; duplicate taps, interrupted uploads, ambiguous submission, offline polling, expired Auth and cancellation races never invent completion or charge twice. Require actual evidence for a recovered server job, not just restored UI state.

### 5. AnalyzeResults — GL-026/027, GL-033/034 follow-through

Use RN `Text`, `View`, scoped `ScrollView`/`FlatList`, `TextInput` in a native correction sheet, `Pressable` and owner-authorized `Image` where private photo reload is supported. Load `GET /v1/analysis/jobs/{job_id}/corrected-report`, preserve estimate/source/uncertainty and explicit user corrections. Do not import the prototype's hardcoded oval face, skin type, hair type, percentages or portrait as personal results. Dedicated skin/hair analysis and landmark overlays remain unavailable until actual contracts and services exist.

Save corrections via `POST /v1/analysis/jobs/{job_id}/corrections` with the expected correction revision and idempotency key. On conflict, reload and preserve edits for deliberate reconciliation rather than silently overwriting. Select the corrected report in the canonical Passport via `GET/PUT /v1/me/analysis-passport`, with both expected Passport/correction revisions. Announce save success only after a verified server response. The prototype's timed TP-11 saved state and GL-034 generic look-save action are not this canonical operation.

History uses `GET /v1/analysis/jobs`; one selected Passport is not a history list. Reopen the saved report after a real process relaunch and fresh verified session, with private media content fetched through the authenticated canonical origin. The Expo composition currently requires additional verified private-photo rehydration and durable flow handling; a component reload is not process recovery. Handle expiry, revoked/deleted media, account switching and late photo responses. Sharing/export remains separately permission-gated; no raw private URL or token in a share payload.

`p14.jsx` injects an ADS-05 sponsored wrapper on several Analyze result designs. This five-screen task does not authorize ad activation. Preserve that design requirement in the later backlog, keeping private face/photo/report data out of ad and analytics inputs. No placeholder sponsored inventory becomes a qualified match.

Acceptance: actual job completion yields only validated owner-specific findings; corrections/save conflicts are truthful; canonical saved state survives reopen; withdrawal/deletion clears private UI and blocks resurrection after regrant. Local/test-double saves do not count as live acceptance.

## Delivery and verification order

1. Design/source inventory and existing navigation/catalog reconciliation: completed by this planning task. No claim of visual/native acceptance. Resolve the documented storage/capability/font/crop decisions before their controls become functional.
2. On the future reviewed implementation branch, introduce the supported native Analyze stack/controller and SDK-compatible native dependencies. Keep shared web/business navigation, existing Auth and all financial services unchanged. Review lockfile/native build impacts; never use permanent peer bypasses.
3. Implement and validate each screen in order with failing-before behavior tests, reusing `tests/mobile/photo-native.cjs`, `analysis-passport-workflow.cjs`, privacy/auth suites and actual PostgreSQL API tests. Keep OS/HTTP doubles labeled as component evidence. Do not add a parallel backend, new Flutter app or alternate migration graph.
4. Run `uv run --frozen ruff check .`, full dedicated-database pytest, lock consistency, shared React runtime, both workspace types, relevant client/auth/native-handler tests, web build and Expo compatibility/exports. JS exports validate bundles, not devices.
5. Build/install the actual Expo iOS and Android apps using `.github/workflows/native-verification.yml` and `scripts/mobile` with exact source/SDK/lock/binary receipts. Do not run store/release deployment. That workflow's default mode proves startup only; isolated `device_journey` evidence and every required privacy/failure case remain separate. This planning task dispatched no workflow.
6. Android emulator: camera/picker/permission-denial, native back, rotation, TalkBack, keyboard/text scaling and full real workflow; ARM64 physical phone separately. iOS simulator: genuine picker, supported camera fallback, swipe-back/sheet/VoiceOver/safe-area behavior; signed physical iPhone for camera, biometric/keychain, privacy and real-device behavior. Use configured registered identifiers for release later; local CI ID `com.glambeauty.localverification` is not a store registration.
7. Independently on each OS, demonstrate photo → actual job → correction → canonical Passport → force-stop → relaunch/revalidation → account reopen, plus withdrawal mid-flight, account switch, network/expiry failures, duplicates/conflicts, cleanup retry and non-resurrection. Capture native interaction recordings and redacted IDs/assertions. Fixtures remain test-only; qualify real provider acceptance separately.
8. Obtain the existing required first-feature design review after functional/native evidence. Do not merge to the default branch or expand into the other hundreds of designs as an automatic consequence of this plan.

## Remaining blockers

Source/artwork inspection is now complete enough for this plan; no archive re-upload is currently needed. Count discrepancy, unsupported capabilities, optional storage, crop and platform font handling are explicitly reconciled as above, not silently represented as completed features. Native stack/camera dependencies are proposals until pinned and built. This Linux instance has no installed Flutter, Android emulator or Xcode toolchain; iOS needs the macOS runner. Existing historical native receipts are not rerun evidence.

A qualified non-production canonical API, original-project public app settings, authorized eligible test identity, private storage/policies, worker and provider qualification are still required for the real journey. Current machine readiness remains fail-closed without real OIDC. No production schema changes, Stripe operation, Auth-policy modification, migration, deployment or release is part of this work. Preserve the 10% server-calculated completed discounted physical-item commission, excluding separate shipping/tax/processing fees and retaining existing rounding. Secrets belong in secure settings, never the archive, code, route params or documentation.
