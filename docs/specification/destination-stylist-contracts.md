# Destination Stylist: proposed contracts and fallback rules

**6 November update:** Destination UI and provider preparation are now authorized by the user and implemented as a session planner/packing checklist plus typed evidence boundary; [current scope](ux-completion-and-integrations.md) and [regression](../ux-regression-report.md). Actual weather, geocoding, AI travel recommendations and canonical persistence remain unconnected. Earlier module-approval wait below is historical; proposed API routes are still not implemented.

5 November 2026, Africa/Johannesburg. Source: [Destination & Weather-Aware Personal Stylist](sources/2026-11-destination-stylist-directive.txt). **Design/contract candidate pending the feature-freeze and five-golden-screen review; no new destination module, weather integration or live forecast is implemented.** It belongs inside Personal Stylist/Studio/Get This Look, with no new primary tab and no new identity/catalog/ledger.

## Proposed visual flow

A compact destination search over an original/rights-cleared destination photograph → confirmed location/date/activity chips → swipeable daily outfit boards → a packing sheet → Studio for permitted preview → Get This Look with buy-before-departure versus destination sourcing. Cultural/coverage/fit preferences are voluntary controls; destination photography is not proof of weather. A destination view should be an editorial travel styling board, not a spreadsheet or separate generic chatbot. Reference photos, concepts, forecast evidence and merchant offers must have visibly different meanings.

## Contracts (not live endpoints)

| Proposed operation | Bounded request / result | Permission and failure |
|---|---|---|
| `POST /v1/destinations/resolve` | Query + optional selected country/language; candidate IDs, city/country/region, precision, latitude/longitude for weather-grid resolution, IANA timezone, source/retrieved time and ambiguity | Eligible owner; require confirmation for ambiguous beach/landmark/resort/city. No resolved timezone or unreliable geocoder means needs-confirmation, not a guessed destination. Persist minimum city/grid precision, not unnecessary hotel coordinates |
| `POST /v1/travel-plans` | Owner-confirmed destination/version, local start/end dates, departure/arrival and needed-by timezones, multiple activities/daily occasions, optional sizes, style/coverage/fabric preferences, budget/currency and sourcing mode | Owner-only versioned/idempotent plan; validate date order and DST/local-day boundaries. No inference of religion or protected identity; no private context in ads |
| `POST /v1/travel-plans/{id}/weather` | Confirmed destination/date revision; per-day evidence with status `forecast`, `seasonal_estimate`, `unavailable` or `stale`; provider/model/version, valid interval/zone, fetched/expires time, uncertainties, units and temperature/apparent temperature/wind/humidity/rain/UV where actually supported | Qualified licensed provider only; no adapter returns unavailable. Unknown metrics remain null; no invented UV/humidity. Provider failure preserves a labeled last-known snapshot only while policy permits, never as a fresh forecast |
| `POST /v1/travel-plans/{id}/styling-requests` | Confirmed plan/weather evidence revisions, existing approved analysis references only by consent; daily look components, practical protection notes, multiple style/budget directions, unsupported/uncertain parts and packing requirements | Owner-scoped qualified generation, quote/cost/cancel rules inherited. Safety/thermal protection precedes aesthetics for outdoors. Model suggestions are concepts, not protective-equipment certification or guaranteed safety |
| `POST /v1/travel-plans/{id}/requirements` | User-confirmed component/size/variant, activity/weather source, shopping vs destination market, sourcing mode and verified delivery/arrival deadline; canonical requirement IDs | Existing matching engine remains authority. Extend contracts only after approval; no client calculation converts plan text into verified inventory or a promised delivery date |
| `PATCH /v1/travel-plans/{id}/packing` | User-approved items/quantities/owned status/day/activity refs and checked state, expected plan revision | Owner-only; changing one activity/look preserves unrelated packed/owned items. Conflict surfaces a revision choice instead of silently overwriting |
| `POST /v1/travel-plans/{id}/weather-alert-consent` (Phase 2) | Explicit channels, material-change thresholds, quiet hours/timezone, permission version and revocation | No implicit subscription. Notify only with fresh actual evidence, deduped event/version and approved user purpose; revoked consent or stale forecast suppresses delivery |

The entities are proposed owner-scoped TravelPlan/Day/Activity, ConfirmedDestination, WeatherEvidenceSnapshot, DailyLookRequirement, PackingEntry and optional AlertSubscription. They reference canonical users/consents/look/catalog requirements and outbox, not duplicate users or a second catalog. Additive canonical migrations/APIs would follow approval. No SQL schema or generated OpenAPI is changed by this specification.

