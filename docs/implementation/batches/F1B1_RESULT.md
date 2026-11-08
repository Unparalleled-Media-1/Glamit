# F1B1 — durable cosmetic-analysis jobs and saved reports

This is the backend persistence/dispatch foundation for the approved photo → analysis → corrected saved results priority. It is not the complete journey, corrected results, Style Passport or native feature acceptance. Branch feat/persistent-analysis-jobs depends on the existing unmerged native foundation/Advisor/media drafts; no release candidate merge or deployment is performed.

## Implemented contract

| Action | Canonical FastAPI endpoint | Evidence scope |
| --- | --- | --- |
| Read current approved analysis purpose | GET /v1/analysis/policy | Authenticated lookup only; never creates/approves a policy |
| Submit owned normalized private media | POST /v1/analysis/jobs | Durable idempotent job, current analysis/storage consent and eligibility, configured dispatch/retention/rate/data-handling gates |
| Reload recent owner jobs | GET /v1/analysis/jobs | Up to100 recent metadata records, including expiry/redaction; not complete paginated history |
| Reload durable status | GET /v1/analysis/jobs/{id} | Owner-only queued/running/completed/failed/cancelled/expired |
| Cancel work or clear its saved report | DELETE /v1/analysis/jobs/{id} | Clears result; an in-flight external operation cannot be guaranteed cancelled |
| Read saved validated observations | GET /v1/analysis/jobs/{id}/report | Completed only; qualitative certainty and nonblank uncertainty; invalid/expired/cancelled results never become a report |

The legacy /v1/analysis/requests endpoint remains truthfully unavailable until its consumers are migrated to the durable contract. No native/web hook is silently bound to an incompatible endpoint or a fabricated report.

## Dispatch and privacy

The existing worker loop now processes analysis jobs. It commits an opaque attempt marker before external work, releases all database locks during Storage/provider I/O, verifies normalized private bytes against server metadata and rechecks live scope before sending bytes and before saving output. It pins the queued model and reuses the real OpenAI Responses cosmetic-observation adapter. No production runtime imports a test double.

There is no automatic provider POST retry. A claim interrupted beyond120 seconds becomes a visible failure, and a late worker response cannot overwrite that failure or a cancellation. Retrying requires a new explicit job/key and can incur another provider attempt; the server never claims that an ambiguous failure means no provider work occurred. Rate limits count durable submissions, including failures/cancellations, and do not invent customer pricing or alter credits/10% marketplace commission.

Pending work requires its originating Supabase session to remain valid. Completed reports remain owner-accessible after a valid new login while analysis/storage consent, policy, eligibility and expiry remain valid. Withdrawal/regrant cannot revive a previous consent epoch. Media deletion, expired eligibility/retention or superseded consent blocks report access and redacts the result on job/report/history access or the worker privacy sweep. Sweeps run even while dispatch is disabled. Minimal job/audit metadata is retained; this is not full account erasure, provider retention/deletion, legal holds or privacy-export completion.

OpenAI store:false is preserved; it is not proof of zero provider retention. Provider data handling and model qualification must be reviewed before dispatch activation. No key, photo bytes, prompt or inferred features are put into audit events or provider exception logs.

## Candidate schema and activation

Candidate0016_analysis_jobs follows0015 in the sole canonical Alembic graph. It creates one server-only analysis_job table, owner/media composite FK, unique owner/request key, state/result constraints and indexes, including a supporting unique index on existing private_media. Anonymous/authenticated direct table access is revoked and RLS enabled. Runtime checks require the backend's existing approved permissions and active privacy guards; no role grants or privilege elevation are executed. Empty-only rollback refuses valuable jobs; the parent migration test now respects child-before-parent rollback order.

Only disposable local PostgreSQL received this migration. Production0014/0015/0016 remain subject to exact-SQL review, verified recovery and explicit approval. Readiness recognizes the explicit new canonical descendant and rejects analysis activation without its migration; it still reports foundation readiness, not live provider qualification.

Required server configuration (all unset/off unless separately reviewed):

- GLAM_ANALYSIS_ENABLED=true to dispatch; default off.
- GLAM_ANALYSIS_PROVIDER_DATA_APPROVED=true only after actual review; never inferred from key presence.
- GLAM_ANALYSIS_RETENTION_SECONDS: explicitly reviewed60–2592000 seconds, capped further by the private image's expiry; no default retention policy.
- GLAM_ANALYSIS_MAX_REQUESTS_PER_HOUR: explicitly configured1–100 per owner; no default commercial rate.
- Existing server OpenAI key and pinned GLAM_OPENAI_MODEL; existing approved private storage, cosmetic_photo_analysis policy, explicit consent and trusted adult eligibility. The proposed purpose is not a production legal approval.

## Validation and remaining work

Evidence receipts are under F1B1/evidence: missing endpoint fails before; real PostgreSQL submission/reload/idempotency/owner/session isolation; concurrent submissions and worker claims; report persistence; cancel-before/during/after; provider/storage failure, malformed/blank-uncertainty output; interrupted/late attempts; consent/expiry/deletion redaction; default-off behavior; no locks during provider I/O; client-role denial and empty-only rollback. Storage/OpenAI doubles are explicit and test-only. Generated OpenAPI and client types remain canonical.

Existing GB-014/GB-019/GB-021/GB-022/GB-128 component fields are updated without closing their broader requirements. No provider-connected, deployed, native end-to-end or physical-device PASS is claimed. The new contract is source/backend-test evidence only.

Final local regression: 374 passed with one upstream Starlette deprecation warning. Python lint/format, generated OpenAPI consistency/types, both client type checks, shared media/Advisor and native photo/library handler regressions (explicit OS/HTTP doubles), and Next production build passed. Receipts and source/SQL hashes are under F1B1/evidence. No new native binary or provider journey is inferred from those checks.

Next application work: versioned user corrections and canonical Style Passport integration; native upload/consent/progress/retrieval, authenticated durable job/report screen composition and native navigation; history pagination, complete privacy execution and the remaining approved analyses/generation/commerce. API keys alone cannot complete these operations. Live-provider/native/deployed acceptance remains separate after the code and approval gates are satisfied.
