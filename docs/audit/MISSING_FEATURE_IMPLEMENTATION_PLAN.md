# Dependency-ordered implementation plan

08 November 2026 08:04 SAST. **NO-GO. Audit plus one tested P0 candidate repair; no agent-initiated production deployment, schema write, login message or financial mutation.**

[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Fresh remote metadata](evidence/remote-readiness.json) · [Production catalog](evidence/production-catalog.json) · [Deployed receipt](evidence/railway-ci-receipt.json).

No speculative features or silent launch deferrals. Only the production-build guard was repaired in this batch; the broader implementation remains incomplete. Credentials alone will not implement the28 missing operations or19 placeholders.

1. **P0 release/security:** review this candidate; provide project-scoped Railway access; set the original public Supabase key at web build/runtime through the approved workflow; verify readiness/CORS/callbacks; keep live Stripe blocked; replace administrative app DB credentials; approve lawful retention/guardian boundaries and verify rollback.
2. **P1 identity and media:** configure actual SMS/OAuth providers; complete web/native profile/routine/security parity and account deletion; design/version and locally test owner-scoped private image/report storage/retention before separately approved production migration/bucket setup.
3. **P1 core AI:** connect real authenticated analysis/provider jobs and credits, grounded results/corrections/Style Passport history, then try-on and measured image/model quality. Keys/models/rights/consent and genuine provider tests are required.
4. **P1 commerce:** connect canonical catalog transport and verified inventory; implement real cart/order/stock reservation/fulfillment services and server quotes; run the real Stripe test acceptance/reconciliation matrix; connect essential admin/support/return flows.
5. **P2 approved specialist modules:** atomic professional/tailor bookings, wardrobe/search, Creator0014 official OAuth/media, shoppable attribution, campaigns/advertising, subscriptions and notifications, in separate reviewable batches with schemas/RLS/tests. Optional status does not grant permission to defer advertised functionality.
6. **Qualification:** real authenticated deployed role journeys, physical iOS/Android builds/camera/biometrics/accessibility, load/performance, legal/pilot acceptance and all12 gates before final public-launch approval.

