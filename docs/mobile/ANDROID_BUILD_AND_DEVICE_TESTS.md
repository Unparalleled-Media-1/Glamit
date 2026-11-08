# Android build and device evidence

8 November 2026. Application: actual Expo/React Native `apps/mobile`. Local verification workspace: `/workspace/glam-native-n1`; identifier `com.glambeauty.localverification` is a local test identifier, not a registered store package.

| Check | Result | Evidence/limitation |
| --- | --- | --- |
| Native source/typecheck | PASS | evidence/native-typecheck.txt |
| Android App photo handlers | PASS with native OS ports doubled | evidence/native-photo-after.txt; actual App handlers, unrelated UI and OS ports doubled |
| Existing native Auth/biometric lifecycle | PASS with doubles | evidence/native-auth-doubles.txt; not biometric hardware |
| Android JavaScript/Hermes export | PASS | evidence/native-js-exports-not-binaries.txt; not an APK |
| Fresh Android native prebuild | PASS | evidence/android-prebuild.txt; isolated workspace, no canonical source generated/overwritten |
| Actual Gradle APK compilation | BLOCKED / build failed | evidence/android-compile.txt: 43 tasks executed; `:app:configureCMakeRelWithDebInfo[x86_64]` could not obtain React Native0.88.1 release AAR |
| Emulator/physical device | UNAVAILABLE / NOT TESTED | ADB attached-device list empty; emulator binary/system image and `/dev/kvm` absent |
| Native screenshots/video | NOT PRODUCED | No installed runnable native binary/device; browser images excluded |
| Store signing/publication | NOT ATTEMPTED | Real registered package/EAS/signing identifiers not configured |

Actual build command: `./gradlew :app:assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon --max-workers=2 -Dorg.gradle.jvmargs=-Xmx3072m`. JDK17, installed SDK37/NDK27, inherited proxy routing and a trusted Java CA bundle were used with TLS verification enabled. No application/backend secrets were needed or printed. Source snapshot checksums are in evidence/source-hashes.json.

The required Maven artifact redirected from `repo.maven.apache.org` to `repo.reactnative.dev/maven2/com/facebook/react/react-android/0.88.1/react-android-0.88.1-release.aar`, receiving403. The active environment revision3 does not allow `repo.reactnative.dev`. Activate an environment network configuration permitting that official host before retrying. Do not bypass TLS, substitute untrusted AARs, or mark the native build passing. Subsequent compilation/runtime defects remain possible once this dependency is accessible.

No APK/AAB was produced. A local debug/test key, had compilation succeeded, would still not establish store signing readiness. Emulator/real-device camera, storage, permissions, background lifecycle, accessibility, deep links, push and real authenticated persistence still require actual execution. Native completion and launch readiness are not certified.