## Weather selection algorithm

1. Confirm destination and IANA timezone, convert travel days into correct local intervals, and preserve user-selected dates; device timezone or current location is not the travel destination.
2. Consult a **qualified adapter's declared horizon, geography, supported metrics, freshness and license**. The source mentions Open-Meteo and a possible 16-day horizon; that is an evaluation candidate, not a verified current commercial entitlement or a hardcoded guarantee.
3. Within that horizon, use current evidence only for covered days/metrics; expose fetched/valid/expires time and uncertainty. Partial coverage can have different per-day statuses.
4. Beyond it, use seasonal historical evidence **only if a qualified licensed dataset actually exists** for the destination/local period. Label “Seasonal estimate — not a forecast”, include baseline years/source/uncertainty and schedule refresh into the forecast horizon. Do not fabricate seasonal data from a city name or model memory.
5. Without forecast or historical evidence, show unavailable. An outage/expired snapshot is not permission to relabel old forecast data as seasonal evidence. No data is a valid result.
6. Do not promise weather safety, merchant ETA, fit, SPF performance or suitability of protective gear from an image. Offer qualified guidance/uncertainty and prioritize real physical/activity constraints.

## Matching and commerce rules

Inherit all canonical age/market/source rights, approved revision/identifier, stock, country/currency, required-tag and known-cost rules. Additional proposed gates: confirmed size/variant, actual service/delivery coverage and dates in the relevant IANA zone, verified earliest/latest ETA or production/fitting feasibility, activity/functional compatibility and total delivered cost. Unknown ETA/cost cannot satisfy a hard departure deadline/budget. A near seller is not preferable if it cannot fulfill; an eligible farther seller may be better. Sponsorship never bypasses a hard constraint or changes organic analysis.

- **Before departure:** fulfill to the user-selected shopping/delivery location before the confirmed departure/needed-by cutoff; do not silently switch to the travel destination.
- **At destination:** require actual local service/delivery coverage and arrival/event timing. A traveler can choose a destination different from device/IP location; no precise location permission is mandatory.
- **Cross-border:** actual currency/tax/shipping/returns/fees and optional qualified FX evidence are required; changing a currency preference is not conversion. External referral commission needs a contracted attribution/settlement arrangement.
- **Buy/book/tailor:** merchandise uses the central completed eligible item-sale 10% policy. A professional/tailor request needs actual feasibility/full-price/slot confirmation; service commission remains separately unset. No preview confirms manufacturing or a booking.

## Acceptance vectors (planned, not executed integration tests)

| Case | Expected evidence / result |
|---|---|
| Multiple cities/beaches share a name | User-confirmed candidate and timezone before weather or local offer lookup |
| DST change, overnight departure, date-line crossing | Correct local-day weather windows and explicit shopping/destination delivery cutoff; no device-zone substitution |
| Some trip days inside adapter horizon, others outside | Forecast for supported fresh days; licensed seasonal estimate for eligible later days; unavailable where neither exists |
| Historical provider absent or outage | No invented seasonal estimate; unavailable/stale with honest date/source, no pretend refreshed forecast |
| Missing humidity/UV/wind from provider | Null/unsupported metric, never a fabricated number or sunscreen/protection claim |
| Johannesburg resident shopping for a Miami trip | Explicit before-departure Johannesburg versus Miami arrival coverage/currency/ETA; manual choice wins over IP/device |
| Cheapest item misses deadline; nearest seller out of stock | Excluded from hard requirement results despite bid/price/proximity; optional clearly labeled alternatives need user's constraint change |
| Quote has unknown shipping/tax/FX or production time | No full-cost/deadline guarantee or automatic budget acceptance; ask for evidence/quote |
| Changes hairstyle, activity or one packed item | Other look components, unrelated days and checked ownership remain intact, with impacted weather/sourcing revalidated |
| Religious/cultural preference or private analysis selected | Owner-controlled styling only; no inference from photo, advertiser attribute, private merchant disclosure or event analytics leak |
| Alert permission denied/revoked; forecast unchanged/stale | No notification. Fresh materially changed evidence produces one deduped event only after qualification |
| Actual end-to-end proposal | Real weather + qualified personal generation + measured eligible supply + delivered-cost/deadline validation + consented packing/alerts, before claiming completion |

Provider documentation/licensing, geocoder accuracy, weather quality/refresh, real merchant coverage/ETAs, personal try-on fidelity, alert operations and native-device behavior remain open gates. The Cape Town/Miami/Iceland examples are illustrative seasonal styling ideas, not verified current forecasts or official travel/safety guidance.
