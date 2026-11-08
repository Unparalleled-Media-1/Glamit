# N1 result — real native photo lifecycle

The actual app is Expo/React Native, with 35 shared page keys and 38 native screen/context source entries recorded independently for iOS and Android. It is substantial source, not a WebView; it is not a completed or device-qualified product. The prior interactive HTML rendered the web UI and proves no native implementation.

N1 repairs `apps/mobile/App.tsx` directly:

- A camera permission response cannot launch capture after navigation/unmount invalidates the request.
- Consent withdrawal stays enabled while prompts/pickers are unresolved and is fenced synchronously. Returning picker data cannot restore withdrawn media or navigate to quality.
- The system image picker does not request unnecessary blanket photo-library permission. Camera still requests its explicit OS permission.
- A synchronous picker lock prevents rapid duplicate native launches.
- Selected user/provider URIs are never adopted for deletion. A uniquely named app-owned cache copy is created before preview/replacement; only this session's registered copies can be removed.
- Invalid metadata is rejected; cancellation/stale errors cannot replace the current preview. Failed partial-copy/old-copy cleanup is tracked, replacement blocked and explicit retry available. Withdrawn photos disappear immediately even if erasure must retry.

Actual App handler tests reproduced the stale-camera defect before the fix and pass afterward for iOS and Android port configurations. OS/file-system APIs and unrelated feature panels are explicitly doubled. These tests do not certify real Expo file permissions, camera hardware, rendered screen layout or background/process-death behavior. React test renderer currently emits an upstream deprecation warning. No Playwright image counts toward native evidence.

Source tests, typecheck, existing Auth/biometric doubles and separate iOS/Android JS exports pass. Local Android prebuild passes, but local APK compilation is blocked at an official AAR download403; local iOS compilation is blocked by missing macOS/Xcode. Remote GitHub runners subsequently compiled, installed and captured actual native apps as described below. No physical-device, full feature, store signing or public deployment pass is claimed. See independent build reports and evidence.

Backlog: scoped progress for GB-022 / FINAL-GB-022, GB-013 / FINAL-GB-013 and GB-128 / FINAL-GB-128. All broader requirements/defects stay OPEN/PARTIAL. F1A media APIs remain unwired to the native application; F1B persistent analysis/report/corrections/Style Passport is still missing. Full export/deletion/legal holds, SDK/system cache treatment, cleanup after process death, backups and provider erasure remain F1C/device work. Native merchant photo flows are separate and retain their own lifecycle gaps.

Permanent strategy: `docs/specification/mobile-first-policy.md` and AGENTS now require native-first consumer/creator delivery, independent evidence, valid web conversion opportunities and complete desktop business functionality. Store links/IDs and automatic identity transfer were not invented. Navigation modernization, operational native parity, notifications and web acquisition prompts remain explicit next implementation batches.

No production migrations, database/storage records, Railway services, payments or existing identity/commercial rules were changed. No full feature/defect was closed or global completion percentage asserted.

A separate `Native build verification` GitHub workflow now attempts actual unsigned iOS simulator compilation/startup on macOS and Android APK/emulator compilation/startup on Linux. It uses local verification IDs, no deployment secrets or store publication. Remote results are pending and must be reviewed before upgrading the local BLOCKED/NOT TESTED status; a startup capture alone will not certify complete feature or hardware journeys.

## Independent native verification added under GB-114

Actual remote iOS simulator build/install/launch/capture passed on run42516089742. Actual remote Android x86_64 APK/emulator and five-tab UIAutomator capture passed on run42516089742. The application and shared source trees are identical between those snapshots. Exact job IDs, source hashes and artifact identities are in evidence/remote-native-results.json. The first failed Android Home lookup remains an open readiness/reliability observation; no app code change was required for the successful rerun. Visual inspection of native PNGs remains blocked by the artifact-download policy, not silently counted as passed.

Source regression CI has passed independently. These runs do not close GB-114's complete release-pipeline requirement or GB-115's signed-store/physical-device requirements. N1 now records scoped component progress for GB-013, GB-022, GB-114 and GB-128; all broader feature/defect statuses remain open. No new broad audit or rewritten feature matrix was generated.

All eight source/native CI checks passed on executable-source commit `ebaedd6378c12cd6e63c552671ea316e971d1a6c`. Subsequent evidence-only changes do not alter the tested application. The new native jobs augment, rather than replace, existing release gates.
