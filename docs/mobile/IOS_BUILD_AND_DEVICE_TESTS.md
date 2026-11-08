# iOS build and device evidence

8 November 2026. Application: actual Expo/React Native `apps/mobile`, not the responsive web prototype.

| Check | Result | Evidence/limitation |
| --- | --- | --- |
| Native source/typecheck | PASS | evidence/native-typecheck.txt |
| iOS App photo handlers | PASS with native OS ports doubled | evidence/native-photo-after.txt; actual App consent/navigation handlers run under React test rendering; unrelated feature components and OS APIs explicitly doubled |
| Existing native Auth/biometric state | PASS with native/Auth doubles | evidence/native-auth-doubles.txt; not Face ID hardware |
| iOS JavaScript/Hermes export | PASS | evidence/native-js-exports-not-binaries.txt; an export is not an iOS binary |
| Local Xcode simulator compilation | BLOCKED | Host is Linux; xcodebuild/Xcode/iOS simulator runtime unavailable. No simulator build attempted or inferred from prebuild |
| Signed distribution build | BLOCKED / NOT ATTEMPTED | No registered app identifiers/EAS project/owner or Apple signing access configured |
| Installed simulator/device journey | NOT TESTED | No available iOS simulator or physical device |
| Local native screenshots/video | NOT PRODUCED LOCALLY | Actual remote capture is listed below; browser images excluded |

Apple signing is not needed for an unsigned simulator build; the missing macOS/Xcode runner is the immediate simulator blocker. A configured macOS runner can independently compile and run native tests; signed store distribution needs actual registered IDs and secure signing credentials afterward. Do not substitute a web screenshot or EAS configuration file for those results.

Current root consumer connection is absent; analysis/generation/commerce persistence and native stack/deep links/notifications require implementation, regardless of keys. N1 is only a local photo lifecycle repair. Full iOS build completeness and launch readiness remain uncertified.

A separate `Native build verification` GitHub workflow now attempts actual unsigned iOS simulator compilation/startup on macOS and Android APK/emulator compilation/startup on Linux. It uses local verification IDs, no deployment secrets or store publication. Remote build/startup results are now recorded below; local blockers remain separate. A startup capture alone does not certify complete feature or hardware journeys.

## Actual remote result

GitHub run42516089742, job128839304861, sourceebaedd6378c12cd6e63c552671ea316e971d1a6c: **PASS** unsigned simulator compilation, native installation, launch command and screenshot capture. Artifact `actual-ios-simulator-build-and-startup` (13630979780) contains the build/launch receipts and startup PNG. This is an actual simulator capture, not HTML; visual inspection is still pending because this environment rejects the artifact download host. It does not certify all iOS screens, stable foreground survival, camera, Face ID, full journeys or physical devices. See evidence/remote-native-results.json for exact source-tree correlation.

The first remote Podfile failure was a monorepo working-directory error: root-level Expo autolinking omitted reactNativePath. Running CocoaPods from apps/mobile/ios corrected it. The workflow now selects the generated app target rather than the first dependency scheme. No app/business logic or Apple signing was bypassed.
