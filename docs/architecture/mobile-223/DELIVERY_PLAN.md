# Incremental delivery and approval gates

This is a proposed plan for review,not authorization to implement the223 screens. Dependencies are the detailed B01–B20 rows in [BACKEND_TASKS.csv](BACKEND_TASKS.csv). Each row states persistence,permission and acceptance requirements; none is completed by registering a route.

## Gates before implementation

**A — approve Phase0.** Review [AUDIT_AND_PLAN](AUDIT_AND_PLAN.md),all223 IDs,proposed aliases,preserved repo/migration layout,source divergence,risks and rollback plan. Reconcile source/release branches deliberately;do not merge all feature branches automatically.

**B — approve first-journey native design.** Specify real touch/gesture/canvas/sheet/loading/error/auth/privacy states for goals/camera→analysis→personalized TP→own-photo generation→before/after→save/reopen. Include native typography/text scaling,safe areas,Android back/iOS swipe-back,permissions/denial,uncertainty/corrections and simulation labels. Retain full223-scope design inventory without implying each screen is already drawn. No old rejected layouts or browser simulations count as design approval.

**C — qualify backend for the milestone.** Verify canonical FastAPI origin/running SHA,restricted runtime role,original Supabase Auth/storage/policies/eligibility/retention,worker dispatch and exact approved model/provider health. Reuse production0017;do not run schema creation again. Missing TP/generation records/contracts need separate reviewed additive candidates. Use an authorized test identity and explicitly isolated test data;never paste credentials into documents.

## Dependency-ordered batches after the relevant approvals

| Batch | Screen scope | Capability dependencies and delivery evidence |
| --- | --- | --- |
|1 Native foundation/auth/navigation|GL-001–016;GL-017–025;GL-203–208|B01/B02/B19. Introduce approved native routing/session/permissions and active feature entry only. Five consumer stacks are the IA target:Home,Analyze,Studio,Discover,Profile. Contextual Shop/Bookings/Stylist live off these stacks,not an extra shopping tab. Define guarded deep links and unimplemented-route behavior without223 empty pages. Both OSes must handle back/cold start/auth expiry and camera/library;web sign-in/regression must remain intact|
|2 Durable Analyze|GL-017–034;GL-121;relevant privacy states|B02/B20. Actual user-owned upload,current two-policy consent,job/provider/report,uncertainty/correction,history/Passport save and fresh-session recovery;complete skin/hair/grooming gaps under exact supported contracts. Real IDs,privacy/error recovery and Android/iOS evidence;table existence is not completion|
|3 First complete Transformation milestone|TP-01–14;GL-026/030–034 and necessary Studio entry|B03/B04/B12/B20. Preserve goals/analysis/selected look across recommendations→actual-photo preview→before/after→explanation/tutorial→products/professionals→save/refine/reopen. Real provider assets and atomic credit behavior,no sample filters. Reopen the same canonical plan on web and both native apps. STOP for the required complete-journey/design review before broad expansion|
|4 Studio and try-on|GL-035–052|B04/B08/B12/B20. Qualified makeup/hair/protective styles/grooming on a real portrait canvas,native controls,correct shades where supported,comparison/export/save and job/credit failure recovery. No fake generated variants|
|5 Stylist/events/wardrobe|GL-053–068|B05/B06. Persist conversations,invitation/dress-code/user preferences,weather/destination/packing and owned clothes;actual forecast refresh and correctable assumptions. Complete save/share/act workflow|
|6 Discover/creator consumption|GL-069–084|B07/B13/B20. Real content supply/search/pagination/follow/collections/tutorial/share/report with rights/moderation and ad disclosure. No fabricated creator metrics|
|7 Marketplace/checkout|GL-085–102|B08/B09. Verified catalog/variants/stock,durable server-priced cart/shipping/tax/orders,fulfillment/returns. Stripe test success/failure/refund/dispute/duplicates/partial merchant fulfillment and actual fees/transfers/10% reconciliation. No live activation|
|8 Professionals/bookings|GL-103–116|B10/B15/B19. Real search/services/time-zone availability,atomic slot holds/confirmation/reference looks/change/cancel/reviews/messages. Demonstrate concurrent double-booking denial and cross-client persistence|
|9 Profile/subscriptions/credits|GL-117–130;appropriate system states|B01/B11/B12/B17. Owner data/preferences/privacy/export/deletion;USD1.50/month orUSD15/year and qualified local prices;provider-hosted cards/native store billing/restore;verified credit purchases and consumer first-paid-referral month redemption. Separate financial activation approval remains|
|10 Operational business companions|GL-131–166|B13/B14/B15 with B07–B10. Creator creation/publishing/attribution,merchant Snap&List/facts/inventory/orders,professional staff/calendars/bookings/portfolio/messages. Full desktop operational web tools remain independent and authorized|
|11 Advertiser/affiliate/admin companions|GL-167–196|B16/B17/B18. Real reviewed campaigns/spend,attribution/agreements/earnings and restricted administrative queues/finance/support. No privilege from role selectors;no invented commercial rates or payout status|
|12 Shared Home/system integration and release certification|HOME-001;GL-197–208;all applicable cross-links|B01/B19 plus all domains. Home uses real consented account state and one-hand camera actions. Finish notifications/push/messages/deep links/offline/recovery,accessibility/device usability,parity/performance/security and observed deployed journeys. Home/system shells can be designed earlier but are not counted operational until their dependent actions work|

Within each batch:pin exact IDs/backend tasks;confirm missing code and acceptance;add meaningful failing tests;implement only the approved design/operations;run targeted and dependent regression;retain Android/iOS native/source/backend/web evidence separately;update the matrix with evidence;demonstrate the complete journey and obtain approval before expansion.

## Definition of acceptance

Maintain separate implementation,functional,independent-platform and launch-readiness statuses. No overall100% from compilation,screen count,WebView,fixture provider,local storage or browser screenshot. Require real owner-authenticated persistence,permission/isolation/error/idempotency/credit-financial behavior,actual Android/iOS builds and physical usability where required,plus unchanged web operations. Provider approvals/signing/live verification remain explicit gates;missing code cannot be relabeled as missing credentials.

Registry updates may map specialized states/aliases instead of forcing each state into a separate page. Any additional justified state receives a reviewed ID/crosswalk;do not silently remove existing GL/TP/HOME IDs. The older140-feature engineering backlog remains complementary:screen IDs are not a replacement for functional acceptance requirements.

Public launch remains a separate decision after exact Railway/client/server SHAs,verified original-project connectivity,provider/financial/store readiness,physical devices,monitoring and rollback evidence. This plan neither publishes nor requests blanket launch approval.
