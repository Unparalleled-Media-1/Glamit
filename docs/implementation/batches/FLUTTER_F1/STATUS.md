# Flutter F1 — appearance REJECTED; revision pending native verification

The user rejected the previous appearance on 10 November as still resembling mobile web. The next revision replaces the promotional Home, scroll-page Analyze/Studio, large Profile promotional block and inset Discover card with task-focused native compositions and platform tab bars. New native verification is required; prior passes below apply only to the rejected candidate. F2 remains paused.

The previous independent five-screen Flutter app passed Dart analysis, all six widget tests and separate installed Android/iOS OS-driven journeys at source **`abfad3e96e09a24750b3dd7c5bb56d1e3caaa202`**. This is the tested application source, not a claim that later documentation-only commits were installed. [Successful verification run](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42634999178).

| Measure | Current evidence |
| --- | --- |
| F1 implementation | Home, Analyze, Studio, Discover and Profile are genuine independent Flutter widgets with go_router navigation and Riverpod session-local state |
| Source checks | Dart analysis and all six widget tests PASS, including two phone sizes,2x system text, native sheets and the local brief/bookmark/detail/Profile collection journey |
| Android | PASS: actual installed main-entry app, API35 x86_64 emulator, OS interaction flow, five screenshot validations, runtime and package checks |
| iOS | PASS: actual installed main-entry app, iPhone simulator, separate OS flow, five screenshot validations, runtime and bundle-identifier checks |
| Visual inspection/comparison | NOT REVIEWED here: executor cannot download signed artifacts under enforced network policy |
| User visual approval | PENDING; F1 acceptance remains OPEN |
| F2/backend/Auth/camera/provider operations | NOT CONNECTED in Flutter; deferred until explicit visual approval |
| Physical devices/store signing | NOT TESTED / NOT CONFIGURED |
| Production/launch | NOT CHANGED / NOT ESTABLISHED |

## Native review packages

- [Android: five native screenshots, OS recording, tested x86_64 emulator APK, source/runtime receipts](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42634999178/artifacts/13681844657).
- [iOS: five native screenshots, OS recording, simulator application ZIP, source/runtime receipts](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42634999178/artifacts/13682947604).
- [Resolved native inputs and the single dependency lock shared by both builds](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42634999178/artifacts/13681574019).
- [Source-check logs](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42634999178/artifacts/13681184775).

Main screenshots: `01-home.png`, `02-analyze.png`, `03-studio.png`, `04-discover.png`, `05-profile.png`. Additional captures cover the native photo sheet, detail navigation and saved collection. `interaction.mp4` retains OS recording; `receipt.json`, SDK/source metadata, hashes and runtime logs identify the tested application. Installation instructions are in apps/flutter_app/README.md. These are emulator/simulator review packages, not ARM-phone, physical-iPhone, store or TestFlight releases.

The automated native checks validate the required PNG headers/sizes and record hashes; this is not an appearance review. Artifact metadata and successful individual job steps are retained in `evidence/native-acceptance-abfad3e.json`. The executor's enforced network policy rejects fresh signed Azure artifact downloads. The saved network draft is not activated by saving it. No inline screenshot viewing, recording inspection, or visual comparison against Expo is claimed. That comparison and the user's design decision remain outstanding before acceptance.

## Scope and design provenance

Brand colours come from packages/product/consumer-design.json: ivory#f8f3ef, blush#f6c6d8, rose#b76d8c, mauve#78546c, charcoal#181719, champagne#dcc7a8, ink#30252d, muted#786772, line#dfd1d5. Original approved logos/editorial assets are retained. New compositions use bundled Cormorant Garamond and Manrope fonts with their OFL licenses. Source inspection confirms Flutter widgets, not WebViews, HTML or JSX layout templates; appearance approval requires the actual captures.

The older Expo artifact SHA803e28ea5fc255a068452bbb8bc8dd2400ded9c6 resolves to a merge of31d8ac4 into c8b74a8; base7216423 contains that implementation via PR43. PR44 remains separately preserved. No old app source was merged, deleted or represented as Flutter evidence. Existing web/mobile/backend/Auth/database/financial files remain unchanged. Preview briefs/bookmarks are session-local; the Studio monochrome control is an on-device colour study, not AI try-on. No camera, account, AI, merchant or transaction success is fabricated.

The user's mandatory gate in [the exact directive](../../../specification/sources/2026-11-flutter-final-directive.txt) is: “STOP after this visual milestone and wait for explicit approval of the mobile design.” F2 is not started; draft PR45 remains unmerged. No production, signing registration, migrations, deployment, live AI or payments were changed.

## Preserved failed and superseded attempts

Earlier partial, failed and superseded runs below remain failures; the subsequent successful run does not rewrite their evidence.

Sourcea44a173 passed Dart analysis and all five widget tests, including compact/large phone layouts and2x system text. Its Android binary compiled/installed and captured Home, Analyze, photo sheet and Studio, then the native test failed at the unit-only TestTextInput.hide API (isRegistered=false). A real outside-field tap/focus dismissal replaces that test API; production input code also exposes the native Done action. This is a confirmed installed-test repair, not a passed full native milestone.

An additional host-callback OS screenshot path was rejected during SDK source review: Flutter's native screenshot callbacks are delivered after test completion, so an OS capture there can show the wrong screen. It is removed before acceptance. Only the official per-step native Flutter screenshots and separately recorded OS video qualify; no late OS still is accepted or represented as a per-screen capture.

The accepted evidence method is now real OS-driven Maestro input on the normal lib/main.dart Flutter app. The earlier test-binding capture/driver files are removed from the candidate but preserved in Git history together with failed/partial-run metadata. Their status is not upgraded to PASS. The same local brief→saved edit→detail back stack→Profile collection journey is added to widget coverage and the native OS flow, with explicit semantic IDs. Native success still requires the complete equivalent flow, all five system screenshots, runtime-error checks and exact tested binary receipts. No test is skipped to claim functional acceptance. The failure annotation limit is reduced below GitHub's4096-character truncation so the actual end of a failed run is retained.

Source6584cc5 passed Dart analysis and all six widget tests including the full local brief/save/detail-back/Profile round trip. Its real OS automation launched the Android main-entry Flutter app and located the native Home semantic ID. It stopped at Maestro's screenshot output-directory safety check. The flow now uses relative screenshot names and collects originals only from inside the configured run-output tree. No output-directory restriction is weakened, and no partial capture is marked as five-screen success. Android's retained tested APK is explicitly x86_64/emulator-only; ARM-phone distribution and physical-device verification remain separate.

Source49ab618 iOS failure is retained in `evidence/ios-brief-status-annotations.json`. The OS flow reached three main screens and the native photo sheet, entered a brief, then could not locate the full confirmation text. This does not establish whether state saving or cross-platform accessibility matching caused the failure. The next run verifies the entered value, the conditional saved-state ID and the updated button text; it retains the full saving requirement rather than accepting an unverified tap.
