# GLAM Beauty — Flutter F1

Independent Flutter/Dart visual and interaction milestone. This is not a completed replacement for all existing native functionality.

Five genuine Flutter screens use go_router native navigation stacks and Riverpod local preview state. No React Native layout, web page or WebView is reused. Images/artwork and colour values are retained brand assets. Cormorant Garamond and Manrope are bundled locally with their SIL Open Font Licenses under assets/fonts.

This build does not initialize Supabase, OpenAI, payments or any backend. Camera/gallery access, biometric credentials and all authenticated operations are F2, after explicit visual approval. No production consent, eligibility, identity or financial record is created. The monochrome slider is a local colour study; it is not virtual try-on. Bookmarks and briefs last only for the preview session.

Use Flutter3.47.9. From the repository root:

```sh
bash scripts/flutter/bootstrap-platforms.sh
cd apps/flutter_app
flutter pub get
dart run flutter_launcher_icons
flutter analyze --no-fatal-infos
flutter test
flutter run -d <native-device-id>
```

The bootstrap generates native shells from the pinned official SDK without overwriting authored Dart. CI resolves one lock and shares it between iOS/Android. Generated native inputs, exact lock, OS-driven installed screenshots/videos, logs and binary receipts are retained. Local SDK setup is presently network-blocked; do not claim local Dart analysis or device verification from source inspection.

Review identifier: com.glambeauty.visualreview, unregistered/local-only. Android output is a CI debug-signed x86_64 emulator APK (API35), not an ARM-phone or approved store build. The iOS .app ZIP targets simulators and is not an .ipa/TestFlight build. Store identifiers, developer teams, signing and physical-device verification remain separate requirements.

Stop after actual F1 screenshots and interactions for user visual approval. Do not continue functional migration or merge/deploy until authorized. Canonical services, Expo source and financial rules remain unchanged.

Native F1 capture uses Maestro on the normal lib/main.dart application. The earlier Flutter test-binding capture harness is retained in Git history; its failed/partial outputs are not accepted as this milestone. The six widget tests and the OS-driven journey must both pass before native interaction evidence is accepted.

## Running the retained native review builds

Download each platform artifact from the [successful sourceabfad3e verification run](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42634999178), also linked in `docs/implementation/batches/FLUTTER_F1/STATUS.md`. Both independent OS interaction jobs passed at that source; appearance approval is pending. These are review builds, not store releases.

Android requires a running x86_64 Android emulator (the CI reference is API35). Install the artifact's tested APK:

```sh
adb install -r distribution/glam-beauty-f1-android-x64-emulator.apk
adb shell monkey -p com.glambeauty.visualreview 1
```

iOS requires macOS/Xcode and a booted compatible iPhone simulator. Extract `glam-beauty-f1-simulator.zip`, then:

```sh
xcrun simctl install booted Runner.app
xcrun simctl launch booted com.glambeauty.visualreview
```

The artifact root contains `01-home.png` through `05-profile.png`, `interaction.mp4`, source/runtime receipts and logs after the full OS flow passes. Inspect that platform's job result and receipt rather than assuming compilation or artifact upload proves interaction success. Neither artifact installs on a physical iPhone/ARM Android phone as a published application.
