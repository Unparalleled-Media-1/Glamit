# Defect register

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

| ID | Severity | Status | Issue / evidence or next action |
|---|---|---|---|
| D001 | P2 | FIXED | Login SSR hydration failed across browser sizes: Host ICU produced different country labels. Versioned labels and deterministic sorting; login-hydration regression. |
| D002 | P2 | FIXED | Low-contrast captions on Shop/Product/Report/Color: Use existing mauve token for affected text; strict axe regression. |
| D003 | P2 | FIXED | Conversation label on generic div: Named role=log with polite live announcements; strict axe regression. |
| D004 | P2 | FIXED | Business/admin skip links did not focus main: Focusable main target; keyboard and focused interaction regressions. |
| D101 | P1 | OPEN | SMS and optional OAuth unavailable: Configure approved providers and test actual signup/linking/delivery/abuse controls. |
| D102 | P1 | OPEN | Real mobile biometrics unverified: Signed app identifiers/builds and physical iOS/Android testing required. |
| D103 | P1 | OPEN | Hosted AI operation unimplemented: Authenticated analysis returned 501; model/media/history/matching integrations need implementation and qualification. |
| D104 | P1 | OPEN | Private image/wardrobe persistence unavailable: No Storage buckets; complete consent, retention, upload/access/deletion workflows before activation. |
| D105 | P1 | OPEN | Verified marketplace and merchant execution unavailable: Complete catalog publication, inventory, location matching and merchant qualification; layouts alone do not fulfill this. |
| D106 | P1 | OPEN | Stripe configured in live mode: Test secret/webhook, two eligible merchants and real reconciliation evidence required; no live mutation attempted. |
| D107 | P1 | OPEN | Checkout/order/fulfillment workflows incomplete: Connect authoritative pricing, order persistence and inventory/financial lifecycle. |
| D108 | P1 | OPEN | Bookings workflow incomplete: Implement/verify atomic availability, booking, changes and notifications; no booking rate invented. |
| D109 | P1 | OPEN | Creator, ads and admin execution incomplete: Qualified role-specific persistent operations and authorization tests required. |
| D110 | P1 | OPEN | Notification delivery not configured: Preferences save; actual SMS/email/push and order/booking delivery unverified. |
| D111 | P1 | OPEN | Public hosting/monitoring/recovery unverified: CI reached Railway: served SHA d846b94c2fe6f0b4394be2b74c27734cde4533bf, 78/78 anonymous route responses HTTP200; live200, readiness503 not_configured. Web public Supabase key is unavailable to readiness. Runtime/source settings, logs and rollback remain unverified without agent token. |
| D112 | P1 | OPEN | Legal and complete recovery/deletion gates incomplete: Terms publication, legal/retention approval and lost-all-methods recovery/deletion workflow required. |
| D113 | P1 | FIXED | Reviewed main consolidation incomplete: Approved feature PRs21–26 merged into actual default; main absent. Clean default CI passes. Dependency PRs remain separately reviewed. |
| D201 | P1 | FIXED | Release lock omitted G12 and deployed Railway evidence: Four new structural fixtures failed before repair; eight release-lock tests pass after repair. No synthetic receipt or provider fixture counts as live evidence. |

D201 is an audit-tool fix only; four new negative cases failed before repair and eight validator cases passed afterward. `release-lock-before.log` / `release-lock-after.log` are under the artifact directory. Synthetic validation fixtures never become real Stripe or Railway evidence. All current production blockers remain unresolved; no disabled integration was turned into a mock success.
