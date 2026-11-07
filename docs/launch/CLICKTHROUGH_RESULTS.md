# Click-through results

07 November 2026 22:30 SAST. **NO-GO — no public launch or service mutation.** Machine evidence uses UTC timestamps.

## Latest deployed CI evidence

Observed 2026-11-07T20:26:00.185Z by the [read-only GitHub runner](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42410985870). Result: **ANONYMOUS_ROUTE_PROBE_ONLY**. 78 route/viewport responses collected; 78 returned HTTP success. Critical journeys remain **0 / 31 passed**. Deployed SHA: `d846b94c2fe6f0b4394be2b74c27734cde4533bf`.

Health observations: `/api/health/live` HTTP 200, `/api/health/ready` HTTP 503, `/health/live` HTTP 404, `/health/ready` HTTP 404.

The web readiness response is `not_configured`; this commit checks `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure the original project's public client key for the web build/runtime and rebuild only through the approved release workflow. Never substitute a service-role key. Actual Railway variable/build settings still require token-based inspection.

The CI home page observed no favicon link or logo image. Exact supplied artwork files remain unavailable in this workspace; PR28's photo repair is not included in the observed default-branch deployment.

This new evidence supersedes only the earlier workspace-only anonymous network-access result. The baseline sections below retain that earlier attempt for audit history. HTTP success is not a completed business journey. Railway runtime/build logs, source configuration, qualified authentication, financial acceptance and rollback remain unverified. No deployment or production mutation was performed. Full screenshots/trace are retained in the workflow artifact; this workspace's proxy also blocks its artifact/log download hosts. [Machine receipt](evidence/railway-rescue/railway-ci-receipt.json).

| Local metric | Observed |
|---|---|
| routes | 39 |
| route_viewport_visits | 117 |
| rendered_control_occurrences | 3048 |
| console_errors | 0 |
| page_errors | 0 |
| http_errors | 0 |
| overflow | 0 |
| broken_images | 0 |
| accessibility_violations | 0 |

| Local action disposition | Occurrences |
|---|---|
| PASSED | 1407 |
| PASSED_IDEMPOTENT | 39 |
| SKIPPED | 422 |
| BLOCKED | 70 |
| NO_OBSERVED_CHANGE | 18 |

Local passes mean observed state/navigation responses or idempotent selection, not AI, storage, stock, orders, bookings or business success. All remote/mutating requests were blocked in local traversal. 99 public role/module layouts were visited with 0 recorded errors. Authenticated merchant/admin authority was not activated. Creator form tests use intercepted test transport; their screenshots are labeled simulations.

Actual Railway: **0 checked HTTP routes; 39 blocked routes; 0 completed critical deployed journeys**.

| Role/domain journey | Current deployed result |
|---|---|
| Guest exploration and local navigation | BLOCKED |
| SMS registration, login, delivery and throttling | BLOCKED |
| Google, Apple, Facebook and secure linking | BLOCKED |
| iOS and Android biometric reauthentication | BLOCKED |
| Profile and approved preferences save/read | BLOCKED |
| Account deletion and lost-all-methods recovery | BLOCKED |
| Authorized face analysis operation and personal result | BLOCKED |
| Hair/grooming analysis and recommendations | BLOCKED |
| Skin appearance analysis without diagnosis | BLOCKED |
| Personal color/undertone and real product matching | BLOCKED |
| AI Studio transformation, compare, save and reopen | BLOCKED |
| AI Advisor conversation, memory and history | BLOCKED |
| Personal Stylist, complete outfit and virtual preview | BLOCKED |
| Event invitation extraction, styling and shopping | BLOCKED |
| Destination weather, outfits and packing recommendations | BLOCKED |
| Digital Wardrobe durable uploads and outfits | BLOCKED |
| Real search, variants, inventory and eligible offers | BLOCKED |
| Local/destination discovery and shipping feasibility | BLOCKED |
| Merchant onboarding, Snap & List, publish and orders | BLOCKED |
| Multi-merchant checkout and 10% reconciliation | BLOCKED |
| Order fulfillment, tracking, refund and ledger reversal | BLOCKED |
| Professional availability, booking conflict and changes | BLOCKED |
| Creator storefront, shoppable looks and attribution | BLOCKED |
| Campaign targeting, budgets and reporting | BLOCKED |
| Real admin approvals, moderation and finance controls | BLOCKED |
| OTP, order, booking, email and push delivery | BLOCKED |
| Private saved routine create/read/update/delete | BLOCKED |
| Authorized multi-role business switching and actions | BLOCKED |
| Consumer/tenant isolation and revoked-session denial | BLOCKED |
| Responsive accessibility including real native and screen readers | BLOCKED |
| Public HTTPS, monitoring, rollback and pilot UAT | BLOCKED |

[Machine workflow status](evidence/railway-rescue/workflow-results.json). Local screenshots and desktop/mobile traces are under `/workspace/artifacts/glam-railway-rescue`; browser viewport emulation is not native device testing.
