# Security and privacy audit

**NO-GO.** The conversation included a credential-bearing database URL. It was not executed, copied into files or used to contact Supabase. Rotation/revocation must happen through the project owner and secret manager; evidence of rotation is not available. Do not paste replacement secrets into chat. See G0-001.

The bounded tracked-file/history scan reports no pattern findings in [secret-scan.json](evidence/secret-scan.json); it does not prove absence of secrets or revoke the exposed credential. It scans git refs including fetched PR heads. Runtime credential values were not printed. No production database was accessed, no migrations applied there, no identity configuration changed.

JWT signature/audience verification, unconfigured identity rejection, organization role checks, foundation client deny-by-default RLS and safe request logging have regression coverage. These tests use disposable PostgreSQL and do not certify a deployed Supabase policy. Browser workspace selection is not authority. Existing financial sandbox routes require the existing authenticated principal.

Outstanding: API quotas/rate limiting; comprehensive account recovery/session lifecycle; enforceable minor policy; cross-tenant tests for every future table; private-image upload/retention/vendor deletion; reviewed storage paths and signed URL lifetimes; dependency/secret scans in required CI; actual assistive technology evaluation. No sensitive characteristics or religious identity may be inferred from photographs. Modesty preferences must be user-supplied and editable.

Do not store photo bytes, signed media URLs, analysis corrections or conversational content in durable browser preferences without explicit purpose-specific consent. Separate personalization consent from advertising. Ad buyers must never receive biometric images or private analysis. Log request/job IDs and safe error codes, not payloads, credentials or provider response bodies.

Dependencies: npm audit and pip-audit report zero known advisories for the locked dependency scope at audit time. Advisory scans are time-bounded and do not assess application logic. No dependency upgrades were made during this freeze.
