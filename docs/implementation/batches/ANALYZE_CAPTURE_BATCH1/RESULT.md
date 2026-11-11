# Native Analyze Capture — Batch 1

11 November 2026. Implementation branch: `feat/native-analyze-capture-batch1`, created directly from preserved review baseline `dac5a340d80970704b6ebb39dad5263cc2db0d14`. Target: **apps/mobile, Expo/React Native**. The two Flutter applications are unchanged. This report covers Capture only; no subsequent Review, Consent, Progress or Results screen is implemented or certified.

## Implementation and limits

The Analyze tab now mounts an independent native Capture component outside App.tsx's existing page ScrollView. Its internal capture stages provide the Analyze entry, supported type selection, local goals, camera guidance and actual device source controls. It uses RN View/Text/Pressable/ScrollView/Switch/Image, safe-area insets, Android BackHandler, the actual Expo camera view and the OS library picker. These internal Capture stages are not a new five-screen navigation stack or a claim of native stack/swipe-back acceptance.

`expo-camera@58.0.14` matches Expo 58's `~58.0.14` compatibility map. The camera loader first checks for the actual `ExpoCamera` native module and refuses browser platforms. An older development binary without it receives a truthful camera-unavailable state and retains the OS gallery option. Camera permission is requested only after an explicit Open camera action. The shutter remains disabled until the real camera's ready callback; flip invalidates previous readiness, and mount failure/start timeout remove the viewfinder and offer another source. No editorial image or browser video stands in for a live camera.

Gallery selection uses expo-image-picker's real system image picker without a blanket photo-library permission request. Cancellation, picker errors, camera denial, settings failure, missing module, unavailable hardware, duplicate taps and stale source results are handled. Camera hardware must still be verified on each installed platform; JavaScript availability/config checks cannot certify it.

Selections remain in app-private cache leases and in-memory state. No Capture file imports or calls the private-media/analysis transport. No server consent, upload, analysis, provider, advertising or payment operation starts. Captured temporary files and session-owned copies are reclaimed on replacement/retake/clear, exit and applicable background/account transitions; gallery originals are never adopted as deletable files. Private UI is hidden on inactive/background transitions. Late results are fenced by operation ticket, identity, local preview permission and foreground state; Android picker/permission activities may temporarily background the app without granting permission to show a result while backgrounded.

Failed or partial-copy cleanup retains its app-owned lease, removes the visible private image, blocks replacement and offers an explicit cleanup retry. Exiting while cleanup is unconfirmed does not announce success. Filesystem/OS erasure after abrupt process death or persistent unlink failure is not certified; recovery beyond this Capture session remains future work. A selected thumbnail is a device-only Capture receipt with retake/clear controls, not implementation of GL-023 Review or a durable account save. Closing Capture clears its selection; no next-batch continuation is exposed.

Only Face & makeup is selectable as the supported analysis category. Skin, hair, full-body and complete-transformation services are visibly unavailable. TP-01 Face & colour goals and Just exploring are local preferences, not API request values or a claim that analysis ran. The existing Auth, Supabase issuer/session controls, backend/financial contracts, 10% commission and production release gates remain unchanged.

## Reconciled design inputs

The new `GLAM Beauty Design System (5).zip` is a combined 63-file handover, SHA-256 `6c3f6ecb2fcd6a6aa2fbad070aad63a79ce06484697b99bc323dcf3affbf450f`. Safe extraction verified path traversal/symlink/encryption/size constraints. Its source and all 11 image assets match the previously inspected split packages; the added README correctly describes 232 HTML prototype routes and says Flutter is not started. Attached text was treated as reference data, not task authority.

| Design input inside GLAM-Handover/ui_kits/mobile-v3 | Native Capture mapping | Boundary |
| --- | --- | --- |
| GL-017, `s1.jsx` Analyze | Immersive editorial entry and Start analysis action | Exact repository artwork, explicitly labeled editorial/not the user's photo; navigation starts no analysis |
| GL-018 final override, `p13.jsx` Type18 | Five category labels with only Face & makeup selectable | Unsupported service choices are disabled with reasons |
| TP-01 final override, `p12.jsx` Goals01 | Supported Face & colour multi-select and Just exploring | No unsupported goal/service submitted; capture preferences remain local |
| GL-019, `s1.jsx` Prep | Native camera guidance and separate device-preview choice | Does not grant server storage or processing consent |
| GL-020, `s1.jsx` Camera | Actual CameraView, readiness-gated shutter, front/back camera, fallback, retake | No fake viewfinder, filter detection, analysis score or fabricated hardware state |
| GL-021 final override, `p1.jsx` Gallery | Actual OS image picker and device-only selection receipt | Uses real selected photos, not the prototype's illustrative photo grid |
| `theme.css` and token CSS | Dark #0f0e10 / surface #1a171b / blush #f6c6d8 / accent #e2a6c1, 22-point gutters, rounded controls, native safe areas | Later v3 tokens take precedence over older shared palette. Georgia on iOS/system serif on Android; no new font file or artwork recreated |