| ID | Unimplemented operation | Status | Specific next dependency |
| --- | --- | --- | --- |
| GB-012 | Account deletion including private media and provider tokens | MISSING | No completed deletion orchestration or deletion-job API; clearing local state is not account deletion |
| GB-015 | Nonmedical skin appearance analysis | PLACEHOLDER | Report labels exist; no operational skin-specific inference/orchestration or evaluation |
| GB-016 | Hair type/texture/condition analysis | PLACEHOLDER | Hair preferences/reference UI; no live hair inference result model or measured quality |
| GB-023 | Body/fit styling without attractiveness scoring | PLACEHOLDER | User-authored fit preferences and safety requirements; no qualified body/fit analysis or models |
| GB-024 | Fairness/inclusive analysis evaluation | MISSING | No actual diverse-provider evaluation evidence or cohort quality benchmark |
| GB-026 | Virtual makeup and exact product-shade try-on | PLACEHOLDER | Illustrative shade families; no qualified exact-shade model or product fidelity proof |
| GB-032 | Share/export generated looks | MISSING | No qualified generated media export/share lifecycle; local choice metadata is insufficient |
| GB-037 | Invitation upload and theme extraction | PLACEHOLDER | Reference attachment/manual fields only; no OCR/theme extraction or confirmed facts |
| GB-041 | Outfit combinations from owned clothing | PLACEHOLDER | Local text reuse into brief; no visual owned-item combination service |
| GB-042 | Universal Look Search from screenshot/inspiration | MISSING | No extraction/embedding/index retrieval endpoint; attaching a reference is not search |
| GB-043 | Visual Product Search from photos | MISSING | No visual catalog embedding/model or image-search result pipeline |
| GB-053 | Persistent multi-merchant cart | PLACEHOLDER | Session cart validator/hook only; no canonical durable cart or merchant split operations |
| GB-055 | Order confirmation/tracking/cancellation | PLACEHOLDER | Receipt/order UI gate; no operational consumer order/tracking/merchant cancellation service |
| GB-056 | Verified buyer reviews and counterfeit reporting | MISSING | Workspace labels only; no purchase-verified review/report/moderation workflow |
| GB-057 | Restock and price-drop notifications | MISSING | No wishlist/watch/stock/price event subscriptions or delivery jobs |
| GB-063 | Merchant orders/partial fulfillment | MISSING | Generic draft panel is not an order service; sandbox fulfillment is not merchant production operations |
| GB-064 | Merchant analytics/billing/storefront | PLACEHOLDER | Generic planning fields only; no executed merchant sales/invoice/event analytics |
| GB-066 | Availability and atomic appointment booking | MISSING | No booking-slot/hold/appointment tables or atomic confirmation service |
| GB-067 | Booking deposits/cancellation/refunds | MISSING | No booking/payment policy engine; no unapproved service commission may be invented |
| GB-068 | Tailor/designer quote/fittings/milestones | MISSING | Workspace planning labels only; no transactional quote/project/milestone data model |
| GB-069 | Google Calendar synchronization | MISSING | No calendar OAuth/sync/conflict handling adapter or worker |
| GB-071 | TikTok official account linking | PLACEHOLDER | Profile URL draft only; authorize/sync returns503; official app/scopes/token handling missing |
| GB-072 | Instagram official account linking | PLACEHOLDER | Profile URL draft only; no provider callback/token exchange or media permissions |
| GB-073 | YouTube official account linking | PLACEHOLDER | Channel URL draft only; no OAuth/authorized media adapter |
| GB-074 | Pinterest official account linking | PLACEHOLDER | Profile URL draft only; no provider callback/approved scopes |
| GB-075 | Facebook Page official linking | PLACEHOLDER | Profile URL draft only; no page permission selection/token integration |
| GB-077 | Authorized media retrieval and sync | MISSING | Media reference drafts and audit-log schema only; provider sync explicitly503 |
| GB-080 | Brand campaign applications/deliverables | PLACEHOLDER | Draft/schema planning only; no usable campaign execution/review service |
| GB-083 | Sponsored campaign setup/approval/budgets | PLACEHOLDER | Seven-step review is local/generic workspace drafts; no real campaign operations |
| GB-085 | Ad impressions/clicks/conversions reporting | MISSING | No ad event collection/deduplication/billing pipeline |
| GB-086 | Affiliate/partner attribution and settlement | PLACEHOLDER | Workspace fields only; no conversion allocation or approved financial settlement |
| GB-088 | Subscription plans/checkout/cancellation | MISSING | Credit-account accounting is not a subscription/product entitlement service |
| GB-092 | Growth funnel/cohort analytics and experiments | MISSING | No operational analytics/experiment service or consented cohort data pipeline |
| GB-103 | Peach Payments approved South African capabilities | MISSING | No enabled provider configuration/adapter or contracted marketplace split settlement |
| GB-107 | Private Storage upload/access/retention | MISSING | Production currently has no Storage buckets or private binary workflow |
| GB-111 | Railway deployment identity/health/readiness | BROKEN | Fresh8Nov externalCI served ff62f64; live200 but ready503 not_configured; runtime settings/logs require missing agent token |
| GB-112 | Correct production domain/CORS/auth callbacks | BROKEN | Auth still uses glamit.beauty; new glam.beauty Edge preflight403 in prior evidence; configuration requires verified release change |
| GB-113 | Brand logo/favicon/app icons | MISSING | Text brand exists; exact inline artwork unavailable as source files; current deployed DOM has no favicon/logo image |
| GB-123 | Personal data portability/export | MISSING | No complete authenticated export job/download lifecycle; preference JSON is not an account export |
| GB-126 | App-store digital purchase/restore/renewal entitlements | MISSING | No StoreKit/Google Play purchase receipt validation, restore, renewal/refund or shared entitlements service |
| GB-128 | Data retention/deletion legal-hold execution | MISSING | Policy/audit metadata exist; no complete retention scheduler, verified erasure, legal-hold or provider deletion orchestration |
| GB-129 | Customer support tickets and audited resolution | MISSING | Admin support planning labels only; no case service, customer status or controlled resolution workflow |
| GB-131 | Audited private-media access requests | MISSING | No controlled support/moderation media-access request/approval/expiry workflow; private Storage absent |
| GB-133 | Merchant tax/shipping/price settings | PLACEHOLDER | Planning fields and factual catalog revisions only; no executed delivery/tax/settings quote operation |
| GB-134 | Delivery address and complete tax/shipping quote | MISSING | No durable address or actual full-cost/tax/shipping provider orchestration; client quote contract is not checkout |
| GB-135 | Return authorization and customer refund case workflow | MISSING | Sandbox refund arithmetic exists but no buyer/merchant RMA/return evidence or operational case service |
| GB-137 | Atomic advertising budgets and traffic-fraud reconciliation | MISSING | No campaign reservations, signed click events, invalid traffic adjustments or advertiser spend reconciliation |
| GB-138 | Advertiser pause/schedule/appeal/invoice controls | PLACEHOLDER | Generic campaign planning/review forms only; no running campaign or invoice operation |
| GB-139 | Creator feed follow/block/report moderation | MISSING | Private creator drafts exist; no real public feed/follow/block/report and moderation lifecycle |
