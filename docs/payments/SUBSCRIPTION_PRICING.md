# GLAM Beauty subscription pricing and card saving

Approved by the user on 11 November 2026: **US$1.50 per month, or US$15 per year**, with equivalent local-currency pricing and card-saving capabilities. This replaces earlier illustrative subscription price assumptions. No feature quotas, unlimited AI allowance, trial, discount code, regional markup or business subscription rate is invented by this change.

| Plan | Canonical currency | Billed amount | Interval |
| --- | --- | --- | --- |
| glam_monthly | USD | 150 minor units (US$1.50) | One month |
| glam_yearly | USD | 1500 minor units (US$15.00) | One year |

Annual saving is US$3 against twelve monthly payments. Existing eligible physical-product commission remains unchanged at10%; subscription revenue is separate from merchant Connect transfers and has no invented merchant commission.

## Implemented source

- Server authority: services/api/src/glam_api/subscriptions.py. Public GET /v1/subscription-plans exposes exact plans and explicitly reports purchasing NOT CONFIGURED/disabled.
- Generated public catalog: packages/product/subscription-pricing.json. scripts/export_subscription_pricing.py and CI enforce agreement with the server. Web and future native billing clients must consume this authority or verified store offerings rather than hardcode independent prices.
- Website /pricing, linked in the footer: approved prices, savings, currency explanation, consent-based provider card storage, cancellation/renewal explanation and valid app-availability fallback. No disconnected Buy button or fabricated purchase success is shown.
- Isolated Stripe test Checkout adapter verifies actual customer-owner binding and exact active test Price amount/currency/interval/quantity before requesting a hosted subscription session. Rejects live, mismatched, malformed or cross-account objects. No raw card number/CVC enters application APIs, logs or storage.
- Optional hosted Setup Checkout requires separate explicit card-saving consent; it saves with the provider for future authorized use and does not start a subscription. Recurring checkout separately requires recurring-charge consent. Stable caller-provided UUID keys use the existing test gateway's single-attempt mutation behavior; no silent payment retry.
- Checkout URLs are restricted to the provider host. Creating or returning from a session grants no entitlement. This adapter is deliberately not mounted as an operational purchase/save-card API while durable billing authority is absent.

## Currency policy

USD is the commercial anchor, not the same numeric price in every currency. Server-side indicative equivalents require a named trusted rate source, timestamp within24hours, positive finite USD conversion rate and provider-supplied currency exponent; decimal half-up rounding supports zero/two/three/four minor-unit currencies. No invented rates or stale fallback exists. The quote helper is not a charge authority or a connected live FX feed.

Actual local-currency billing must use provider-supported recurring Prices or verified app-store offerings, with their currency support/minimums/rounding. Card-issuer conversion applies when charging USD; fees and applicable taxes must be disclosed before confirmation. No universal all-currencies acceptance or FX-rate lock is claimed. Current Stripe adapter validates USD base Prices only; generating/qualifying local recurring Prices and connecting the live rate source remain outstanding.

## Native billing and card controls

Digital subscriptions in iOS/Android must use applicable Apple/Google billing channels where required. Store-managed payment methods and restore/cancel flows are separate from Stripe card vaults. Do not add an unrestricted Stripe digital-subscription button to native apps or count this web/catalog batch as native IAP implementation. The controlled Analyze-first mobile design gate remains intact.

Required operational billing work remains: durable authenticated customer mappings and consent/version evidence; verified provider/customer/payment-method operations and removal; signed/idempotent invoice/subscription/setup webhooks; paid-entitlement and renewal/failure/grace/cancellation/refund reconciliation; restricted management portal; store product registration/receipt verification/restore; qualified currency offerings, tax/refund disclosures and actual test transactions. These are code/configuration/acceptance gaps, not merely missing API keys.

## Verification and release status

Pricing/FX/provider-contract tests and the existing full PostgreSQL suite are run independently of live keys. Browser click-through/accessibility/overflow checks cover /pricing plus existing legal/footer/business routes. Actual responsive browser captures are at /workspace/artifacts/glam-subscription-pricing; they are website evidence, not native app screenshots.

Final validation: **422 backend tests passed**, including **25 subscription pricing/FX/customer/consent/hosted-session contract tests**. Web TypeScript, generated OpenAPI/public-price consistency, Ruff, production Next.js build and public footer/routes/browser accessibility/320–1440px checks passed. [Backend test output](subscription-evidence/backend-tests.txt) and [browser output](subscription-evidence/web-tests.txt). The existing Starlette TestClient deprecation warning remains. No native files changed or native billing/device verification was performed for this batch.

No production database/settings, Stripe Prices/customers/subscriptions, provider credentials, app-store products or deployed application were changed. No real card was saved and no customer was charged. Live payments and public release remain disabled. This task establishes approved pricing and tested integration contracts; it does not claim operational subscription or native payment completion.
