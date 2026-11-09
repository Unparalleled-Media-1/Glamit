# N2B — native private-photo library

The actual React Native Profile now mounts NativePrivatePhotos. It can explicitly check storage, reload the authenticated owner's photo metadata and request a selected photo's deletion through existing F1A endpoints. This is a scoped implementation component, not completed N2, account deletion, photo upload or analysis.

| Native action / role | Canonical endpoint | Persistence and evidence |
| --- | --- | --- |
| Refresh private photos / signed-in owner | GET /v1/media/status, then GET /v1/media only if CONNECTED | Server-owned metadata reloaded; no device/photo/token persistence added. Local component + HTTP contract doubles pass for iOS/Android; live persistence unverified |
| Delete private photo / same owner | DELETE /v1/media/{id} | Explicit native confirmation; actual receipt must match requested ID and deleted/deletion_pending state. Failed or pending deletion never becomes a success message |
| Stop waiting / same account | Abort local transport and invalidate delivery | No automatic mutation retry; server may already have completed the request. Refresh reconciles current server state |
| Signed-out or unconfigured app | No HTTP request | Honest sign-in/configuration state; no fabricated empty library or permission |

Only the existing current account token is sent through nativePrivateMedia/Expo fetch to the configured HTTPS FastAPI origin. No service-role/OpenAI keys, owner overrides, direct SQL/storage operations or duplicate commercial rules enter mobile code. No image bytes are fetched/uploaded. Deletion affects the requested private server object, never the device's original or account. Existing backend ownership, consent, expiry and permissions remain authoritative.

Native confirmation callbacks are generation-fenced, including after logout/token refresh/account/origin changes. Duplicate submissions lock synchronously. Local stop, unmount and session changes abort requests; late responses cannot repopulate another user's library. Empty, unavailable, error, pending and confirmed-deletion states remain distinct. Server errors are redacted.

Validation receipts are in evidence/: failing-before missing component, actual component/shared-client handlers in iOS and Android configurations under explicit OS/HTTP doubles, dependent local-photo/Auth/Advisor/private-media regressions and both client type checks. These are LOCAL TEST PASSED, not PHYSICAL DEVICE VERIFIED, LIVE PROVIDER VERIFIED or PRODUCTION VERIFIED. Changed native builds and visual review require their independent receipts; prior captures cannot certify the new component.

Required dependent checks passed: 348 backend tests on disposable local PostgreSQL (one upstream Starlette deprecation warning), Python lint and the Next production web build. No server code or database migration changed. Generated sandbox payment-fixture UUID churn was excluded.

The existing IOS/ANDROID_SCREEN_INVENTORY.csv Profile rows and GB-022/GB-128/GB-104 component fields are updated; broad feature/defect statuses remain unchanged/open. No duplicate matrix was generated.

Remaining P0 application work: native navigation/back stacks; full authenticated consumer service composition; explicit upload/consent/progress/retrieval/recovery; F1B persistent jobs/results/corrections/Style Passport. P1 code gaps remain generation/saved looks, operational native commerce/booking, notifications/deep links and full privacy export/deletion/retention. Existing authoritative backlog governs priorities; none is excused by missing credentials.

Separate external gates: approved public FastAPI origin and deployed reviewed service; original Supabase only; qualified F1A storage/retention/policy/eligibility and approved migrations; OpenAI model/key/live-use gates; registered store IDs/signing and physical-device access. No production migration/deployment/upload/deletion/provider processing or payment was performed by this batch. The approved10% item commission and identity rules are unchanged.
