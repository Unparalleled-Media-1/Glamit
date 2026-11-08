# Passwordless authentication implementation and rollout

7 November 2026; evidence timestamps are UTC. **Implementation and hosted session core verified; passwordless production acceptance remains BLOCKED.** No SMS, social OAuth or physical-device biometric success is claimed.

## Deployed and verified

Only project `bkkmsbxrxkqaveymcrgi`, production `main`, was changed. One additive canonical migration, `0013_passwordless_accounts`, was applied after fresh PostgreSQL regression, exact release-artifact replay and verification of completed physical backup `2189281988` (02:07:35 UTC). No reset, destructive schema change, development project or live-payment operation was performed. Recovery was not rehearsed.

Production contains **41 public tables**, all with RLS; **77 indexes, 54 validated foreign keys, zero unvalidated foreign keys and 21 policies**. New tables are `notification_preferences` and `device_auth_preferences`. Existing profiles, preferences, organizations/members, Style Passport and append-only consent records are reused; no parallel `user_consents`, OTP or biometric-template table was introduced. Existing finance policies and sandbox exclusion are preserved.

Edge `glam-api` version **4**, build `glam-hosted-api-0013`, is ACTIVE. Supabase JWT verification and the database session guard require a real, active `auth.sessions` record. Revoked but otherwise valid JWTs cannot read private direct Data API records or execute the protected RPC. Application calls use the authenticated user's JWT, never the Management API migration token.

Twenty real HTTP checks passed using two controlled temporary Auth users and three sessions: idempotent profile provisioning, private preference updates, metadata-only device registration, secret-field rejection, cross-user denial, current-device logout, all-device logout and unrelated-session isolation. Both Auth users and cascading profiles were deleted; an independent SQL query confirmed neither controlled identity remains. Immutable internal identity/audit references are retained as designed. This used controlled email/password sessions without sending mail; it does **not** establish SMS or OAuth functionality.

## Implemented clients

- Web `/login` and Profile: international country selector, E.164 validation, Supabase SMS OTP, six-digit autofill/manual entry, countdown, expiry/rate-limit feedback, change-number/retry and guest exploration. Existing password login is collapsed and optional.
- Official Google/Apple/Facebook PKCE redirects, safe internal return paths, short-lived verifier storage and callback code removal. Optional linking requires the signed-in account plus provider verification; no application-level identity merge by name or unverified email.
- Web sessions stay in memory across in-app navigation; refresh tokens never enter local/session storage. A full browser reload requires sign-in. Only ten-minute PKCE proof and safe return metadata survive OAuth redirects. Web passkeys are deferred and are not presented as native biometrics.
- Native iOS/Android: explicit opt-in, hardware/enrollment checks, protected OS refresh-secret storage, biometric-protected read, server refresh and profile ownership/session validation. Backgrounding locks account access. Automatic SDK refresh events cannot unlock an unapproved session. Cancellation leaves the account locked; SMS/linked social sign-in is the recovery path. No biometric templates are collected. Device metadata never grants an organization role or proves server MFA.
- Native PKCE uses cryptographic randomness and S256. Scheme `glamai://auth/callback` is prepared. Actual bundle/package identifiers, signing, store builds and device behaviour are not verified.
- One Supabase identity loads existing authorized organization/workspace membership. Client workspace selection never grants permission; backend/RLS remain authoritative. Complete business portal workflows remain outside this authentication stage.
- Notification switches are opt-in, revision checked and owner scoped. No notifications are delivered by saving a preference.

The five approved visual patterns and existing navigation/colour/layout system remain in place. Authentication components reuse that system.

## Provider setup, kept disabled

| Service | Actual state | Required secure configuration |
|---|---|---|
| Twilio SMS | NOT CONFIGURED; phone disabled | In original project's Authentication → SMS Provider: Twilio Account SID, Auth Token and Messaging Service SID, plus an approved SMS sender/service |
| Google | NOT CONFIGURED; disabled | Supabase Google provider client ID/secret; approved Google OAuth application and consent settings |
| Apple | NOT CONFIGURED; disabled | Apple developer identifiers, Services ID, signing key/team/key IDs and a valid provider client-secret JWT; rotation procedure |
| Facebook | NOT CONFIGURED; disabled | Supabase Facebook app ID/secret; approved Facebook application, callback and release configuration |
| Native app | SOURCE/EXPORT ONLY | Real iOS bundle ID and Android package ID, signing credentials in secure build settings, registered deep links and physical devices |

Do not put these values in source, reports, SQL, browser build variables or chat. Supabase Auth handles delivery and provider secrets. `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` in a separate notification backend are not proof that Auth's SMS provider is configured. The mobile and web build settings accept **only** the original project's public anon/publishable key; privileged-key rejection runs before bundling.

Prepared production Auth configuration:

