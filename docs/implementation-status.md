# Implementation evidence and remaining gates

This is the first foundation PR, not the completed platform or a production release. The approved specification remains the target; this file records the delivered subset. All feature and release gates without evidence remain open.

Platform surface clarification (5 November 2026): public web is informational with app-download destinations; `/admin` is the web administrative control surface; all other product workflows run in the mobile apps. Only the existing web/mobile foundation screens are currently implemented. The download destinations and admin portal remain unimplemented. See `approvals.md` and the preview instructions in `development.md`.

| Work / requirement | Current implementation | Remaining gate |
|---|---|---|
| B10 repository/toolchains/CI | Feature branch, approved design snapshot, repaired frozen JS installation and compatible compiler, shared React runtime checks in CI, Next.js/Expo shells; see validation.md | Remote CI result and branch protection; native device builds |
| B11 identity/tenant access | RS256/ES256 issuer/audience/signature/expiry verification, owner-scoped resources and organization membership reads; Google through Supabase Auth selected | Supabase connection deferred by user; login UI, privileged MFA, permission administration and full RBAC matrix |
| B12 canonical schema | One Alembic history, additive baseline/safety/server-only RLS migrations, financial/immutability constraints; Supabase PostgreSQL selected | Supabase connection deferred; full entity model, production runtime-role/tenant RLS policies and migration release review |
| B13 consent/privacy | Approved-policy references, append-only consent, private manual look deletion and withdrawal cleanup worker, redacted request evidence | Real policy approval, facial media/private object storage, vendor deletion, retention scheduling and backup tombstones |
| B14 jobs/outbox | Atomic credit/privacy outbox writes, transactional privacy consumer with safe concurrent claims | Managed durable broker, AI dispatch, retry/dead-letter/timeout reconciliation and other event consumers |
| B15 commercial kernel | Internal balanced append-only credits, reserve/capture/release, deduplication, no negative user buckets | Credit lots/expiry/grant verification, balanced money ledger, store/PSP webhooks, reconciliation and payouts; no commercial credit issuance enabled |
| B16 operations | Sanitized request IDs/log fields, local PostgreSQL, explicit readiness/liveness and CI | Exported telemetry, cloud IaC, alerting, restore/SLO/penetration evidence |
| CTL-02 / R13 foundation | Private user-authored look/component revisions, explicit quantity validation and immutable content hashes | AI decomposition/provider adapters, dependency graph, full taxonomy and measured benchmark |
| CTL-04/08 primitives | Decimal organic scoring and evidence/relevance-gated first-price candidate ordering with tests | Verified catalog matching, transactional ad cap/frequency reservations and live auction/billing integration; no ad-serving endpoint |
| Other R01–R27 / CTL work | Approved design/backlog only | Remains unimplemented; no actual merchants/inventory, AI outputs, bookings, conversions or revenue are asserted |

Fixtures are restricted to automated tests. JWT tests use generated test keys, and API authorization tests stub only the JWKS transport; they are not evidence of a connected identity provider. PostgreSQL tests exercise actual commits, row locks, deferred journal constraints, concurrency, idempotency and consent deletion. Ranking tests establish policy primitives, not catalog relevance, African-hair quality or full auction integrity.

No production deployment, destructive schema rollback, paid vendor trial or fabricated commercial integration is included. External prerequisites: connect the selected Google/Supabase Auth and PostgreSQL project when the user requests it; qualify AI and payment vendors; license evaluation data; choose private storage/queue/project region and approve legal policies. Enter credentials only through secure settings, never chat. These prevent calling Phase 1 or the application fully ready. [ADR 015](adr-015-supabase-google-capture.md) records the confirmed automatic beauty-capture/results flow; camera/provider implementation remains future work.

See `validation.md` for current-run check results and `pr-description.md` for review scope. Update this matrix with each subsequent feature PR; never mark a broader requirement complete from its foundation slice.