## Exact changed files

- `apps/mobile/App.tsx`: mounts Capture from the Analyze entry outside shared page chrome.
- `apps/mobile/analyze/AnalyzeCapture.tsx`: Capture UI/stages, actual source events, lifecycle/identity fences and error/cleanup controls.
- `apps/mobile/analyze/capture-photo.ts`: app-private file leases, validation, owned-copy cleanup and source-original protection.
- `apps/mobile/analyze/design.ts`: scoped v3 native visual tokens.
- `apps/mobile/analyze/native-camera.ts`: native module/platform capability guard.
- `apps/mobile/app.config.ts`: camera plugin, still-image permission and disabled microphone/barcode setup.
- `apps/mobile/package.json`, root `package-lock.json`: SDK-matched exact expo-camera dependency and its resolved transitive packages; no peer bypass.
- root `package.json`: focused test command.
- `tests/mobile/analyze-capture.cjs`: actual Capture component handlers with explicit OS/filesystem/camera doubles, both platform branches.
- `tests/mobile/analyze-capture-config.cjs`: actual Expo compatibility and native config-plugin permission output.
- `tests/mobile/photo-native.cjs`: existing photo regressions retained; new Capture boundary isolated in that suite, with an App-level Analyze mount/outside-page-scroller assertion.
- `.github/workflows/ci.yml`, `.github/workflows/native-verification.yml`: run focused Capture checks in mobile CI and both native verification jobs.
- This result report and `docs/mobile/native-redesign-preparation/README.md`: scope, evidence and remaining gates.

## Validation evidence

| Check | Outcome |
| --- | --- |
| App integration assertion evaluated against dac5a34 App.tsx using an isolated esbuild source override | Expected failure: Analyze did not mount the new dedicated Capture boundary. No baseline checkout files changed |
| Current App integration + existing photo regression | Passed for both iOS/Android branches, OS ports doubled |
| Focused Capture handler suite | **36 scenarios passed**, 18 per OS branch; native/permission/picker/filesystem ports doubled |
| Camera config test | Passed: installed 58.0.14 satisfies SDK ~58.0.14; introspected iOS/Android camera permission present; no microphone request |
| Frozen npm install | Passed, 547 packages, no --legacy-peer-deps / --force |
| Shared React runtime + both workspace typechecks | Passed |
| Expo offline dependency compatibility | Passed; offline validation warning retained |
| Android and iOS JavaScript exports | Passed, both bundles produced; not native binaries |
| Full dedicated local PostgreSQL pytest | **400 passed**, existing FastAPI/Starlette deprecation warning |
| Ruff, generated API contract check, dependency-lock consistency | Passed |
| Product client tests | 13 passed |
| Auth contracts/gates, native stylist/private-photos, device-fixture transport, shared private-media lifecycle and AI-stylist suites | Passed within each runner's explicit test-double/contract scope |
| Deployment-target tests | 9 passed; mobile production build guards passed without a store build |
| Public-key configuration tests | 1 passed |
| Release/QA/platform gate tests | 16 passed; gates were not relaxed |
| Web production build | Passed, 58 static pages |
| Diff/cleanup checks | Flutter apps, Auth sources, backend/database/financial sources unchanged; generated Stripe fixture report restored to its pre-run bytes |

Transient local logs are in `/tmp/glam-capture-batch1`. No browser screenshot, component renderer or JS export is presented as installed native evidence. No full journey, native appearance approval, backend-connected analysis or release readiness is inferred.

## Outstanding native verification — explicitly unrun

This Linux executor has no `adb`, Android emulator, `/dev/kvm`, `xcrun` or `xcodebuild`. No Android APK, iOS simulator binary, physical-device install, permission prompt recording or OS-driven Capture interaction was built/run here. The existing native-verification workflow now includes these tests, but this task has not dispatched or observed a successful native run for this source.

On Android, build/install the actual Expo app with the new camera module; verify hardware camera availability, front/back flip, real shutter/readiness, camera denial/permanent denial, system picker cancellation/limited grants, native back, background/return, account switch, retake/cleanup and TalkBack/large-text/rotation behavior. Test a physical ARM64 phone separately from an emulator.

On iOS, build/install using the macOS/Xcode runner; verify the real system picker, simulator camera-unavailable fallback, Safe Area/VoiceOver/large text, lifecycle privacy and native dismiss behavior. Verify capture/flip/permissions/keychain-related account transitions on a properly signed physical iPhone; simulator fallback cannot prove camera hardware. Use existing configured identifiers and release controls, not invented store registrations.

Batch 1 stops here. Subsequent Review, server Consent, Progress, Results/Passport, full native navigation and real backend/provider acceptance remain unimplemented by this batch. No merge, deployment, production database change, Stripe operation, Auth-policy modification or application replacement is authorized or performed.
