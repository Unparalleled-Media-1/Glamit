# N2B — actual native private-photo library

Follow the user's native audit/remediation checklist through a scoped repair, not a new feature matrix. Source: docs/specification/sources/2026-11-native-audit-remediation.txt. Dependencies: N2A PR39, OpenAI PR38, native foundation PR37. Work on a separate dependent draft; no merge or production deployment.

Feature components: GB-022 / FINAL-GB-022 private media; GB-128 / FINAL-GB-128 scoped deletion; GB-104 / FINAL-GB-104 authenticated native service composition. Full requirements remain open.

Confirmed gap: actual Profile has no private server-photo library or deletion controls. Shared F1A/native transport exists but is not mounted. Add a real React Native component using current Supabase account/token and the explicit FastAPI HTTPS origin. Do not pretend the incompatible legacy CompanionConnection services are connected, and do not implement provider calls or business authorization in the client.

Test first: missing component fails. Then exercise actual native component/shared transport with explicit HTTP/OS doubles for signed-out/unconfigured states, owner-token requests, reload, empty state, deletion confirmation/cancel, failed/deletion_pending/deleted receipts, duplicate confirmations, account changes, stale alerts, local cancellation and unmount. Run dependent photo/Auth/Advisor/private-media contracts and both client type checks. Native CI compilation/startup is separate from these local tests and from live persistence/provider/device qualification.

Affected files: new NativePrivatePhotos.tsx; Profile mount in App.tsx; tests/mobile/private-photos-native.cjs; separate photo-handler test isolation; package scripts/native CI; existing platform inventories and feature/defect component evidence. No dependency or migration required. No production photo, consent, policy, role, auth, commission, payment or settings mutation.

Uploads, local image-cache retrieval, private-photo consent UX, true native navigation stacks, durable analysis/reports/corrections/Style Passport and complete privacy orchestration remain subsequent N2/F1B work. Candidate0014/0015 and future production migrations retain their exact-SQL/recovery/approval gates. OpenAI stays separately blocked until secure configuration and live-use gates pass.
