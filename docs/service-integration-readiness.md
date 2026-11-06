# Service integration readiness

6 November 2026, Africa/Johannesburg. [Observed configuration-only report](application-preview/service-readiness.json). No configured provider secrets or identities were observed in this managed environment. No external provider calls, messages, image processing, payment or booking were executed. All live services are **NOT CONFIGURED**, never CONNECTED based on a mock.

| Service | Prepared/tested locally | Remaining activation evidence |
|---|---|---|
| OpenAI | Structured analysis and Advisor adapters; consent/schema/refusal/uncertainty tests; authenticated model-list probe logic | Secret, selected qualified model, current API contract confirmation, DPA/retention/deletion, eligible consent/storage, spend and real output benchmarks |
| FASHN | Apparel request/status and credits-probe contract; private-origin, consent, model and ID tests | Secret, selected current model/version/input contract, credits endpoint response confirmation, private media, image rights, fit/fidelity and latency/cost qualification. Not a hair/makeup engine |
| Replicate | Pinned workflow prediction/status and account-probe preparation; consent/version tests | Token, qualified immutable model/workflow, source/output privacy/deletion, safety/fidelity/cost benchmarks |
| Google Maps | Places text-search candidate contract, restricted field mask, explicit authenticated probe; no photo or feature data | Restricted key, API/billing permissions, country/geocoder/discovery accuracy, source rights and actual merchant coverage. Place existence does not verify marketplace stock |
| Open-Meteo | Entitlement-gated forecast request; date/timezone/range/outage tests, no imaginary seasonal fallback | Licensed commercial/customer endpoint and terms, forecast horizon and response normalization, current evidence/freshness and country qualification. No health check or forecast executed |
| Supabase | Existing canonical Auth/RBAC/database foundation retained; no new adapter bootstrapped | **BLOCKED G0**: branch consolidation, functional audit, separate approval. Do not add production credentials yet |
| GLAM marketplace | Typed match/variant/cart/server quote/order contracts; isolated browser doubles; existing canonical catalog tests | No order/payment orchestration implementation or new financial schema is introduced. Verified merchant supply, actual variant/stock/delivery/returns, marketplace orders/settlement/refund contracts and separate approvals remain |
| Stripe Connect | Secret naming, gated readiness and hosted-quote/order interface only | **BLOCKED live activation**: operating legal entity/country, platform and connected-account availability, merchant onboarding, ledger/settlement/refunds/webhooks/compliance. No payment API adapter activated |
| Peach Payments | Secret naming and gated readiness only | Contracted submerchant/split settlement/acquiring methods and South African compliance. Not an assumed alternative payout model |
| GLAM booking | Existing feasibility planning and catalog service requirements preserved; booking contract remains gated | Canonical schema/transaction approval, atomic availability/holds, accepted full quotes/deposits/cancellation and professional onboarding. No fake slots |
| Resend | Read-only domain-health preparation and test double; never sends mail | Key, verified sender/domain, approved templates/consent/outbox/retry delivery implementation and real delivery tests |
| Twilio | Read-only account-health preparation and test double; never sends SMS/WhatsApp | SID/token, approved channels/numbers/templates, purpose consent, delivery/outbox and country tests |
| Sentry | DSN convention and readiness inventory only; no SDK or private telemetry enabled | Project/SDK setup, event scrubbers, sampling and approved health method. DSN alone cannot prove authenticated account readiness |
| Google Calendar | Optional phase-2 boundary only | Professional OAuth scopes/consent, revocation, timezone/conflict and deduplicated synchronization implementation |

Model names, endpoints and provider payloads are **adapter contract candidates tested against doubles**, not remotely verified provider documentation or accounts. Required domains and secure credentials must be configured through supported deployment/environment settings; no proxy or TLS bypass is used. The adapters remain replaceable internal modules and are not mounted public endpoints.

Run `UV_CACHE_DIR=/tmp/glam-ui-uv-cache uv run python scripts/integration_readiness.py` for a safe configuration snapshot. It makes no network calls and prints no credential values. Health methods are explicit operator calls; builds and tests need no live keys. Supabase/production data and live payment activation stay disabled regardless of a health result.
