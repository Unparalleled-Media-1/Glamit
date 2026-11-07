# UX regression and acceptance report

6 November 2026, Africa/Johannesburg. Branch `feat/personalized-results-journey`. **Visual preservation passes locally. Live end-to-end and native-device acceptance are BLOCKED.** No final approval is requested.

## Review evidence

- [Six-pattern phone board](application-preview/golden-iphone-review.html) / [PNG](application-preview/golden-iphone-review.png).
- [Six-pattern desktop board](application-preview/golden-desktop-review.html) / [PNG](application-preview/golden-desktop-review.png).
- [Personalized Results, phone](application-preview/golden/iphone-results.png) and [desktop](application-preview/golden/desktop-results.png). These are actual unavailable-state screens, not fabricated personalized estimates.
- [18 actual interaction recordings](application-preview/recordings/index.html) and [platform manifest](application-preview/recordings/manifest.json): six patterns × desktop/iOS-sized/Android-sized Chromium views. **The mobile clips are browser emulation, not iOS/Android native recordings or Safari verification.**
- [Approved-pattern pixel report](application-preview/golden/approved-regression.json): 20 captures across four viewports, zero changed pixels against the five approved patterns in this local browser environment.
- [Protected source hashes](application-preview/protected-source-regression.json): 29 existing source files unchanged, including canonical migrations, existing API/auth/financial code, original visual CSS and color tokens. New integration modules are additive and unmounted. No production database connection or data mutation occurred.
- [Service-readiness report](service-integration-readiness.md) / [configuration snapshot](application-preview/service-readiness.json).

## Automated regression evidence

| Check | Actual local result | Limit |
|---|---|---|
| Required backend suite | 124 tests passed against dedicated local `glam_test`; includes 20 provider-double cases. Ruff checks/format, unchanged implemented OpenAPI and client runtime checks passed | No external provider, new order ledger or live payment/booking tested. One existing Starlette test-client deprecation warning |
| Shared client behavior | 13 tests passed: private owner/photo/correction/direction binding, expired preview rejection, explicit uncertainty, valid travel days/timezones/weather, variant and server quote validation, preserved independent look components | Typed contracts are not activated services |
| Actual web journeys | 13 groups passed: consent/photo selection, original preservation, routines, event context, corrections/unavailable Results, trip checklist continuity, shop detail, workspace denials, merchant session drafts, organic/sponsored empties and checkout/order gates | AI processing and commerce remain unavailable |
| Isolated connected-contract browser test | Explicit test-only doubles exercise wrong-owner rejection, true in-flight request states, stale preview discard, correction delivery to preview, organic/Sponsored separation, revalidated variant, session cart, server quote, pending vs paid receipt and photo deletion. Quote destination contains only city/country/currency | Test fixture original/image and fake merchant/payment responses are never shipped or called live evidence |
| Golden screenshot capture | 28 captures: six patterns + separate uncomputed report × 390×844, 412×915, 768×1024 and 1440×1050 | Sixth pattern is a review candidate; human usability/accessibility approval remains open |
| Approved visual comparison | 20/20 captures pass; zero changed pixels for Home, Face Analysis, Studio, Shop and Product Detail | Results and intentional additional workflow states are excluded from the old approved baseline; browser/font/platform differences require separate review |
| Responsive web/accessibility basics | Existing 320–1920px overflow, fixed navigation, first-fold actions, footer clearance, named controls, Results portrait body-text contrast, focus restoration, keyboard cancellation, reduced motion and no-external-request checks passed | Not an assistive-technology audit or physical safe-area/keyboard test |
| Web/native/preview TypeScript and web production build | Passed without provider credentials | Compilation does not prove provider operation |
| Expo iOS/Android Hermes exports | Both passed; Android resize keyboard mode configured and native measured safe-area navigation preserved | No Apple/Android runtime or attached device exists here. Native videos, camera, keyboard, scrolling and VoiceOver/TalkBack remain unverified |
| Static interactive export | Fourteen journeys with repository-prefixed assets/routes and explicit missing-service states | Workspace/static preview, not a production deployment |

## Required live journey: step-by-step status

| Step | Delivered / observed | Acceptance |
|---|---|---|
| Upload photo | Consent-gated local selection and native picker/cache code. No authenticated private upload pipeline is connected | Local selection PASS; server upload BLOCKED |
| Receive analysis | Sixth result renderer, provider schema/adapter, uncertainty and correction handling; absent-provider state visible | Real user-specific result BLOCKED by credentials/model/privacy/G0/storage |
| Explore looks | Editorial choices, independent Look Builder, and typed provider direction handoff | Local interaction PASS; personal AI recommendation quality BLOCKED |
| Virtual try-on | Explicit processing permission, revision/owner-bound response, approved-origin/expiry checks and comparator/toggle | Real generation/fidelity BLOCKED by qualified provider + media orchestration |
| Find local products/professionals | Explicit location/category/tags, matching adapter interface, separated organic/Sponsored, revalidation and service-feasibility route | Live supply, local accuracy, actual professional availability and sponsored serving BLOCKED |
| Add to cart | Only revalidated variants can enter session cart; editorial studies cannot | Double-tested contract PASS; real offer evidence BLOCKED |
| Checkout | Full server quote/expiry/variant validation and approved hosted URL handoff; no client financial calculation | Live processing BLOCKED by entity/country, merchant onboarding, settlement/refund/webhooks and activation gates |
| Order confirmation | Pending/failed/cancelled vs paid views require an owner/quote-bound order-service response; opening the route never confirms payment | Double-tested contract PASS; actual webhook-backed order BLOCKED |

## Remaining functional and usability gates

No real analysis, weather, product-matching accuracy, try-on quality, payment success, booking completion or human task-completion score has been measured. The selected providers have no verified authenticated health checks in this environment. Future orchestration must recheck existing identity/consent, private storage, age/market, vendor retention/deletion, signed media rights, model/entitlement and spend before any private call. Do not mount the internal adapters as unauthenticated routes or expose server keys.

Supabase stays disconnected until branch consolidation, functional audit and G0 approval. Existing 10% eligible item-sale commission logic remains unchanged; no service rate or new ledger is invented. Stripe/Peach require the actual operating legal entity/country and marketplace settlement/refund/compliance validation before activation. Remaining GLAM-owned booking/order persistence requires separate schema/financial approval.

Physical iOS/Android screen recordings and usability/accessibility validation require actual runtimes/devices. Desktop/mobile-browser recordings are supplied as useful partial evidence and are not mislabeled substitutes. The five approved visual patterns remain approved direction; the sixth and the full product remain subject to the requested functional/usability acceptance.
