# Native verification gate — blocked, not passed

11 November 2026. Canonical app: **`apps/mobile`, Expo / React Native**. `apps/glam_mobile` and `apps/flutter_app` remain unchanged. No production system, store deployment, payment or authentication policy was modified.

## Preserved Capture baseline

Git remote inspection returned:

```text
7ad9c01e1f0553a8eb153da3d0fa96950c6b1a16 refs/heads/feat/native-analyze-capture-batch1
```

That branch was not rewritten. The newer master reskin request is preserved in [REQUEST.md](REQUEST.md) and authorizes the separate `feat/native-reskin-v3` implementation branch from this baseline. Work on this branch is not evidence that the exact baseline binary passed device acceptance.

## Actual Android attempt at exact baseline SHA

An isolated source snapshot was created with `git archive` at the exact SHA; no extra Git worktree or production project was created. Frozen npm installation and Expo Android prebuild succeeded. Generated native projects and SDKs remain outside the checkout under `/workspace/native-verification/`.

| Item | Observed value |
| --- | --- |
| Source | `7ad9c01e1f0553a8eb153da3d0fa96950c6b1a16` |
| Expo / React Native / React | `58.0.23` / `0.88.1` / `19.3.0` |
| Expo camera | `58.0.14` |
| Local package / bundle ID | `com.glambeauty.localverification` |
| Java | Temurin `17.0.21+9`; Java 21 alone could not satisfy the Gradle toolchain |
| Gradle | `9.4.1`, official distribution checksum verified |
| Android platform / build tools | `37.0` / `37.0.0` |
| NDK / CMake | `27.1.12297006` / `3.22.1` |
| Attempted ABI | `arm64-v8a` for a physical Android test APK |
| Executed native tasks | 48 |
| Result | **FAILED: React Native AAR download HTTP 403** |
| APK / binary hash | None produced |
| Installed GLAM app / hardware camera test | Not executed |

Command from the generated snapshot's `apps/mobile/android` directory:

```sh
JAVA_HOME=/workspace/native-verification/jdk17/jdk-17.0.21+9 \
ANDROID_HOME=/workspace/native-verification/android-sdk \
ANDROID_SDK_ROOT=/workspace/native-verification/android-sdk \
ANDROID_USER_HOME=/workspace/native-verification/android-sdk/user \
GRADLE_USER_HOME=/workspace/native-verification/gradle-home \
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2
```

[Retained build log](evidence/7ad9c01-android-build.txt) records the actual failing dependency:

```text
com.facebook.react:react-android:0.88.1
https://repo.reactnative.dev/maven2/com/facebook/react/react-android/0.88.1/react-android-0.88.1-release.aar
Received status code 403 from server: Forbidden
```

The Maven Central URL redirects to that host. TLS and checksum verification were retained; no dependency downgrade or network-policy bypass was attempted. `expo-camera` was discovered/configured in native tasks, but **this does not prove it was compiled into a finished APK or operated on hardware**.

An isolated API-35 Google APIs x86_64 AVD and software emulator were started. This host has no KVM. ADB initially needed permission to create its local debugging directory; the approved ADB escalation started the daemon. The boot-complete probe did not return `1`, and no GLAM package was installed. The task-owned emulator was stopped. There is no emulator Capture acceptance evidence.

## GitHub workflow and permissions

`.github/workflows/native-verification.yml` exists on the Capture branch and remote default branch. It supports branch-specific `workflow_dispatch` without merging, production deployment or app-store publication. Jobs need `contents: read`; the actor dispatching needs repository Actions write access. Checkout ref and recorded source SHA must agree.

GitHub API/CLI attempts to inspect runs or dispatch were blocked by HTTP 403 to **`api.github.com`**. No run ID, successful status or hosted artifact URL was obtained. This is not evidence that no historical runs exist.

The current implementation branch makes three verification-only repairs:

- Android startup smoke explicitly closes full-screen Capture before seeking the next tab and accepts the actual old/new Studio and Discover/Advisor tab labels.
- Android builds include both `x86_64` and `arm64-v8a` and retain an APK SHA-256 receipt.
- iOS retains the unsigned simulator `.app` as a ZIP. New reskin component/session tests run in CI.

