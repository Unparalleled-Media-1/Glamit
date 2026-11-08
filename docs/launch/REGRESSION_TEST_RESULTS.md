# Final cross-platform regression results

The candidate is not 100% built or launch-ready. Related passing checks do not close incomplete feature journeys. Source base: `d38cf16`; current repair is bound by `evidence/final/source-hashes.json`.

| Check | Result | Evidence and limit |
| --- | --- | --- |
| Real local PostgreSQL backend | PASS: 273 tests | backend-tests.txt; dedicated local `_test` DB, no production writes |
| Actual local FastAPI process | PASS: 46 HTTP checks | local-api.json; validates live/readiness and rejected unauthenticated operations, not real signed-in journeys |
| Web production build + both TypeScript projects | PASS | web-build.txt, typecheck.txt |
| Independent iOS JS bundle | PASS | ios-export.txt; **not IPA or simulator/device** |
| Independent Android JS bundle | PASS | android-export.txt; **not APK or emulator/device** |
| Android native generation | PASS after appearance fix | android-prebuild-before.txt and android-prebuild-after.txt |
| Actual Android Gradle APK compile | BLOCKED | android-compile.txt;75 tasks reached, official React Native AAR fetch denied at repo.reactnative.dev; no APK produced |
| iOS native compile and both physical devices | BLOCKED / NOT TESTED | No macOS/Xcode/EAS/signing/registered application identifiers or connected devices |
| Eight-width public route crawl | PASS: 344 visits,7601 observed control occurrences | clickthrough.json;43 routes×8 widths; zero detected overflow, broken images, HTTP/page/console errors and axe violations |
| Credential-independent web behavior | PASS:12 application groups | web-functional.txt; browser states, not live AI/payment |
| Real photo controls | PASS:9 named browser checks | photo-tests.txt; synthetic camera, no real hardware or private server upload |
| Original logo/favicon/app assets | PASS:43 assertions | artwork-tests.txt; installed native binary and deployed artwork remain unverified |
| Private dashboard entry, organization/staff fail-closed | PASS locally | workspace-tests.txt; fixtures/layout review separated from actual guest SSR |
| Auth/biometric session contracts | PASS as labeled doubles | auth-tests.txt; not real provider callbacks or physical biometric prompts |
| Analysis→try-on→catalog→checkout contracts | PASS as labeled doubles | connection-contracts.txt; does not make disconnected application/provider operations operational |
| Older12/15 and new20 release checks | PASS:16 validator tests | gates-after.txt; final-gate-before.txt reproduces earlier acceptance gap; synthetic green records are not release evidence |
| Frozen dependency/React/Python version guards | PASS | lockfiles.txt; expo-system-ui pinned58.0.7 |
| Ruff + formatting | PASS | ruff.txt and format.txt |
| Current-source/client-bundle configured-secret scan | PASS, limited scope | secret-scan.json; not full history or remote credential rotation proof |
| Local browser timing | OBSERVED | local-performance.json; contended lab, no production CWV/INP/load certification |
| Anonymous safe-action pass | COMPLETE:1909 control checks |1358 changed UI,31 observed idempotent,434 skipped,68 blocked,18 no content delta on current-page navigation;0 thrown action failures; not feature persistence |
| Actual deployed Railway journey | BLOCKED_ACCESS | deployed-clickthrough.json; zero qualified deployed critical journeys |
| Actual Stripe test money/fees/reconciliation | BLOCKED | remote-readiness.json; current key is live mode; zero payment mutations |

No production load testing, migration0014, auth configuration change, payment activation, public deployment or domain switch occurred. Public launch remains locked. Detailed per-feature and platform acceptance is in COMPLETE_FEATURE_MATRIX.csv and the four final platform/parity reports.

The18 no-observed-content-change outcomes are current-page navigation controls (cart/checkout/order steps, Event/Advisor, profile, privacy and Complete-the-Look). Their source handlers navigate/focus the current route; raw outcomes remain unpromoted.434 skipped controls and68 blocked controls are not counted as tested passes. Authenticated conditional controls and native controls remain untested.

The native store preflight also had a confirmed wrong filename: it required missing `splash.png` rather than the app-configured `wordmark.png`. The added regression fails before and passes after that minimal workflow correction; signing/native runtime remains unverified. Final frozen reinstall adds541 packages and both independent exports pass again.

GitHub Foundation checks also pass on source head `6f489df614a79e93f3c3b6ec6e110618d75fb096`: changes, backend, web, mobile JavaScript and aggregate clients. Hosted API checks were correctly skipped for unchanged Edge source. Run: https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42493068037 . This CI result is not native binary/device, live-provider or product-completeness acceptance.
