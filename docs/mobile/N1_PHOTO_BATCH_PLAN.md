# N1 — actual native photo lifecycle repair

Exact backlog: GB-022 / FINAL-GB-022 (native capture/upload), scoped GB-013 / FINAL-GB-013 consent and GB-128 / FINAL-GB-128 local media cleanup. No broad feature closure: server upload/analysis/results, account/privacy orchestration and hardware proof remain open. No database migration is required by this batch.

Failing-before acceptance: actual App.tsx rendered with React and explicitly doubled native OS ports. Leaving consent while camera permission is pending currently still launches the camera after permission resolves. Receipt: evidence/native-photo-before.txt. This is a reproduced code defect, not a simulator result.

Affected files: apps/mobile/App.tsx, new native cache ownership helper if required, tests/mobile/photo-native.cjs, package.json and mobile CI selection/run step; permanent product policy and targeted native architecture/screen/build reports. Keep current working screens and backend intact. Do not redesign unrelated pages or activate uploads/providers.

Repair: synchronously fence consent and picker concurrency; cancel stale permission/picker work on navigation/unmount; permit withdrawing consent during native prompts; avoid unnecessary blanket library permission; own app cache copies before replacement; never delete user originals; retain failed local cleanup for explicit retry and block replacement until resolved. Device filesystem, native permission and background behavior require actual device evidence later.

Tests: both iOS and Android source handlers independently exercised with deterministic native ports: delayed permission, withdrawal, cancellation, external original preservation, owned-copy creation/replacement/deletion, failed cleanup/retry, duplicate taps and stale/unmounted work. Then TypeScript, native/Auth regressions, separate platform JS exports and actual native build attempts where tooling permits. Keep results honestly classified; no browser captures count.

Next batches: N2 proper native stack/tab navigation and verified deep links; F1B shared app-facing API/analysis persistence with native integration; N3 creator/discovery and operational feature parity; N4 push, device permissions/accessibility/offline handling; store signing/distribution after real account identifiers and activation. Public website conversion controls are a separate reversible batch governed by the permanent policy; never add nonexistent store URLs.
