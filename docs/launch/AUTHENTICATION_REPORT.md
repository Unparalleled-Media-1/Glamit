# Authentication

7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. **Public launch: NO-GO.**

| ID | Journey | Status | Scope / blocker |
|---|---|---|---|
| W02 | SMS registration, login, delivery and throttling | BLOCKED | Phone disabled; Twilio credentials/sender and abuse controls not configured |
| W03 | Google, Apple, Facebook and secure linking | BLOCKED | All three providers disabled/unconfigured; real linking/collision tests unavailable |
| W04 | iOS and Android biometric reauthentication | BLOCKED | No signed app identifiers/builds or physical devices; OS doubles and Metro exports are insufficient |
| W05 | Profile and approved preferences save/read | PASSED | Real controlled Supabase Auth session and scoped persistent records |
| W06 | Account deletion and lost-all-methods recovery | BLOCKED | Complete authenticated deletion/support recovery flow not implemented or validated |
| W27 | Private saved routine create/read/update/delete | PASSED | Real scoped Supabase records, optimistic revisions, idempotency and cleanup |
| W28 | Authorized multi-role business switching and actions | BLOCKED | Membership listing/core checks exist; complete verified multi-role UI/business journey is not demonstrated |

Real controlled session checks: 20; real core checks: 29. Revoked JWT RPC/direct Data API denial, cross-user isolation, idempotent profiles and preference updates passed. SMS/social transport tests use doubles and remain BLOCKED for actual login; native storage/gate doubles and JS exports are not hardware proof. [Detailed prior auth matrix](../authentication/PASSWORDLESS_AUTH_REPORT.md). Cleanup retains only internal references, zero-balance bootstrap accounts and audit evidence; [independent cleanup verification](evidence/controlled-cleanup.json).

[Complete machine-readable results](evidence/workflow-results.json).
