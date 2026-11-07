# Defect register

07 November 2026 21:46 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

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
| D111 | P1 | OPEN | Public hosting/monitoring/recovery unverified: Railway token was configured in service settings, not this Codex environment. Agent token absent; proxy blocks deployed navigation. Actual Railway runtime/source/logs/rollback remain unverified. |
| D112 | P1 | OPEN | Legal and complete recovery/deletion gates incomplete: Terms publication, legal/retention approval and lost-all-methods recovery/deletion workflow required. |
| D113 | P1 | FIXED | Reviewed main consolidation incomplete: Approved feature PRs21–26 merged into actual default; main absent. Clean default CI passes. Dependency PRs remain separately reviewed. |
| D201 | P1 | FIXED | Release lock omitted G12 and deployed Railway evidence: Four new structural fixtures failed before repair; eight release-lock tests pass after repair. No synthetic receipt or provider fixture counts as live evidence. |

D201 is an audit-tool fix only; four new negative cases failed before repair and eight validator cases passed afterward. `release-lock-before.log` / `release-lock-after.log` are under the artifact directory. Synthetic validation fixtures never become real Stripe or Railway evidence. All current production blockers remain unresolved; no disabled integration was turned into a mock success.
