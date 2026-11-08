# Cross-platform parity report

Observed 2026-11-08T15:00:58.123916+00:00. Source base `d38cf1667a50d5ae240dc75da6c683a770363fd9` plus the uncommitted/committed audit patch. Exact tested file hashes are in evidence/final/source-hashes.json. This is a failed acceptance audit, not a certificate of completion.

| Platform | PASS/applicable | Verified build acceptance | Native/device/deployed qualification |
| --- | --- | --- | --- |
| WEB | 2/140 | 1.43% | BLOCKED / NOT TESTED |
| iOS | 0/140 | 0.0% | BLOCKED / NOT TESTED |
| ANDROID | 0/140 | 0.0% | BLOCKED / NOT TESTED |

Overall: **0.48% (2/420)** with equal weighting per applicable platform requirement. Partial work is documented, never rounded to PASS. These percentages measure fully evidenced requirements, not lines of code or effort.

Native sources are shared but test results are not transferred between platforms. Native profile/routine editing, private organization/staff workspaces, product/order and social-provider operations do not have verified parity. A missing native operation is FAIL, not a credential excuse.

| Feature | Requirement | WEB | iOS | ANDROID |
| --- | --- | --- | --- | --- |
| GB-001 | SMS OTP signup/login | BLOCKED | BLOCKED | BLOCKED |
| GB-002 | Google OAuth login | BLOCKED | BLOCKED | BLOCKED |
| GB-003 | Apple OAuth login | BLOCKED | BLOCKED | BLOCKED |
| GB-004 | Facebook OAuth login | BLOCKED | BLOCKED | BLOCKED |
| GB-005 | Native Face ID/Touch ID/Android biometric unlock | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-006 | Guest exploration | PASS | NOT TESTED | NOT TESTED |
| GB-007 | Single identity and role/workspace switching | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-008 | Secure account linking/unlinking | BLOCKED | BLOCKED | BLOCKED |
| GB-009 | Profile/preferences and personalization consent | NOT TESTED | FAIL | FAIL |
| GB-010 | Session refresh and local/global logout | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-011 | Account recovery and phone replacement | FAIL | FAIL | FAIL |
| GB-012 | Account deletion including private media and provider tokens | FAIL | FAIL | FAIL |
| GB-013 | Age/guardian eligibility and image-processing consent | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-014 | Face shape and facial-feature inference | FAIL | FAIL | FAIL |
| GB-015 | Nonmedical skin appearance analysis | FAIL | FAIL | FAIL |
| GB-016 | Hair type/texture/condition analysis | FAIL | FAIL | FAIL |
| GB-017 | Personal color and undertone analysis | FAIL | FAIL | FAIL |
| GB-018 | Personalized grounded recommendations | FAIL | FAIL | FAIL |
| GB-019 | Confidence/uncertainty and user corrections | FAIL | FAIL | FAIL |
| GB-020 | Style Passport saved user-approved results | FAIL | FAIL | FAIL |
| GB-021 | Saved analysis reports/history and routines | FAIL | FAIL | FAIL |
| GB-022 | Private image upload/capture and retention/deletion | FAIL | FAIL | FAIL |
| GB-023 | Body/fit styling without attractiveness scoring | FAIL | FAIL | FAIL |
| GB-024 | Fairness/inclusive analysis evaluation | FAIL | FAIL | FAIL |
| GB-025 | AI makeover generation | FAIL | FAIL | FAIL |
| GB-026 | Virtual makeup and exact product-shade try-on | FAIL | FAIL | FAIL |
| GB-027 | Hairstyle and hair-color transformations | FAIL | FAIL | FAIL |
| GB-028 | Outfit/accessory virtual try-on | FAIL | FAIL | FAIL |
| GB-029 | Live Look Builder beauty/fashion combinations | FAIL | FAIL | FAIL |
| GB-030 | Before/after comparison and undo/reset | FAIL | FAIL | FAIL |
| GB-031 | Save/edit/reopen looks | FAIL | FAIL | FAIL |
| GB-032 | Share/export generated looks | FAIL | FAIL | FAIL |
| GB-033 | Generation history, errors and retries | FAIL | FAIL | FAIL |
| GB-034 | Conversational AI Beauty Advisor | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-035 | AI Personal Stylist and Complete the Look | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-036 | Occasion/Event Stylist | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-037 | Invitation upload and theme extraction | FAIL | FAIL | FAIL |
| GB-038 | Destination/weather forecasts and outfits | FAIL | FAIL | FAIL |
| GB-039 | Packing lists and forecast-change alerts | FAIL | FAIL | FAIL |
| GB-040 | Digital Wardrobe CRUD and photo lifecycle | FAIL | FAIL | FAIL |
| GB-041 | Outfit combinations from owned clothing | FAIL | FAIL | FAIL |
| GB-042 | Universal Look Search from screenshot/inspiration | FAIL | FAIL | FAIL |
| GB-043 | Visual Product Search from photos | FAIL | FAIL | FAIL |
| GB-044 | Location-aware organic product/professional discovery | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-045 | Inclusive modesty/sizing/accessibility styling preferences | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-046 | Verified product catalog/listing detail | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-047 | Product search/categories/filters/sorting | FAIL | FAIL | FAIL |
| GB-048 | Variants/shades/stock and shipping feasibility | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-049 | Analysis-to-product recommendation matching | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-050 | Organic versus sponsored disclosure | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-051 | Wishlist and saved requirements | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-052 | Verified product detail-to-cart journey | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-053 | Persistent multi-merchant cart | FAIL | FAIL | FAIL |
| GB-054 | Server-authoritative checkout/quote | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-055 | Order confirmation/tracking/cancellation | FAIL | FAIL | FAIL |
| GB-056 | Verified buyer reviews and counterfeit reporting | FAIL | FAIL | FAIL |
| GB-057 | Restock and price-drop notifications | FAIL | FAIL | FAIL |
| GB-058 | Merchant registration/verification/onboarding | FAIL | FAIL | FAIL |
| GB-059 | Snap & List camera/gallery and product draft | FAIL | FAIL | FAIL |
| GB-060 | AI product image enhancement and fact review | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-061 | Merchant publishing and content moderation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-062 | Inventory and variant management | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-063 | Merchant orders/partial fulfillment | FAIL | FAIL | FAIL |
| GB-064 | Merchant analytics/billing/storefront | FAIL | FAIL | FAIL |
| GB-065 | Professional/salon profiles and verified discovery | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-066 | Availability and atomic appointment booking | FAIL | FAIL | FAIL |
| GB-067 | Booking deposits/cancellation/refunds | FAIL | FAIL | FAIL |
| GB-068 | Tailor/designer quote/fittings/milestones | FAIL | FAIL | FAIL |
| GB-069 | Google Calendar synchronization | FAIL | FAIL | FAIL |
| GB-070 | Creator activation/profile | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-071 | TikTok official account linking | FAIL | FAIL | FAIL |
| GB-072 | Instagram official account linking | FAIL | FAIL | FAIL |
| GB-073 | YouTube official account linking | FAIL | FAIL | FAIL |
| GB-074 | Pinterest official account linking | FAIL | FAIL | FAIL |
| GB-075 | Facebook Page official linking | FAIL | FAIL | FAIL |
| GB-076 | Social account disconnection/token revocation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-077 | Authorized media retrieval and sync | FAIL | FAIL | FAIL |
| GB-078 | Shoppable creator collections/product associations | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-079 | Creator referral attribution | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-080 | Brand campaign applications/deliverables | FAIL | FAIL | FAIL |
| GB-081 | Creator earnings/payout eligibility | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-082 | Creator content rights/moderation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-083 | Sponsored campaign setup/approval/budgets | FAIL | FAIL | FAIL |
| GB-084 | Location-aware ad eligibility/targeting controls | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-085 | Ad impressions/clicks/conversions reporting | FAIL | FAIL | FAIL |
| GB-086 | Affiliate/partner attribution and settlement | FAIL | FAIL | FAIL |
| GB-087 | Referral invitation/reward tracking | FAIL | FAIL | FAIL |
| GB-088 | Subscription plans/checkout/cancellation | FAIL | FAIL | FAIL |
| GB-089 | AI usage limits/accounting | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-090 | Email/SMS/push and notification preferences | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-091 | User marketing consent and privacy-safe analytics | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-092 | Growth funnel/cohort analytics and experiments | FAIL | FAIL | FAIL |
| GB-093 | Stripe platform/test connected account verification | BLOCKED | BLOCKED | BLOCKED |
| GB-094 | Stripe-hosted merchant onboarding | FAIL | FAIL | FAIL |
| GB-095 | Server-priced multi-merchant payment/charge splitting | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-096 | 10% eligible physical-item commission/refund calculation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-097 | Processing fees/shipping/taxes allocation | FAIL | FAIL | FAIL |
| GB-098 | Signed idempotent Stripe webhooks | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-099 | Immutable commission/transfer ledger | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-100 | Refunds/partial fulfillment/transfers/reversals | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-101 | Disputes/chargebacks and reconciliation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-102 | Stripe separate charges/transfers country eligibility | BLOCKED | BLOCKED | BLOCKED |
| GB-103 | Peach Payments approved South African capabilities | FAIL | FAIL | FAIL |
| GB-104 | Shared authenticated account/data across web/iOS/Android | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-105 | Supabase canonical schema/migration reconciliation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-106 | Production RLS/tenant isolation/permission boundaries | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-107 | Private Storage upload/access/retention | FAIL | FAIL | FAIL |
| GB-108 | Administrative role/context and moderation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-109 | Organization invitations/roles/membership revocation | FAIL | FAIL | FAIL |
| GB-110 | API security/input validation/rate limiting | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-111 | Railway deployment identity/health/readiness | BLOCKED | BLOCKED | BLOCKED |
| GB-112 | Correct production domain/CORS/auth callbacks | FAIL | FAIL | FAIL |
| GB-113 | Brand logo/favicon/app icons | PASS | NOT TESTED | NOT TESTED |
| GB-114 | Independent web/API/native build/release pipelines | FAIL | FAIL | FAIL |
| GB-115 | Signed iOS/Android builds/store credentials and real devices | BLOCKED | BLOCKED | BLOCKED |
| GB-116 | Accessibility/mobile safe areas/responsiveness | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-117 | Performance/load/provider latency budgets | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-118 | Monitoring/alerts/Sentry/support operations | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-119 | Backup/restore/rollback rehearsal | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-120 | Security secret scan/environment separation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-121 | Legal/privacy/minor safeguarding approval | FAIL | FAIL | FAIL |
| GB-122 | Twelve release gates and 31 critical journeys | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-123 | Personal data portability/export | FAIL | FAIL | FAIL |
| GB-124 | Country/language/currency/measurement localization | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-125 | Regional age/market capability activation | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-126 | App-store digital purchase/restore/renewal entitlements | FAIL | FAIL | FAIL |
| GB-127 | Credit quote/reservation/cancellation/history | FAIL | FAIL | FAIL |
| GB-128 | Data retention/deletion legal-hold execution | FAIL | FAIL | FAIL |
| GB-129 | Customer support tickets and audited resolution | FAIL | FAIL | FAIL |
| GB-130 | Privileged admin MFA and step-up assurance | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-131 | Audited private-media access requests | FAIL | FAIL | FAIL |
| GB-132 | Authorized catalog feed import/freshness synchronization | NOT TESTED | NOT TESTED | NOT TESTED |
| GB-133 | Merchant tax/shipping/price settings | FAIL | FAIL | FAIL |
| GB-134 | Delivery address and complete tax/shipping quote | FAIL | FAIL | FAIL |
| GB-135 | Return authorization and customer refund case workflow | FAIL | FAIL | FAIL |
| GB-136 | Seller protection/suspension/appeals | FAIL | FAIL | FAIL |
| GB-137 | Atomic advertising budgets and traffic-fraud reconciliation | FAIL | FAIL | FAIL |
| GB-138 | Advertiser pause/schedule/appeal/invoice controls | FAIL | FAIL | FAIL |
| GB-139 | Creator feed follow/block/report moderation | FAIL | FAIL | FAIL |
| GB-140 | Organization team MFA and membership security | FAIL | FAIL | FAIL |
