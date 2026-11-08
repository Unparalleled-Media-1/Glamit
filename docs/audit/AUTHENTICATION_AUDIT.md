# Authentication and identity audit

08 November 2026 08:04 SAST. **NO-GO. Audit plus one tested P0 candidate repair; no agent-initiated production deployment, schema write, login message or financial mutation.**

[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Fresh remote metadata](evidence/remote-readiness.json) · [Production catalog](evidence/production-catalog.json) · [Deployed receipt](evidence/railway-ci-receipt.json).

| ID | Requirement | Status | Gap |
| --- | --- | --- | --- |
| GB-001 | SMS OTP signup/login | BLOCKED BY CREDENTIALS | Supabase phone disabled; Twilio account/auth/message-service credentials absent |
| GB-002 | Google OAuth login | BLOCKED BY CREDENTIALS | Provider disabled; client ID/secret and callbacks not configured |
| GB-003 | Apple OAuth login | BLOCKED BY CREDENTIALS | Provider disabled; Apple service/team/key and native entitlement qualification absent |
| GB-004 | Facebook OAuth login | BLOCKED BY CREDENTIALS | Provider disabled; client ID/secret and callback review absent |
| GB-005 | Native Face ID/Touch ID/Android biometric unlock | PARTIALLY IMPLEMENTED | SecureStore/local-auth code exists; no signed physical-device lifecycle tests |
| GB-006 | Guest exploration | PARTIALLY IMPLEMENTED | Actual web/native UI; deployed route response is not a complete device/user journey |
| GB-007 | Single identity and role/workspace switching | PARTIALLY IMPLEMENTED | Server grants and switcher exist; no live multi-role login/tenant journey |
| GB-008 | Secure account linking/unlinking | BLOCKED BY CREDENTIALS | Explicit identity-linking code; disabled providers prevent real callback and takeover tests |
| GB-009 | Profile/preferences and personalization consent | PARTIALLY IMPLEMENTED | Owner-scoped Edge/RPC profile/preferences exist; logged-in cross-device persistence not demonstrated |
| GB-010 | Session refresh and local/global logout | PARTIALLY IMPLEMENTED | Web/native session lifecycle code; actual long-running provider/device verification missing |
| GB-011 | Account recovery and phone replacement | PARTIALLY IMPLEMENTED | UI and same-session phone verification exist; lost-all-methods recovery unimplemented |
| GB-012 | Account deletion including private media and provider tokens | MISSING | No completed deletion orchestration or deletion-job API; clearing local state is not account deletion |
| GB-013 | Age/guardian eligibility and image-processing consent | PARTIALLY IMPLEMENTED | Server eligibility/policy and local consent gating; minor/guardian end-to-end consent not qualified |
| GB-123 | Personal data portability/export | MISSING | No complete authenticated export job/download lifecycle; preference JSON is not an account export |
| GB-140 | Organization team MFA and membership security | PARTIALLY IMPLEMENTED | Scoped roles/invitations and local revocation checks; no complete member MFA/account-security client enforcement journey |

| Production setting | Observed value |
| --- | --- |
| site_url | https://www.glamit.beauty |
| uri_allow_list | https://www.glamit.beauty/auth/callback,glamai://auth/callback |
| external_phone_enabled | False |
| external_google_enabled | False |
| external_apple_enabled | False |
| external_facebook_enabled | False |
| sms_max_frequency | 60 |
| sms_otp_exp | 300 |
| sms_otp_length | 6 |
| captcha_enabled | None |

| Origin | Edge preflight | Allow-origin |
| --- | --- | --- |
| https://www.glam.beauty | 403 | None |
| https://glamit-web-production.up.railway.app | 403 | None |
| https://www.glamit.beauty | 204 | https://www.glamit.beauty |

All four named providers are disabled and their configured-credential presence flags are false. No OTP was sent, user created, identity linked, session revoked or account deleted in production. Supabase Auth settings still reference www.glamit.beauty/glamai callback rather than the intended new web origin.

Native biometric code uses OS enrollment, expo-local-authentication and authenticated SecureStore refresh secrets; it is session unlock after real authentication, not server-side facial recognition. Invalidation, background/restart/reinstall and lost-device cases need signed real devices. Account deletion lacks a complete server orchestrator; local preview clear/logout must not be presented as account erasure. Raw biological templates are not uploaded by this code.
