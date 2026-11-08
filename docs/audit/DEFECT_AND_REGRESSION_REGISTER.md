# Feature defects and regression evidence

08 November 2026 08:04 SAST. **NO-GO. Audit plus one tested P0 candidate repair; no agent-initiated production deployment, schema write, login message or financial mutation.**

[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Fresh remote metadata](evidence/remote-readiness.json) · [Production catalog](evidence/production-catalog.json) · [Deployed receipt](evidence/railway-ci-receipt.json).

Each F-GB ID maps one-to-one to the CSV; none of these incomplete operational features is closed. Existing launch defect IDs and release locks are preserved. Feature numbering is stable in requirements.json rather than inferred from route counts.

| Defect | Feature | Status | Remaining failure/blocker |
| --- | --- | --- | --- |
| F-GB-001 | SMS OTP signup/login | BLOCKED BY CREDENTIALS | Supabase phone disabled; Twilio account/auth/message-service credentials absent |
| F-GB-002 | Google OAuth login | BLOCKED BY CREDENTIALS | Provider disabled; client ID/secret and callbacks not configured |
| F-GB-003 | Apple OAuth login | BLOCKED BY CREDENTIALS | Provider disabled; Apple service/team/key and native entitlement qualification absent |
| F-GB-004 | Facebook OAuth login | BLOCKED BY CREDENTIALS | Provider disabled; client ID/secret and callback review absent |
| F-GB-005 | Native Face ID/Touch ID/Android biometric unlock | PARTIALLY IMPLEMENTED | SecureStore/local-auth code exists; no signed physical-device lifecycle tests |
| F-GB-006 | Guest exploration | PARTIALLY IMPLEMENTED | Actual web/native UI; deployed route response is not a complete device/user journey |
| F-GB-007 | Single identity and role/workspace switching | PARTIALLY IMPLEMENTED | Server grants and switcher exist; no live multi-role login/tenant journey |
| F-GB-008 | Secure account linking/unlinking | BLOCKED BY CREDENTIALS | Explicit identity-linking code; disabled providers prevent real callback and takeover tests |
| F-GB-009 | Profile/preferences and personalization consent | PARTIALLY IMPLEMENTED | Owner-scoped Edge/RPC profile/preferences exist; logged-in cross-device persistence not demonstrated |
| F-GB-010 | Session refresh and local/global logout | PARTIALLY IMPLEMENTED | Web/native session lifecycle code; actual long-running provider/device verification missing |
| F-GB-011 | Account recovery and phone replacement | PARTIALLY IMPLEMENTED | UI and same-session phone verification exist; lost-all-methods recovery unimplemented |
| F-GB-012 | Account deletion including private media and provider tokens | MISSING | No completed deletion orchestration or deletion-job API; clearing local state is not account deletion |
| F-GB-013 | Age/guardian eligibility and image-processing consent | PARTIALLY IMPLEMENTED | Server eligibility/policy and local consent gating; minor/guardian end-to-end consent not qualified |
| F-GB-014 | Face shape and facial-feature inference | PARTIALLY IMPLEMENTED | Finding schema/UI and internal OpenAI adapter only; request endpoint returns503; key absent |
| F-GB-015 | Nonmedical skin appearance analysis | PLACEHOLDER | Report labels exist; no operational skin-specific inference/orchestration or evaluation |
| F-GB-016 | Hair type/texture/condition analysis | PLACEHOLDER | Hair preferences/reference UI; no live hair inference result model or measured quality |
| F-GB-017 | Personal color and undertone analysis | PARTIALLY IMPLEMENTED | Undertone finding contract and illustrative palette; real color analysis not invoked |
| F-GB-018 | Personalized grounded recommendations | PARTIALLY IMPLEMENTED | Direction and matching contracts; no analysis-to-qualified-provider-to-catalog production chain |
| F-GB-019 | Confidence/uncertainty and user corrections | PARTIALLY IMPLEMENTED | UI validates uncertainty and invalidates dependent previews; correction persistence absent |
| F-GB-020 | Style Passport saved user-approved results | PARTIALLY IMPLEMENTED | Preference-only style_passports table/RPC exists; no canonical approved analysis/report versions |
| F-GB-021 | Saved analysis reports/history and routines | PARTIALLY IMPLEMENTED | Routine CRUD exists; analysis history is empty and result persistence unconnected |
| F-GB-022 | Private image upload/capture and retention/deletion | PARTIALLY IMPLEMENTED | Native picker/local preview; web camera repair only PR28; production Storage has no bucket or upload workflow |
| F-GB-023 | Body/fit styling without attractiveness scoring | PLACEHOLDER | User-authored fit preferences and safety requirements; no qualified body/fit analysis or models |
| F-GB-024 | Fairness/inclusive analysis evaluation | MISSING | No actual diverse-provider evaluation evidence or cohort quality benchmark |
| F-GB-025 | AI makeover generation | PARTIALLY IMPLEMENTED | Internal Replicate adapter and reference editing UI; no connected generation orchestration |
| F-GB-026 | Virtual makeup and exact product-shade try-on | PLACEHOLDER | Illustrative shade families; no qualified exact-shade model or product fidelity proof |
| F-GB-027 | Hairstyle and hair-color transformations | PARTIALLY IMPLEMENTED | Tool controls and adapter candidates; no real generated transformation |
| F-GB-028 | Outfit/accessory virtual try-on | PARTIALLY IMPLEMENTED | FASHN adapter candidate; unmounted and key absent; accessory model not qualified |
| F-GB-029 | Live Look Builder beauty/fashion combinations | PARTIALLY IMPLEMENTED | Independent local components/snapshots work; realistic composed output unconnected |
| F-GB-030 | Before/after comparison and undo/reset | PARTIALLY IMPLEMENTED | Controls/history logic exist; no original-vs-genuine-generated-image journey |
| F-GB-031 | Save/edit/reopen looks | PARTIALLY IMPLEMENTED | Local snapshots and standalone look metadata API; hosted cross-session media/looks not wired |
| F-GB-032 | Share/export generated looks | MISSING | No qualified generated media export/share lifecycle; local choice metadata is insufficient |
| F-GB-033 | Generation history, errors and retries | PARTIALLY IMPLEMENTED | Client cancellation/fencing/error recovery; no persisted jobs/provider retry/usage history |
| F-GB-034 | Conversational AI Beauty Advisor | PARTIALLY IMPLEMENTED | Manual conversation brief and internal OpenAI.advise; no provider-backed client endpoint |
| F-GB-035 | AI Personal Stylist and Complete the Look | PARTIALLY IMPLEMENTED | Goals/brief/Look Builder UI; no grounded recommendation orchestration |
| F-GB-036 | Occasion/Event Stylist | PARTIALLY IMPLEMENTED | Manual event requirements; no live event-specific analysis or measured outfit suitability |
| F-GB-037 | Invitation upload and theme extraction | PLACEHOLDER | Reference attachment/manual fields only; no OCR/theme extraction or confirmed facts |
| F-GB-038 | Destination/weather forecasts and outfits | PARTIALLY IMPLEMENTED | Trip form and Open-Meteo adapter; weather port unbound in production |
| F-GB-039 | Packing lists and forecast-change alerts | PARTIALLY IMPLEMENTED | Manual checklist works; no persisted trip/forecast refresh/notification worker |
| F-GB-040 | Digital Wardrobe CRUD and photo lifecycle | PARTIALLY IMPLEMENTED | Opt-in device metadata entries; no canonical wardrobe table/media CRUD or account synchronization |
| F-GB-041 | Outfit combinations from owned clothing | PLACEHOLDER | Local text reuse into brief; no visual owned-item combination service |
| F-GB-042 | Universal Look Search from screenshot/inspiration | MISSING | No extraction/embedding/index retrieval endpoint; attaching a reference is not search |
| F-GB-043 | Visual Product Search from photos | MISSING | No visual catalog embedding/model or image-search result pipeline |
| F-GB-044 | Location-aware organic product/professional discovery | PARTIALLY IMPLEMENTED | City/country fields, strict matching and Google Maps candidate; real local coverage unqualified |
| F-GB-045 | Inclusive modesty/sizing/accessibility styling preferences | PARTIALLY IMPLEMENTED | Manual style/coverage preferences exist; full model/ranking and device accessibility acceptance absent |
| F-GB-046 | Verified product catalog/listing detail | PARTIALLY IMPLEMENTED | Canonical catalog/product/variant tables and FastAPI publication/review; no live approved supply feeds |
| F-GB-047 | Product search/categories/filters/sorting | PARTIALLY IMPLEMENTED | Editorial browse and strict match engine; public authorized search/catalog transport not operational |
| F-GB-048 | Variants/shades/stock and shipping feasibility | PARTIALLY IMPLEMENTED | Variant schema and client eligibility checks; no live stock reservation or fulfillment source |
| F-GB-049 | Analysis-to-product recommendation matching | PARTIALLY IMPLEMENTED | Owner requirements and strict matcher tests; no real analysis source or verified offers connected |
| F-GB-050 | Organic versus sponsored disclosure | PARTIALLY IMPLEMENTED | Separate label/card and policy paths; no qualified live placements |
| F-GB-051 | Wishlist and saved requirements | PARTIALLY IMPLEMENTED | Saved requirement API/local choices; no persistent product wishlist or stock watch delivery |
| F-GB-052 | Verified product detail-to-cart journey | PARTIALLY IMPLEMENTED | Offer validation and review UI; production offer port has no implementation |
| F-GB-053 | Persistent multi-merchant cart | PLACEHOLDER | Session cart validator/hook only; no canonical durable cart or merchant split operations |
| F-GB-054 | Server-authoritative checkout/quote | PARTIALLY IMPLEMENTED | Client quote contract and separate sandbox price authority; no hosted checkout API |
| F-GB-055 | Order confirmation/tracking/cancellation | PLACEHOLDER | Receipt/order UI gate; no operational consumer order/tracking/merchant cancellation service |
| F-GB-056 | Verified buyer reviews and counterfeit reporting | MISSING | Workspace labels only; no purchase-verified review/report/moderation workflow |
| F-GB-057 | Restock and price-drop notifications | MISSING | No wishlist/watch/stock/price event subscriptions or delivery jobs |
| F-GB-058 | Merchant registration/verification/onboarding | PARTIALLY IMPLEMENTED | Organization and merchant schema/RBAC; no completed real KYC/approval/onboarding journey |
| F-GB-059 | Snap & List camera/gallery and product draft | PARTIALLY IMPLEMENTED | Web/native local draft forms and merchant factual validation; private media upload not connected |
| F-GB-060 | AI product image enhancement and fact review | PARTIALLY IMPLEMENTED | Catalog AI-job lease/worker protocol; no provider dispatch or media storage |
| F-GB-061 | Merchant publishing and content moderation | PARTIALLY IMPLEMENTED | Canonical reviewed-revision publication with local DB tests; current hosted transport lacks catalog parity |
| F-GB-062 | Inventory and variant management | PARTIALLY IMPLEMENTED | Products/variants schema and planning panels; no live merchant stock mutation/reservation workflow |
| F-GB-063 | Merchant orders/partial fulfillment | MISSING | Generic draft panel is not an order service; sandbox fulfillment is not merchant production operations |
| F-GB-064 | Merchant analytics/billing/storefront | PLACEHOLDER | Generic planning fields only; no executed merchant sales/invoice/event analytics |
| F-GB-065 | Professional/salon profiles and verified discovery | PARTIALLY IMPLEMENTED | Professional schema and catalog kind; real listings/availability source unqualified |
| F-GB-066 | Availability and atomic appointment booking | MISSING | No booking-slot/hold/appointment tables or atomic confirmation service |
| F-GB-067 | Booking deposits/cancellation/refunds | MISSING | No booking/payment policy engine; no unapproved service commission may be invented |
| F-GB-068 | Tailor/designer quote/fittings/milestones | MISSING | Workspace planning labels only; no transactional quote/project/milestone data model |
| F-GB-069 | Google Calendar synchronization | MISSING | No calendar OAuth/sync/conflict handling adapter or worker |
| F-GB-070 | Creator activation/profile | PARTIALLY IMPLEMENTED | Candidate0014 profile/draft RPC and web/native UI; production migration not applied |
| F-GB-071 | TikTok official account linking | PLACEHOLDER | Profile URL draft only; authorize/sync returns503; official app/scopes/token handling missing |
| F-GB-072 | Instagram official account linking | PLACEHOLDER | Profile URL draft only; no provider callback/token exchange or media permissions |
| F-GB-073 | YouTube official account linking | PLACEHOLDER | Channel URL draft only; no OAuth/authorized media adapter |
| F-GB-074 | Pinterest official account linking | PLACEHOLDER | Profile URL draft only; no provider callback/approved scopes |
| F-GB-075 | Facebook Page official linking | PLACEHOLDER | Profile URL draft only; no page permission selection/token integration |
| F-GB-076 | Social account disconnection/token revocation | PARTIALLY IMPLEMENTED | Candidate local tombstone/revoke flag; no actual provider token revocation |
| F-GB-077 | Authorized media retrieval and sync | MISSING | Media reference drafts and audit-log schema only; provider sync explicitly503 |
| F-GB-078 | Shoppable creator collections/product associations | PARTIALLY IMPLEMENTED | Private collection draft associations; publish blocked; no verified shoppable storefront |
| F-GB-079 | Creator referral attribution | PARTIALLY IMPLEMENTED | Candidate referrals/attribution schema; no production tracked conversion pipeline |
| F-GB-080 | Brand campaign applications/deliverables | PLACEHOLDER | Draft/schema planning only; no usable campaign execution/review service |
| F-GB-081 | Creator earnings/payout eligibility | PARTIALLY IMPLEMENTED | Immutable candidate records/contracts; no real revenue/financial settlement or payout |
| F-GB-082 | Creator content rights/moderation | PARTIALLY IMPLEMENTED | Rights assertions/private access gates; real provider/content moderation and public distribution absent |
| F-GB-083 | Sponsored campaign setup/approval/budgets | PLACEHOLDER | Seven-step review is local/generic workspace drafts; no real campaign operations |
| F-GB-084 | Location-aware ad eligibility/targeting controls | PARTIALLY IMPLEMENTED | Market-policy/relevance restrictions; no location-backed serving or audited audience controls |
| F-GB-085 | Ad impressions/clicks/conversions reporting | MISSING | No ad event collection/deduplication/billing pipeline |
| F-GB-086 | Affiliate/partner attribution and settlement | PLACEHOLDER | Workspace fields only; no conversion allocation or approved financial settlement |
| F-GB-087 | Referral invitation/reward tracking | PARTIALLY IMPLEMENTED | Candidate creator referrals only; no full consumer invite/reward fulfillment |
| F-GB-088 | Subscription plans/checkout/cancellation | MISSING | Credit-account accounting is not a subscription/product entitlement service |
| F-GB-089 | AI usage limits/accounting | PARTIALLY IMPLEMENTED | Credit reservation/posting/worker lease code; no real AI dispatch-linked consumption records |
| F-GB-090 | Email/SMS/push and notification preferences | PARTIALLY IMPLEMENTED | Owner preferences and Resend/Twilio candidates; no configured delivery or push registration/worker |
| F-GB-091 | User marketing consent and privacy-safe analytics | PARTIALLY IMPLEMENTED | Preference opt-in and private-image exclusion rules; no end-to-end consent-aware event system |
| F-GB-092 | Growth funnel/cohort analytics and experiments | MISSING | No operational analytics/experiment service or consented cohort data pipeline |
| F-GB-093 | Stripe platform/test connected account verification | BLOCKED BY CREDENTIALS | Current key returns livemode=true; no webhook secret/test account capabilities evidence |
| F-GB-094 | Stripe-hosted merchant onboarding | PARTIALLY IMPLEMENTED | Test-only adapter creates account links; production merchant/UI flow unconnected |
| F-GB-095 | Server-priced multi-merchant payment/charge splitting | PARTIALLY IMPLEMENTED | Sandbox order lines and separate-charge/transfer logic; no real test IDs or platform eligibility verification |
| F-GB-096 | 10% eligible physical-item commission/refund calculation | PARTIALLY IMPLEMENTED | Pure server policy and immutable sandbox ledger; actual Stripe settlement/fees not reconciled |
| F-GB-097 | Processing fees/shipping/taxes allocation | PARTIALLY IMPLEMENTED | Sandbox accounting separation; actual balance transaction fees and jurisdictional tax/shipping integration missing |
| F-GB-098 | Signed idempotent Stripe webhooks | PARTIALLY IMPLEMENTED | Signature/event dedupe/local transaction tests; no configured test endpoint/secret or real duplicate-event proof |
| F-GB-099 | Immutable commission/transfer ledger | PARTIALLY IMPLEMENTED | Isolated sandbox append-only journals; not deployed production application financial ledger |
| F-GB-100 | Refunds/partial fulfillment/transfers/reversals | PARTIALLY IMPLEMENTED | Local transaction scenarios using doubles; no real Stripe financial acceptance |
| F-GB-101 | Disputes/chargebacks and reconciliation | PARTIALLY IMPLEMENTED | Sandbox dispute/fee/evidence handling; real charge/dispute/transfer balance proof absent |
| F-GB-102 | Stripe separate charges/transfers country eligibility | BLOCKED BY PLATFORM APPROVAL | Legal entity US reported; actual connected country/payout/settlement eligibility not qualified |
| F-GB-103 | Peach Payments approved South African capabilities | MISSING | No enabled provider configuration/adapter or contracted marketplace split settlement |
| F-GB-104 | Shared authenticated account/data across web/iOS/Android | PARTIALLY IMPLEMENTED | Shared Auth/Edge helpers and some profile/routine CRUD; no real cross-device account journey |
| F-GB-105 | Supabase canonical schema/migration reconciliation | PARTIALLY IMPLEMENTED | Fresh read-only inventory0013/41tables; feature models incomplete and0014 remains candidate |
| F-GB-106 | Production RLS/tenant isolation/permission boundaries | PARTIALLY IMPLEMENTED | RLS flags/policies and local two-user/tenant tests; no qualified production-role write/read test |
| F-GB-107 | Private Storage upload/access/retention | MISSING | Production currently has no Storage buckets or private binary workflow |
| F-GB-108 | Administrative role/context and moderation | PARTIALLY IMPLEMENTED | Staff-context/RBAC and catalog review endpoints; most operations are planning panels |
| F-GB-109 | Organization invitations/roles/membership revocation | PARTIALLY IMPLEMENTED | Standalone transactional workspace invitation code; hosted transport parity and real role sessions missing |
| F-GB-110 | API security/input validation/rate limiting | PARTIALLY IMPLEMENTED | Local request/RLS tests and Edge gate; deployed API role penetration/abuse/latency not qualified |
| F-GB-111 | Railway deployment identity/health/readiness | BROKEN | Fresh8Nov externalCI served ff62f64; live200 but ready503 not_configured; runtime settings/logs require missing agent token |
| F-GB-112 | Correct production domain/CORS/auth callbacks | BROKEN | Auth still uses glamit.beauty; new glam.beauty Edge preflight403 in prior evidence; configuration requires verified release change |
| F-GB-113 | Brand logo/favicon/app icons | MISSING | Text brand exists; exact inline artwork unavailable as source files; current deployed DOM has no favicon/logo image |
| F-GB-114 | Independent web/API/native build/release pipelines | PARTIALLY IMPLEMENTED | Docker/CI/EAS candidate configs; actual Railway source/runtime and signed native builds not verified |
| F-GB-115 | Signed iOS/Android builds/store credentials and real devices | BLOCKED BY PLATFORM APPROVAL | No registered bundle/package IDs/EAS project/store credentials; no adb/xcrun or physical-device run |
| F-GB-116 | Accessibility/mobile safe areas/responsiveness | PARTIALLY IMPLEMENTED | Local viewport/axe/keyboard tests; physical screen-reader/OS keyboard/native safe-area acceptance absent |
| F-GB-117 | Performance/load/provider latency budgets | NOT TESTED | Prior local page timings are not deployed provider/load/concurrency evidence |
| F-GB-118 | Monitoring/alerts/Sentry/support operations | PARTIALLY IMPLEMENTED | Structured error/redaction code and support planning panels; no configured Sentry/alert delivery |
| F-GB-119 | Backup/restore/rollback rehearsal | PARTIALLY IMPLEMENTED | Fresh completed physical backup metadata exists; no restore rehearsal or deployment rollback test |
| F-GB-120 | Security secret scan/environment separation | PARTIALLY IMPLEMENTED | Prior working-tree scan and public-key/sandbox guards; current app DB credential administrative; no whole-history/rotation proof |
| F-GB-121 | Legal/privacy/minor safeguarding approval | PARTIALLY IMPLEMENTED | Policy/eligibility models and safety copy; legal sign-off/guardian/retention/deletion acceptance missing |
| F-GB-122 | Twelve release gates and 31 critical journeys | PARTIALLY IMPLEMENTED | Version2 negative gate tests exist;0/31 qualified deployed journeys; no final launch approval |
| F-GB-123 | Personal data portability/export | MISSING | No complete authenticated export job/download lifecycle; preference JSON is not an account export |
| F-GB-124 | Country/language/currency/measurement localization | PARTIALLY IMPLEMENTED | Country/currency/manual locale fields exist; full translated UX and regional legal/currency activation unqualified |
| F-GB-125 | Regional age/market capability activation | PARTIALLY IMPLEMENTED | Default-deny market policy and adult eligibility exist; country-by-country actual provider/legal/minor qualification absent |
| F-GB-126 | App-store digital purchase/restore/renewal entitlements | MISSING | No StoreKit/Google Play purchase receipt validation, restore, renewal/refund or shared entitlements service |
| F-GB-127 | Credit quote/reservation/cancellation/history | PARTIALLY IMPLEMENTED | Immutable reservation/accounting and lease tests exist; consumer quote/history/actual generation/billing chain missing |
| F-GB-128 | Data retention/deletion legal-hold execution | MISSING | Policy/audit metadata exist; no complete retention scheduler, verified erasure, legal-hold or provider deletion orchestration |
| F-GB-129 | Customer support tickets and audited resolution | MISSING | Admin support planning labels only; no case service, customer status or controlled resolution workflow |
| F-GB-130 | Privileged admin MFA and step-up assurance | PARTIALLY IMPLEMENTED | Staff context checks fresh assurance in local tests; no real administrator MFA enrollment/step-up/session acceptance |
| F-GB-131 | Audited private-media access requests | MISSING | No controlled support/moderation media-access request/approval/expiry workflow; private Storage absent |
| F-GB-132 | Authorized catalog feed import/freshness synchronization | PARTIALLY IMPLEMENTED | Local import/revision/outbox and freshness suppression exist; no authorized production feed adapter or complete inventory sync |
| F-GB-133 | Merchant tax/shipping/price settings | PLACEHOLDER | Planning fields and factual catalog revisions only; no executed delivery/tax/settings quote operation |
| F-GB-134 | Delivery address and complete tax/shipping quote | MISSING | No durable address or actual full-cost/tax/shipping provider orchestration; client quote contract is not checkout |
| F-GB-135 | Return authorization and customer refund case workflow | MISSING | Sandbox refund arithmetic exists but no buyer/merchant RMA/return evidence or operational case service |
| F-GB-136 | Seller protection/suspension/appeals | PARTIALLY IMPLEMENTED | Organization suspension/verification and catalog review controls; complete dispute/appeal/evidence handling missing |
| F-GB-137 | Atomic advertising budgets and traffic-fraud reconciliation | MISSING | No campaign reservations, signed click events, invalid traffic adjustments or advertiser spend reconciliation |
| F-GB-138 | Advertiser pause/schedule/appeal/invoice controls | PLACEHOLDER | Generic campaign planning/review forms only; no running campaign or invoice operation |
| F-GB-139 | Creator feed follow/block/report moderation | MISSING | Private creator drafts exist; no real public feed/follow/block/report and moderation lifecycle |
| F-GB-140 | Organization team MFA and membership security | PARTIALLY IMPLEMENTED | Scoped roles/invitations and local revocation checks; no complete member MFA/account-security client enforcement journey |

P0-build-configuration candidate: before test failed because production guard accepted no key; after test passed with absent/offline/valid public/privileged-secret cases. Docker stage now invokes the required-key flag. It remains a deployed defect until readiness200 is demonstrated.

Current evidence/validation.json distinguishes passed checks from blocked provider/payment/device tests. The first local database attempts failed because the container was stopped/starting after environment recovery; the final readiness-checked run passed260. These environment failures are not168 demonstrated product defects. No failed provider test was hidden behind a double.
