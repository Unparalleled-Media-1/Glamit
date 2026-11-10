# Controlled Flutter restart — Analyze only

Authority: [verbatim user directive](../../../specification/sources/2026-11-controlled-flutter-restart.txt). This supersedes the earlier five-screen/F2 sequence: build one real Analyze vertical slice, demonstrate it on both platforms, then obtain design approval before Studio/Discover/Home/Profile expansion. No full-app completion or production replacement follows from the first feature.

## Preservation

- Permanent pushed backup: `backup/flutter-rejected-2026-11-10` at3d00960326024a1a5a9cb8070cd5be3131e29ffd.
- Last tested rejected-candidate application source:1b5aa123e2eae7df4734b1d32d994724dd3b44af. [Run42771393011](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42771393011), Android artifact13742536192, successful iOS retry13743240362. These receipts are historical, not approval.
- New branch: feat/flutter-analyze-vertical-slice.
- New clean application: apps/glam_mobile. apps/flutter_app, apps/mobile and web/backend/Auth/financial/database code remain intact. No website screen, old Flutter screen composition or navigation shell is imported.
- New app has one Analyze flow, not another five-tab shell. Only the original approved icon is copied.

## Reuse inventory

| Existing source | Reused contract/behavior | Presentation reuse |
| --- | --- | --- |
| packages/product/private-media.ts | HTTPS authenticated bounded/redirect-free requests; policy consent; digest/idempotent media intent then binary upload | None |
| packages/product/analysis.ts | Permission/status/job/corrected-report/correction/Passport schemas; owner/expiry/confidence/revision invariants | None |
| packages/auth/core.ts and apps/mobile/auth/secure-session.ts | Original Supabase issuer; server-verified identity; session fences; no implicit provider/role activation | None; tokens remain in RAM and lock on background in this first slice |
| services/api/src/glam_api/private_media.py | Canonical owner-scoped media API | Unchanged server |
| services/api/src/glam_api/analysis_jobs.py and analysis_passport.py | Durable jobs, current consent/eligibility, corrected reports and canonical Style Passport | Unchanged server |
| Existing provider/backend tests | Regression/contract reference, not proof new Flutter operates live | None |

The corrected-report backend currently exposes face-shape/eyes/brows/lips/undertone. Separate skin/hair analysis is not inferred from a styling goal or image; those capabilities remain gaps.

## Slice and affected files

- lib/core: public config; bounded abortable HTTP; Supabase email sign-in/server user proof; foreground refresh and identity fencing; encrypted OS-vault job metadata. No Management/service-role/provider key enters the application. Passwords/tokens are not written to disk or logs. Durable job recovery requires fresh sign-in after background/relaunch; biometric persistence is not enabled by this slice.
- lib/analysis: typed canonical response validation, private media hash/upload, explicit policy consent, job polling/ambiguity recovery, confidence-aware reports, corrections preserving existing user edits, server-confirmed Passport save/reopen, cancellation/removal acknowledgement.
- lib/presentation and main.dart: independent camera canvas, native permission/gallery/capture, one-hand source/shutter actions, native sign-in/permission/correction sheets, real processing/error/report states and lifecycle clearing. No bundled reference portrait or fabricated analysis.
- test: request/response contract, owner isolation, session lock, consent gating, readiness failures, idempotency/revisions, save verification and camera-first compact/large-text layout checks. Fixtures are test-only; not provider/live evidence.
- scripts/analyze-restart and dedicated read-only workflow: pinned official Flutter, generated native permission declarations, independent Android/iOS binaries, actual native permission/source interactions and OS evidence. Compilation is separate from UI, hardware and live API acceptance.

No database migrations are required for the frontend. Existing pending production migrations/readiness/provider-data approvals stay gated. This task does not apply them, enable OpenAI dispatch, change Auth settings, alter10% commission, deploy or replace applications.

## Known live blockers (read-only observations)

Supabase bkkmsbxrxkqaveymcrgi has active Edge Function glam-api. Its repository handler does not implement the FastAPI photo/analysis routes. Email Auth is enabled; phone/Google/Apple/Facebook are disabled. The user selected Supabase, but no qualified non-production FastAPI origin or authorized test login has been supplied. No public Auth key is presently configured for the new app build. The Management token is not an app login or analysis credential.

Complete credential-independent code/native checks while access is pending. Never map the Supabase URL to an incompatible API, seed production policies/users, simulate a provider, or count a test double as the real journey. An actual image→analysis→saved account result remains BLOCKED until the canonical service is reachable, qualified and authenticated. Source/backend gaps remain distinct from credentials.
