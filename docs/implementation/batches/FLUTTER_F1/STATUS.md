# Flutter F1 — OPEN, not visually approved

Five independent Flutter screens, native navigation and reversible local preview interactions are implemented. At source `49ab61872f24d5fd9a73e3afd90c3cd8f5dd5bfa`, Dart analysis and all six widget tests pass. Android's installed main-entry Flutter app passed the complete OS-driven journey, all five required screenshot checks, runtime-error checks and installed-package verification. iOS compiled and installed, then failed its post-save brief confirmation after capturing Home, Analyze and Studio. Its full five-screen journey has not passed. A targeted follow-up adds an explicit saved-state semantic identifier and verifies the actual typed brief before saving; the complete iOS/Android journey must pass again at the changed source. No visual approval is inferred from these checks.

[Exact verification run](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42631958289). [Android screenshots, video, tested emulator APK and receipts](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42631958289/artifacts/13682166648). This executor cannot download the artifact because its fresh signed Azure download host is denied by the enforced network policy. The saved network draft is not active merely because it was saved. No screenshot visual inspection or comparison against Expo is claimed.

Brand colours: ivory#f8f3ef, blush#f6c6d8, rose#b76d8c, mauve#78546c, charcoal#181719, champagne#dcc7a8, ink#30252d, muted#786772, line#dfd1d5 from packages/product/consumer-design.json. Reused assets are approved artwork/editorial imagery, not old layouts. All UI is authored as independent Flutter widgets. Fonts are local Cormorant Garamond/Manrope with their OFL licenses.

The reviewed older Expo artifact SHA803e28ea5fc255a068452bbb8bc8dd2400ded9c6 resolves on GitHub to a merge of native implementation31d8ac4 into c8b74a8. Current base7216423 contains that implementation through merged PR43. PR44's later acceptance fixes remain separately preserved; they are not merged, deleted or represented as Flutter work. Existing Expo startup/failed journey artifacts are historical and do not qualify this Flutter milestone.

| Measure | Current status |
| --- | --- |
| F1 source implementation | Five Flutter screens and local interactions compile; F2 remains outside this gate |
| Functional verification | Dart analysis and six widget tests PASS; Android OS journey PASS; iOS post-save confirmation FAIL; targeted rerun pending |
| Android Flutter installed runtime | PASS on API35 x86_64 emulator, source49ab618; five OS screenshots and recording retained |
| iOS Flutter installed runtime | Built/installed; failed post-save confirmation; partial screenshots only |
| Visual comparison/approval | NOT REVIEWED; explicit user approval required |
| Full platform/F2 functionality | NOT IMPLEMENTED in Flutter; intentionally outside F1 |
| Physical devices/store signing | NOT CONFIGURED / NOT TESTED |
| Production/launch | NOT AUTHORIZED / NOT ESTABLISHED |

The mandatory stop is the user's explicit visual gate in docs/specification/sources/2026-11-flutter-final-directive.txt: “STOP after this visual milestone and wait for explicit approval of the mobile design.” Build success cannot approve the appearance. No production migration, settings, live AI/payment, deployment or old-mobile merge/deletion occurs here.

Sourcea44a173 passed Dart analysis and all five widget tests, including compact/large phone layouts and2x system text. Its Android binary compiled/installed and captured Home, Analyze, photo sheet and Studio, then the native test failed at the unit-only TestTextInput.hide API (isRegistered=false). A real outside-field tap/focus dismissal replaces that test API; production input code also exposes the native Done action. This is a confirmed installed-test repair, not a passed full native milestone.

An additional host-callback OS screenshot path was rejected during SDK source review: Flutter's native screenshot callbacks are delivered after test completion, so an OS capture there can show the wrong screen. It is removed before acceptance. Only the official per-step native Flutter screenshots and separately recorded OS video qualify; no late OS still is accepted or represented as a per-screen capture.

The accepted evidence method is now real OS-driven Maestro input on the normal lib/main.dart Flutter app. The earlier test-binding capture/driver files are removed from the candidate but preserved in Git history together with failed/partial-run metadata. Their status is not upgraded to PASS. The same local brief→saved edit→detail back stack→Profile collection journey is added to widget coverage and the native OS flow, with explicit semantic IDs. Native success still requires the complete equivalent flow, all five system screenshots, runtime-error checks and exact tested binary receipts. No test is skipped to claim functional acceptance. The failure annotation limit is reduced below GitHub's4096-character truncation so the actual end of a failed run is retained.

Source6584cc5 passed Dart analysis and all six widget tests including the full local brief/save/detail-back/Profile round trip. Its real OS automation launched the Android main-entry Flutter app and located the native Home semantic ID. It stopped at Maestro's screenshot output-directory safety check. The flow now uses relative screenshot names and collects originals only from inside the configured run-output tree. No output-directory restriction is weakened, and no partial capture is marked as five-screen success. Android's retained tested APK is explicitly x86_64/emulator-only; ARM-phone distribution and physical-device verification remain separate.

Source49ab618 iOS failure is retained in `evidence/ios-brief-status-annotations.json`. The OS flow reached three main screens and the native photo sheet, entered a brief, then could not locate the full confirmation text. This does not establish whether state saving or cross-platform accessibility matching caused the failure. The next run verifies the entered value, the conditional saved-state ID and the updated button text; it retains the full saving requirement rather than accepting an unverified tap.
