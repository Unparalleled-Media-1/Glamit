# Marketplace and payments audit

08 November 2026 08:04 SAST. **NO-GO. Audit plus one tested P0 candidate repair; no agent-initiated production deployment, schema write, login message or financial mutation.**

[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Fresh remote metadata](evidence/remote-readiness.json) · [Production catalog](evidence/production-catalog.json) · [Deployed receipt](evidence/railway-ci-receipt.json).

| ID | Requirement | Status | Gap |
| --- | --- | --- | --- |
| GB-046 | Verified product catalog/listing detail | PARTIALLY IMPLEMENTED | Canonical catalog/product/variant tables and FastAPI publication/review; no live approved supply feeds |
| GB-047 | Product search/categories/filters/sorting | PARTIALLY IMPLEMENTED | Editorial browse and strict match engine; public authorized search/catalog transport not operational |
| GB-048 | Variants/shades/stock and shipping feasibility | PARTIALLY IMPLEMENTED | Variant schema and client eligibility checks; no live stock reservation or fulfillment source |
| GB-049 | Analysis-to-product recommendation matching | PARTIALLY IMPLEMENTED | Owner requirements and strict matcher tests; no real analysis source or verified offers connected |
| GB-050 | Organic versus sponsored disclosure | PARTIALLY IMPLEMENTED | Separate label/card and policy paths; no qualified live placements |
| GB-051 | Wishlist and saved requirements | PARTIALLY IMPLEMENTED | Saved requirement API/local choices; no persistent product wishlist or stock watch delivery |
| GB-052 | Verified product detail-to-cart journey | PARTIALLY IMPLEMENTED | Offer validation and review UI; production offer port has no implementation |
| GB-053 | Persistent multi-merchant cart | PLACEHOLDER | Session cart validator/hook only; no canonical durable cart or merchant split operations |
| GB-054 | Server-authoritative checkout/quote | PARTIALLY IMPLEMENTED | Client quote contract and separate sandbox price authority; no hosted checkout API |
| GB-055 | Order confirmation/tracking/cancellation | PLACEHOLDER | Receipt/order UI gate; no operational consumer order/tracking/merchant cancellation service |
| GB-056 | Verified buyer reviews and counterfeit reporting | MISSING | Workspace labels only; no purchase-verified review/report/moderation workflow |
| GB-057 | Restock and price-drop notifications | MISSING | No wishlist/watch/stock/price event subscriptions or delivery jobs |
| GB-134 | Delivery address and complete tax/shipping quote | MISSING | No durable address or actual full-cost/tax/shipping provider orchestration; client quote contract is not checkout |
| GB-135 | Return authorization and customer refund case workflow | MISSING | Sandbox refund arithmetic exists but no buyer/merchant RMA/return evidence or operational case service |
| GB-058 | Merchant registration/verification/onboarding | PARTIALLY IMPLEMENTED | Organization and merchant schema/RBAC; no completed real KYC/approval/onboarding journey |
| GB-059 | Snap & List camera/gallery and product draft | PARTIALLY IMPLEMENTED | Web/native local draft forms and merchant factual validation; private media upload not connected |
| GB-060 | AI product image enhancement and fact review | PARTIALLY IMPLEMENTED | Catalog AI-job lease/worker protocol; no provider dispatch or media storage |
| GB-061 | Merchant publishing and content moderation | PARTIALLY IMPLEMENTED | Canonical reviewed-revision publication with local DB tests; current hosted transport lacks catalog parity |
| GB-062 | Inventory and variant management | PARTIALLY IMPLEMENTED | Products/variants schema and planning panels; no live merchant stock mutation/reservation workflow |
| GB-063 | Merchant orders/partial fulfillment | MISSING | Generic draft panel is not an order service; sandbox fulfillment is not merchant production operations |
| GB-064 | Merchant analytics/billing/storefront | PLACEHOLDER | Generic planning fields only; no executed merchant sales/invoice/event analytics |
| GB-065 | Professional/salon profiles and verified discovery | PARTIALLY IMPLEMENTED | Professional schema and catalog kind; real listings/availability source unqualified |
| GB-066 | Availability and atomic appointment booking | MISSING | No booking-slot/hold/appointment tables or atomic confirmation service |
| GB-067 | Booking deposits/cancellation/refunds | MISSING | No booking/payment policy engine; no unapproved service commission may be invented |
| GB-068 | Tailor/designer quote/fittings/milestones | MISSING | Workspace planning labels only; no transactional quote/project/milestone data model |
| GB-069 | Google Calendar synchronization | MISSING | No calendar OAuth/sync/conflict handling adapter or worker |
| GB-132 | Authorized catalog feed import/freshness synchronization | PARTIALLY IMPLEMENTED | Local import/revision/outbox and freshness suppression exist; no authorized production feed adapter or complete inventory sync |
| GB-133 | Merchant tax/shipping/price settings | PLACEHOLDER | Planning fields and factual catalog revisions only; no executed delivery/tax/settings quote operation |
| GB-136 | Seller protection/suspension/appeals | PARTIALLY IMPLEMENTED | Organization suspension/verification and catalog review controls; complete dispute/appeal/evidence handling missing |
| GB-093 | Stripe platform/test connected account verification | BLOCKED BY CREDENTIALS | Current key returns livemode=true; no webhook secret/test account capabilities evidence |
| GB-094 | Stripe-hosted merchant onboarding | PARTIALLY IMPLEMENTED | Test-only adapter creates account links; production merchant/UI flow unconnected |
| GB-095 | Server-priced multi-merchant payment/charge splitting | PARTIALLY IMPLEMENTED | Sandbox order lines and separate-charge/transfer logic; no real test IDs or platform eligibility verification |
| GB-096 | 10% eligible physical-item commission/refund calculation | PARTIALLY IMPLEMENTED | Pure server policy and immutable sandbox ledger; actual Stripe settlement/fees not reconciled |
| GB-097 | Processing fees/shipping/taxes allocation | PARTIALLY IMPLEMENTED | Sandbox accounting separation; actual balance transaction fees and jurisdictional tax/shipping integration missing |
| GB-098 | Signed idempotent Stripe webhooks | PARTIALLY IMPLEMENTED | Signature/event dedupe/local transaction tests; no configured test endpoint/secret or real duplicate-event proof |
| GB-099 | Immutable commission/transfer ledger | PARTIALLY IMPLEMENTED | Isolated sandbox append-only journals; not deployed production application financial ledger |
| GB-100 | Refunds/partial fulfillment/transfers/reversals | PARTIALLY IMPLEMENTED | Local transaction scenarios using doubles; no real Stripe financial acceptance |
| GB-101 | Disputes/chargebacks and reconciliation | PARTIALLY IMPLEMENTED | Sandbox dispute/fee/evidence handling; real charge/dispute/transfer balance proof absent |
| GB-102 | Stripe separate charges/transfers country eligibility | BLOCKED BY PLATFORM APPROVAL | Legal entity US reported; actual connected country/payout/settlement eligibility not qualified |
| GB-103 | Peach Payments approved South African capabilities | MISSING | No enabled provider configuration/adapter or contracted marketplace split settlement |