- Site URL `https://www.glamit.beauty`.
- Exact redirect allowlist: `https://www.glamit.beauty/auth/callback`, `glamai://auth/callback`.
- Provider developer consoles use Supabase's callback: `https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1/callback`.
- Manual identity linking enabled, phone and all three social providers still disabled.
- Six-digit codes, 300-second expiry, 60-second SMS interval. Existing server send/verify limits remain at 30 as reported by the API; provider-specific units and effective limits must be confirmed before activation.
- Domain-bound WebOTP template prepared for `www.glamit.beauty`; no SMS sent.
- CAPTCHA remains disabled. Production SMS activation requires tested abuse controls, resend/verification limits, Twilio geographic permissions/fraud protection, sender registration, budgets/alerts and authorized delivery test numbers. A UI timer alone is not abuse prevention.

After configuring providers, verify their public settings and authorized test flows before enabling customer use. Never enable a service merely because a credential name exists.

## Required regression matrix

| # | Case | Evidence and remaining gate |
|---|---|---|
| 1 | New SMS registration | UI/SDK contract double passed; real delivery and signup BLOCKED on Twilio |
| 2 | Existing SMS login | UI/SDK contract double passed; real login BLOCKED on Twilio |
| 3 | Invalid OTP | Generic error contract; real rejection BLOCKED |
| 4 | Expired OTP | Browser error/clear-input double passed; real expiry BLOCKED |
| 5 | Resend OTP | Countdown/disabled state tested; real resend BLOCKED |
| 6 | Rate limiting | Server settings inspected, generic rate error contract; effective provider abuse tests BLOCKED |
| 7 | International numbers | Real library validation tests passed, including Unicode digits; country delivery BLOCKED |
| 8 | Google login | Official PKCE source; real provider BLOCKED |
| 9 | Apple login | Official PKCE source; real provider BLOCKED |
| 10 | Facebook login | Official PKCE source; real provider BLOCKED |
| 11 | Secure linking | Authenticated SDK linking source/settings; real cross-provider proof/collision tests BLOCKED |
| 12 | Duplicate prevention | Real repeated profile provisioning returns one profile; cross-provider duplicate/collision tests BLOCKED |
| 13 | Face ID/Touch ID | Protected-storage doubles and iOS JS export passed; physical device BLOCKED |
| 14 | Android biometrics | Protected-storage doubles and Android JS export passed; physical device BLOCKED |
| 15 | Biometric fallback | Cancellation/background/stale-event/OTP fallback gate doubles passed; actual OS fallback BLOCKED |
| 16 | Expiry/refresh | SDK refresh/explicit-unlock contract tested; real long-duration expiry and hardware refresh still BLOCKED |
| 17 | Logout/revocation | PASS real Supabase current/global logout, RPC and direct RLS denial |
| 18 | Workspace switching | Existing membership loading/context retained; full real multi-role client journey pending |
| 19 | Organization isolation | PostgreSQL tenant/RLS regression passed; prior live core tenant-isolation evidence retained |
| 20 | Recovery | Phone change and linked-login paths implemented; actual delivery/linking BLOCKED; lost-all-methods support recovery not implemented |

Local checks: **233 Python tests passed** on fresh PostgreSQL; exact SQL replay passed; Ruff/OpenAPI checks passed; six Edge security tests passed; web/mobile/cPanel TypeScript checks passed; Next production build passed; iOS and Android Metro exports passed. Auth contract, native gate and account browser doubles passed. Thirteen existing web regression groups passed. Eight cPanel routes, disabled-provider state, mobile navigation clearance and scrolling passed in local Chromium. Dependency audit reported zero production vulnerabilities. React's test-only renderer emits a deprecation notice; those tests are not native device evidence.

## Deployment and release gates

Backend migration and Edge deployment are real. The connected cPanel package is prepared with `/login` and `/auth/callback` routes. **www.glamit.beauty has not been uploaded or publicly verified**: cPanel server URL/secure credentials and applied host network grants remain missing. Terms URL publication/legal approval is also unverified. No environment publication, DNS change or GoDaddy file mutation occurred.

Git work targets PR22 into `feat/platform-foundations`, the repository's main branch. Passing CI and an approving review are required before merge. This report does not represent a merge or final product acceptance. Stripe test readiness and broader AI, marketplace, booking and media launch gates remain unchanged.

Evidence: [migration](evidence/production-migration.json), [catalog and cleanup](evidence/production-catalog.json), [Edge deployment](evidence/edge-deployment.json), [provider settings](evidence/provider-readiness.json), [real session regression](evidence/live-session-regression.json). Reproduction: `npm run test:auth`, `npm run test:hosted-account`, `npm run test:godaddy`; live control-session script `scripts/verify_auth_sessions.py` requires authorized secure credentials and is not run by mocked CI.
