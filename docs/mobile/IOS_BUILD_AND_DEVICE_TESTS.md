# iOS build and device evidence

8 November 2026. Application: actual Expo/React Native `apps/mobile`, not the responsive web prototype.

| Check | Result | Evidence/limitation |
| --- | --- | --- |
| Native source/typecheck | PASS | evidence/native-typecheck.txt |
| iOS App photo handlers | PASS with native OS ports doubled | evidence/native-photo-after.txt; actual App consent/navigation handlers run under React test rendering; unrelated feature components and OS APIs explicitly doubled |
| Existing native Auth/biometric state | PASS with native/Auth doubles | evidence/native-auth-doubles.txt; not Face ID hardware |
| iOS JavaScript/Hermes export | PASS | evidence/native-js-exports-not-binaries.txt; an export is not an iOS binary |
| Xcode simulator compilation | BLOCKED | Host is Linux; xcodebuild/Xcode/iOS simulator runtime unavailable. No simulator build attempted or inferred from prebuild |
| Signed distribution build | BLOCKED / NOT ATTEMPTED | No registered app identifiers/EAS project/owner or Apple signing access configured |
| Installed simulator/device journey | NOT TESTED | No available iOS simulator or physical device |
| Native screenshots/video | NOT PRODUCED | Browser screenshots explicitly excluded |

Apple signing is not needed for an unsigned simulator build; the missing macOS/Xcode runner is the immediate simulator blocker. A configured macOS runner can independently compile and run native tests; signed store distribution needs actual registered IDs and secure signing credentials afterward. Do not substitute a web screenshot or EAS configuration file for those results.

Current root consumer connection is absent; analysis/generation/commerce persistence and native stack/deep links/notifications require implementation, regardless of keys. N1 is only a local photo lifecycle repair. Full iOS build completeness and launch readiness remain uncertified.
