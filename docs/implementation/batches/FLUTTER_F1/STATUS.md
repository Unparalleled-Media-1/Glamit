# Flutter F1 — OPEN, not visually approved

New Flutter frontend source, five screens, native navigation, local preview interactions and installed-device evidence runner are implemented. No Flutter compiler/test/native-runtime result is claimed yet. Local official SDK download was denied by the execution environment's network policy; a preserved network draft adds storage.googleapis.com and actual artifact/log hosts, but is not activated by saving it.

Brand colours: ivory#f8f3ef, blush#f6c6d8, rose#b76d8c, mauve#78546c, charcoal#181719, champagne#dcc7a8, ink#30252d, muted#786772, line#dfd1d5 from packages/product/consumer-design.json. Reused assets are approved artwork/editorial imagery, not old layouts. All UI is authored as independent Flutter widgets. Fonts are local Cormorant Garamond/Manrope with their OFL licenses.

The reviewed older Expo artifact SHA803e28ea5fc255a068452bbb8bc8dd2400ded9c6 resolves on GitHub to a merge of native implementation31d8ac4 into c8b74a8. Current base7216423 contains that implementation through merged PR43. PR44's later acceptance fixes remain separately preserved; they are not merged, deleted or represented as Flutter work. Existing Expo startup/failed journey artifacts are historical and do not qualify this Flutter milestone.

| Measure | Current status |
| --- | --- |
| F1 source implementation | Five Flutter screens and local interactions present; compilation/tests pending |
| Functional verification | Shell/YAML/Python checks only; Dart/native CI pending |
| Android Flutter installed runtime | NOT TESTED |
| iOS Flutter installed runtime | NOT TESTED |
| Visual comparison/approval | NOT REVIEWED; explicit user approval required |
| Full platform/F2 functionality | NOT IMPLEMENTED in Flutter; intentionally outside F1 |
| Physical devices/store signing | NOT CONFIGURED / NOT TESTED |
| Production/launch | NOT AUTHORIZED / NOT ESTABLISHED |

The mandatory stop is the user's explicit visual gate in docs/specification/sources/2026-11-flutter-final-directive.txt: “STOP after this visual milestone and wait for explicit approval of the mobile design.” Build success cannot approve the appearance. No production migration, settings, live AI/payment, deployment or old-mobile merge/deletion occurs here.

Sourcea44a173 passed Dart analysis and all five widget tests, including compact/large phone layouts and2x system text. Its Android binary compiled/installed and captured Home, Analyze, photo sheet and Studio, then the native test failed at the unit-only TestTextInput.hide API (isRegistered=false). A real outside-field tap/focus dismissal replaces that test API; production input code also exposes the native Done action. This is a confirmed installed-test repair, not a passed full native milestone.

An additional host-callback OS screenshot path was rejected during SDK source review: Flutter's native screenshot callbacks are delivered after test completion, so an OS capture there can show the wrong screen. It is removed before acceptance. Only the official per-step native Flutter screenshots and separately recorded OS video qualify; no late OS still is accepted or represented as a per-screen capture.
