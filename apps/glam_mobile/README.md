# GLAM Beauty — controlled Analyze restart

One independent Flutter/Dart Analyze feature in progress. This is not the rejected five-screen preview and is not a completed application. The live photo→analysis→saved account journey remains blocked until the canonical backend is deployed/qualified and an authorized test account is available.

The existing Expo app, rejected apps/flutter_app, website and backend are preserved. This project imports none of their layouts. It selectively adapts the authenticated contracts in packages/product/private-media.ts and analysis.ts and the original Supabase identity rules.

## Run/build

Use official Flutter3.47.9, then from the repository root:

```sh
bash scripts/analyze-restart/bootstrap.sh
cd apps/glam_mobile
flutter pub get
dart run flutter_launcher_icons
flutter analyze --no-fatal-infos
flutter test
flutter run -d <device-id> --dart-define-from-file=/secure/glam-public-build.json
```

The public build-settings file has two fields: GLAM_API_ORIGIN (a qualified HTTPS origin serving the canonical /v1 media/analysis routes) and SUPABASE_PUBLIC_KEY (original project's publishable key or legacy anon key). Deliver it through secure build configuration. Never include passwords, bearer/refresh tokens, service-role/Management keys or provider keys. No credential values or .env files are committed.

Supabase Auth is pinned to original project bkkmsbxrxkqaveymcrgi. This build supports an existing email account because read-only configuration checks showed email enabled and phone/social disabled. It checks current provider availability before login. It does not create users or activate providers. Supabase verifies credentials and user identity; server APIs enforce eligibility, consent, ownership and permissions.

Tokens remain in RAM, refresh only within the foreground session and are cleared on lock/background. No biometric persistence is enabled. After background/relaunch, fresh sign-in can reopen the account-scoped pending job or canonical saved Passport. OS-protected storage retains only recovery metadata; passwords, tokens, photo bytes and reports are not persisted there. User-triggered sign-out requests Supabase local-scope revocation and reports separately if server revocation or local cleanup cannot be confirmed.

Camera/gallery are actual platform plugins. Selected media is bounded, normalized to PNG and stripped of metadata. Only plugin copies inside the app's private temporary/cache directories may be removed; gallery originals are not deleted. In-memory photos and decoded image-cache entries are cleared on relevant exits/background/expiry. Physical-device snapshot/privacy behavior still requires device verification.

Uploads require authenticated eligibility, current server policy text, two explicit consent choices, server-confirmed grants and qualified media/analysis status. Actual jobs supply processing, confidence/uncertainty, report/correction and revision-checked Passport state. Ambiguous job submissions are recovered with the original request key only after explicit user action. No automatic billable retry, fake report, reference face, fixture provider or local-only save substitutes for server results.

The backend currently returns face-feature/undertone observations. Separate skin/hair analysis is not claimed. Complete upload-interruption/retention/privacy and backend integration still need live acceptance; no full privacy/product acceptance is inferred from source.

## Native review evidence

The dedicated read-only CI workflow resolves one native dependency lock for both OSes, builds independent binaries, installs the actual app and records real OS source interactions. Android exercises camera permission/capture/review/back. iOS exercises simulator camera capability/fallback, actual photo-library selection and swipe-back. Its colour-gradient library fixture exists only under test/ and is injected into the disposable simulator; it is not bundled in the app or sent for analysis. All contract response fixtures remain test-only.

Native input/generated platform sources and exact pubspec.lock are retained with CI artifacts. The Android artifact contains two separate debug-signed APKs: `glam-analyze-x64-emulator.apk` (exercised in the x86_64 emulator) and `glam-analyze-arm64-review-UNTESTED.apk` (compiled and signature-checked, not run on a phone). The iOS ZIP is a simulator .app, not TestFlight or a physical-iPhone build. Store IDs/teams, signing registration, physical-device usability, real Supabase login/upload/provider/save and launch acceptance are separate unpassed gates.

Analysis history loads actual server jobs for the authenticated account. Reopening retrieves the report and its private PNG through authenticated canonical API endpoints, with owner/session/expiry checks. A transport error offers retry; revoked or expired media clears the private record. No local report list or bundled portrait substitutes for account history. These operations pass isolated API-contract tests; deployed acceptance remains blocked.

Stop after the first real Analyze feature for explicit design approval before Studio, Discover, Home, Profile or full-app expansion. No automatic production migration, deployment or replacement.

Latest continuation evidence and exact package links are in docs/implementation/batches/ANALYZE_HISTORY/RESULT.md; the earlier baseline is in docs/implementation/batches/ANALYZE_RESTART/RESULT.md. For an ARM64 Android phone with USB debugging enabled, use `adb install -r glam-analyze-arm64-review-UNTESTED.apk`; for the tested x86_64 emulator package use `adb install -r glam-analyze-x64-emulator.apk`. On macOS, extract the simulator ZIP and run `xcrun simctl install booted Runner.app`, then `xcrun simctl launch booted com.glambeauty.analyzereview`. These commands install a review application; they do not register/publish a store app or make unavailable backend operations functional. Both Android packages share the review application ID, so installing one replaces the other for that device; do not install over an account-bearing app without checking its ID first.