These workflow repairs have not run on GitHub. They do not retroactively change a workflow at the immutable baseline SHA. Default startup smoke still does **not** certify camera permissions, shutter, gallery, privacy or a full Passport journey. The older `device_journey` harness expects old selectors and must be reconciled with the new navigation before it can certify the reskin. Do not treat an old harness failure as proof of a camera defect or weaken acceptance to hide it.

After allowed-domain settings are applied, inspect/dispatch the baseline independently:

```sh
gh workflow run native-verification.yml \
  --repo Unparalleled-Media-1/Glamit \
  --ref feat/native-analyze-capture-batch1 \
  -f platform=both -f device_journey=false -f enrollment_probe=false
gh run list --repo Unparalleled-Media-1/Glamit \
  --workflow native-verification.yml --commit 7ad9c01e1f0553a8eb153da3d0fa96950c6b1a16
```

The original startup script at that SHA still has the Capture/tab issue. Use the repaired harness against the exact binary in an isolated verification job if startup fails for this reason; retain both failure and rerun receipts. Dispatch `feat/native-reskin-v3` separately to test the new source. Never label that binary as `7ad9c01`.

The new reskin snapshot also passed a fresh frozen npm install (567 packages) and Android/iOS prebuild. Project generation included the expected iOS camera/photo privacy text and no microphone usage text. CocoaPods/Xcode compilation was not executed. Neither generation step creates an installable APK. A fresh connection check still returned outbound CONNECT 403 for both required hosts.

Required environment additions: **`repo.reactnative.dev`** and **`api.github.com`**, preserving current allowlist entries. Status reports a running runtime but network-policy state `unknown`; actual 403 responses remain authoritative for these failures. The environment draft tool was unavailable, so no saved configuration was overwritten. Enter secrets only in secure environment/repository settings.

## Installation and device acceptance

Android, once an actual non-production ARM64 APK exists:

1. Verify the Actions source SHA, build log and APK SHA-256. Inspect package ID/signing certificate with Android SDK `apkanalyzer` / `apksigner`; confirm it is the test application. Never uninstall another app to resolve a signature mismatch without preserving its data and approval.
2. On a test phone, enable USB debugging for a trusted computer, select that phone's serial with `adb -s SERIAL`, then `adb -s SERIAL install -r path/to/test.apk`. Alternatively transfer the verified APK and temporarily allow installation from the trusted transferring app; revoke that permission afterward.
3. Confirm the app starts without Metro or a browser, then test the full list below. Emulator APKs containing only x86_64 cannot prove a physical ARM64 phone works.

iOS:

- This Linux host has no Xcode, CoreSimulator, Apple signing identity or iPhone. An unsigned simulator `.app` requires a compatible Mac and simulator: unzip the retained bundle, use `xcrun simctl install booted path/to/GLAM.app`, then launch its verified test bundle ID. It cannot install on an iPhone.
- A physical iPhone requires the existing authorized Apple Developer team, matching test application identifier, registered device UDID and development/ad-hoc provisioning (or an authorized internal build service). Install through Xcode/Apple Configurator or an existing approved internal distribution method. Signing credentials and provisioning go through secure settings. No App Store/TestFlight deployment is authorized by this task.

Keep three separate evidence groups: native compilation/binary receipts, emulator/simulator interactions, and physical-device interactions. For every run record exact source SHA, build/run ID, SDK versions, package ID, binary checksum, OS/device, logs, screenshots and result per case.

Mandatory cases on each OS: native navigation/back; permission first grant/deny/permanent deny; unavailable hardware; foreground/background camera shutdown; ready/shutter/flip; real OS picker success/cancel/deny; stale permission/picker results; retake; failed cleanup/retry without deleting gallery originals; no upload during Capture/Review; identity/session changes; keyboard/safe area/scroll/modals; relaunch authentication; authenticated private upload/analysis/correction/Passport/reopen and withdrawal/deletion against isolated services. A source mock or HTML screenshot proves none of these installed cases.

**Gate result: BLOCKED. No installed-app success, compiled CameraView proof, iOS success or physical-device success is claimed.**