## Production versus sandbox

Canonical catalog/review/matching code is in standalone FastAPI. Production clients do not instantiate GlamApi and instead use selected direct Edge account/creator operations. The Edge dispatcher at0013 delegates to SQL/RPC and raises BACKEND_OPERATION_NOT_IMPLEMENTED for unsupported catalog/order/booking paths. Candidate consumer quote/offer/order ports are unbound. No operational durable cart, stock hold, consumer order, merchant fulfillment or appointment service was found.

StripeTestConfig refuses live keys and nonlocal/non_test databases. The isolated0009 migration is a sibling, absent from production. Do not merge it into application deployment. Server commerce_policy.py preserves10% eligible physical-item policy; local sandbox verifies allocation/refund/idempotency/double-entry behavior with transport doubles. No additional professional/creator percentage is approved.

| Actual financial observation | Result |
| --- | --- |
| GET /v1/balance mode | True |
| Actual payment IDs | NONE |
| Actual transfer IDs | NONE |
| Actual processing fees/reconciliation | NOT EXECUTED |
| Financial mutations | 0 |

Use distinct Stripe test keys, signed test webhook, eligible connected test accounts and isolated ledger. Qualify platform country/settlement capabilities, real test success/failure/refund/dispute/duplicates/partial fulfillment, actual balance transactions and transfers before financial acceptance. An existing test balance is not commission proof.
