# Security and privacy

7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. **Public launch: NO-GO.**

| ID | Journey | Status | Scope / blocker |
|---|---|---|---|
| W05 | Profile and approved preferences save/read | PASSED | Real controlled Supabase Auth session and scoped persistent records |
| W06 | Account deletion and lost-all-methods recovery | BLOCKED | Complete authenticated deletion/support recovery flow not implemented or validated |
| W27 | Private saved routine create/read/update/delete | PASSED | Real scoped Supabase records, optimistic revisions, idempotency and cleanup |
| W29 | Consumer/tenant isolation and revoked-session denial | PASSED | Controlled real Auth users plus local access-control regressions; not every future role permission |

Executed local PostgreSQL RLS/authorization, webhook replay and amount-tampering regressions passed. A real local FastAPI process denied anonymous protected requests across the 46 registered endpoints while public health/policy endpoints behaved as expected. No auth bypass was introduced. Current-source/prepared-bundle configured-secret-value scan passed; this is not a full Git-history scan or evidence of secret rotation. Dependency advisory audit reported zero production vulnerabilities. Real OTP abuse, full staff/merchant capability matrix, private uploads, minors/fairness review, legal approval and account lifecycle remain incomplete. [Endpoint checks](evidence/local-api.json), [secret scan](evidence/secret-scan.json).

[Complete machine-readable results](evidence/workflow-results.json).
