# Android build and device evidence

8 November 2026. Application: actual Expo/React Native `apps/mobile`. Local verification workspace: `/workspace/glam-native-n1`; identifier `com.glambeauty.localverification` is a local test identifier, not a registered store package.

| Check | Result | Evidence/limitation |
| --- | --- | --- |
| Native source/typecheck | PASS | evidence/native-typecheck.txt |
| Android App photo handlers | PASS with native OS ports doubled | evidence/native-photo-after.txt; actual App handlers, unrelated UI and OS ports doubled |
| Existing native Auth/biometric lifecycle | PASS with doubles | evidence/native-auth-doubles.txt; not biometric hardware |
| Android JavaScript/Hermes export | PASS | evidence/native-js-exports-not-binaries.txt; not an APK |
| Fresh Android native prebuild | PASS | evidence/android-prebuild.txt; isolated workspace, no canonical source generated/overwritten |
| Local Gradle APK compilation | BLOCKED / build failed | evidence/android-compile.txt: 43 tasks executed; `:app:configureCMakeRelWithDebInfo[x86_64]` could not obtain React Native0.88.1 release AAR |
| Emulator/physical device | UNAVAILABLE / NOT TESTED | ADB attached-device list empty; emulator binary/system image and `/dev/kvm` absent |
| Local native screenshots/video | NOT PRODUCED LOCALLY | Actual remote emulator captures are listed below; browser images excluded |
| Store signing/publication | NOT ATTEMPTED | Real registered package/EAS/signing identifiers not configured |

Actual build command: `./gradlew :app:assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon --max-workers=2 -Dorg.gradle.jvmargs=-Xmx3072m`. JDK17, installed SDK37/NDK27, inherited proxy routing and a trusted Java CA bundle were used with TLS verification enabled. No application/backend secrets were needed or printed. Source snapshot checksums are in evidence/source-hashes.json.

The required Maven artifact redirected from `repo.maven.apache.org` to `repo.reactnative.dev/maven2/com/facebook/react/react-android/0.88.1/react-android-0.88.1-release.aar`, receiving403. The active environment revision3 does not allow `repo.reactnative.dev`. Activate an environment network configuration permitting that official host before retrying. Do not bypass TLS, substitute untrusted AARs, or mark the native build passing. Subsequent compilation/runtime defects remain possible once this dependency is accessible.

No APK/AAB was produced locally; the actual remote emulator APK result follows below. A local debug/test key, had compilation succeeded, would still not establish store signing readiness. Emulator/real-device camera, storage, permissions, background lifecycle, accessibility, deep links, push and real authenticated persistence still require actual execution. Native completion and launch readiness are not certified.

A separate `Native build verification` GitHub workflow now attempts actual unsigned iOS simulator compilation/startup on macOS and Android APK/emulator compilation/startup on Linux. It uses local verification IDs, no deployment secrets or store publication. Remote build/startup results are now recorded below; local blockers remain separate. A startup capture alone does not certify complete feature or hardware journeys.

## Actual remote result

GitHub run42516089742, job128839305125, sourceebaedd6378c12cd6e63c552671ea316e971d1a6c: **PASS** x86_64 APK compilation, emulator installation/launch and actual UIAutomator taps/captures of Home, Analyze, AI Studio, AI Advisor and Profile. Artifact `actual-android-apk-and-emulator-startup` contains the emulator APK, PNG/XML captures and build/runtime receipts. Native app/shared source trees match the independently successful iOS snapshot; see evidence/remote-native-results.json. No browser renderer was used.

The earlier run42514991945 failed to locate Home on its initial UI hierarchy. The rerun succeeded without changing apps/mobile or packages. Retain that first failure as an open startup/readiness reliability concern; do not claim it was a proven app bug fixed by diagnostics. Replace fixed-delay assumptions with native readiness checks in the next verification batch. These captures await visual review because the environment rejects the artifact-download host.

This APK targets an x86_64 emulator, not an ARM phone or Google Play release. Physical camera/permissions, biometrics, background/process-death recovery, real providers/persistence, every remaining screen and complete journeys remain NOT TESTED/unfinished. Native build/startup smoke PASS is not native feature completion.
