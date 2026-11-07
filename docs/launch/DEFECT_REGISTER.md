# Defects and release blockers

7 November 2026, Africa/Johannesburg. Evidence timestamps are UTC. **Public launch: NO-GO.**

| ID | Severity | Finding | Status | Repair / next evidence |
|---|---|---|---|---|
| D001 | P2 | Login SSR hydration failed across browser sizes | FIXED | Host ICU produced different country labels. Versioned labels and deterministic sorting; login-hydration regression. |
| D002 | P2 | Low-contrast captions on Shop/Product/Report/Color | FIXED | Use existing mauve token for affected text; strict axe regression. |
| D003 | P2 | Conversation label on generic div | FIXED | Named role=log with polite live announcements; strict axe regression. |
| D004 | P2 | Business/admin skip links did not focus main | FIXED | Focusable main target; keyboard and focused interaction regressions. |
| D101 | P1 | SMS and optional OAuth unavailable | OPEN | Configure approved providers and test actual signup/linking/delivery/abuse controls. |
| D102 | P1 | Real mobile biometrics unverified | OPEN | Signed app identifiers/builds and physical iOS/Android testing required. |
| D103 | P1 | Hosted AI operation unimplemented | OPEN | Authenticated analysis returned 501; model/media/history/matching integrations need implementation and qualification. |
| D104 | P1 | Private image/wardrobe persistence unavailable | OPEN | No Storage buckets; complete consent, retention, upload/access/deletion workflows before activation. |
| D105 | P1 | Verified marketplace and merchant execution unavailable | OPEN | Complete catalog publication, inventory, location matching and merchant qualification; layouts alone do not fulfill this. |
| D106 | P1 | Stripe configured in live mode | OPEN | Test secret/webhook, two eligible merchants and real reconciliation evidence required; no live mutation attempted. |
| D107 | P1 | Checkout/order/fulfillment workflows incomplete | OPEN | Connect authoritative pricing, order persistence and inventory/financial lifecycle. |
| D108 | P1 | Bookings workflow incomplete | OPEN | Implement/verify atomic availability, booking, changes and notifications; no booking rate invented. |
| D109 | P1 | Creator, ads and admin execution incomplete | OPEN | Qualified role-specific persistent operations and authorization tests required. |
| D110 | P1 | Notification delivery not configured | OPEN | Preferences save; actual SMS/email/push and order/booking delivery unverified. |
| D111 | P1 | Public hosting/monitoring/recovery unverified | OPEN | Website excluded by applied network policy, cPanel access absent, no restore/rollback drill or pilot UAT. |
| D112 | P1 | Legal and complete recovery/deletion gates incomplete | OPEN | Terms publication, legal/retention approval and lost-all-methods recovery/deletion workflow required. |
| D113 | P1 | Reviewed main consolidation incomplete | OPEN | Open feature PRs lack current-head approvals; no clean merged-main release candidate. |

Four implemented-product defects were repaired. Release blockers include missing implementations as well as missing external configuration. No P0 was found in executed checks; unexecuted areas are not certified defect-free. All blockers remain visible and prevent public certification; skipped tests are not waived. See raw initial/intermediate/final evidence for the repair sequence.
