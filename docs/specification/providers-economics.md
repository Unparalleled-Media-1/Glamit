# AI provider evaluation and operating cost model

Prepared 3 November 2026. No provider has been tested or selected. Rates in the numerical model are hypothetical USD planning inputs, not verified vendor prices. Official discovery links below are starting points; current capability, commercial rights, regional availability, model versions, pricing and privacy terms need direct verification in Phase 0. Do not procure or claim an integration complete from this shortlist.

## Capability-specific shortlist

| Capability | Candidates to investigate | Qualification questions |
|---|---|---|
| Facial landmarks / guided capture | On-device MediaPipe Face Landmarker; licensed specialist CV components | Is cosmetic use supported on target devices? Performance across darker skin/lighting? License and redistribution terms? Can processing remain local with no identity template? |
| Color analysis | Controlled capture + calibrated color pipeline; qualified custom analysis model | Illumination/white-balance correction, confidence and abstention, repeatability across devices; no credible universal color result from uncontrolled selfies |
| Makeup / hair virtual try-on | Perfect Corp / YouCam business products, ModiFace, Banuba | Actual SDK/API availability, African hair families and skin tones, fidelity, commercial license, Expo native integration effort, device support, server versus on-device processing, minimum contract and retention terms |
| General image editing | OpenAI image APIs, Google Vertex AI image products; model-specific offerings through other managed hosts | Identity preservation, edit masks, skin-tone fidelity, provider usage restrictions, regional processing, accepted input sources, output safety, no-training/deletion and billable retry behavior |
| Fashion virtual try-on | FASHN and qualified commercial garment try-on APIs; Google offerings where available for the actual use case | Garment detail/body fidelity, regional/size diversity, commercial API access, single-/multi-garment support, consent policies, per-result cost and failure semantics |
| Self-hosted models later | Properly licensed CV/try-on/hair-edit models after legal review | Research licenses may prohibit commercial use; training data/weights rights, GPU utilization, model safety, patching and ongoing evaluation cost |

Discovery references: [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker), [Perfect Corp](https://www.perfectcorp.com/business), [ModiFace](https://modiface.com/), [Banuba](https://www.banuba.com/), [OpenAI API pricing](https://openai.com/api/pricing/), [Vertex AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing), [FASHN](https://fashn.ai/). These links are not citations for measured performance or prices in this package.

Use specialist rendering where measured quality justifies cost, and an independent analysis pipeline for measurable cosmetic attributes. A general image model's visual plausibility is insufficient evidence of shade accuracy, exact hairstyle feasibility or garment fit. Defer self-hosted GPU commitments until managed-provider cost and volume are measured; on-device inference can reduce image transfers but still needs device, license and quality validation.

## Evaluation scorecard and experiment

Hard disqualifiers: prohibited commercial use; unacceptable customer training/data reuse; inability to meet deletion/cross-border terms; no usable secure integration; critical subgroup failures; no permissible mechanism for facial editing; missing incident/subprocessor commitments. No weighted score can override these gates.

For eligible providers, score blinded results on a documented 1–5 scale: appearance/identity fidelity 25%, African hair/skin-tone quality and coverage 25%, safety/privacy/operability beyond minimum gate 15%, all-in successful-result cost 15%, latency/reliability 10%, integration/version-control/portability 10%. Publish confidence intervals and rater agreement, not only an average score. Test model versions separately and select per capability rather than naming one universal winner.

Phase 0 uses consented/licensed assets with adequate coverage of natural hair, cornrows, braids, locs, wigs and protective styles; darkest-to-lightest skin-tone ranges, textured hair variation, lighting/device differences, occlusions and gender presentation. Participation categories are voluntary and purpose-limited; do not derive ethnicity. Use identical prompts/reference conditions and held-out cases. Measure severe artifacts, hue drift, preserved likeness, style detail, garment pattern integrity, body alteration, refusal, safety escape, timeout rate, throughput and actual invoiced cost. Proposed product gates are in `product-delivery.md`.

Proposed initial evaluation envelope: three candidate adapters × 300 outputs × $0.25 assumed/output = $225 inference; allow $1,000–$3,000 total inference spend for retries/quality tiers and expanded sampling. Dataset licensing, recruitment and professional raters are additional and may dominate. No live trial or spend is authorized by this document. Vendor minimum contracts can exceed the entire modelling envelope.

## Reproducible usage model

Monthly usage assumptions: each MAU averages 0.4 successful analyses and 0.8 successful makeup/hair renders; equivalently, 20% of MAU generates four renders/month. Fashion, video, real-time AR SDK licenses and self-hosted GPUs are excluded from this launch model. Later fashion demand adds `successful_fashion_results × effective_fashion_cost`; use a hypothetical $0.25–$1.50 per attempt only for sensitivity until quoted. Cap free usage at a server-enforced approved monthly budget.

Let `A = MAU × 0.4`, `G = MAU × 0.8`. `F` is measured billable attempts per successful result, incorporating provider failures, retries and discarded output. Let `pa`, `pg`, `pm` be analysis, generation and per-attempt safety-processing costs. Then:

`AI_cost = F × (A × pa + G × pg + (A + G) × pm)`

This estimates paid requests needed to achieve successful targets; billable requests that never yield a success must be included in measured `F`. Moderation is simplified to one unit per attempt; adjust for input/output counts and vendor minimums. Include any additional analysis tokens, masks, upscales and reference-image charges in measured `pa`/`pg`.

| Planning input | Base scenario | High scenario |
|---|---:|---:|
| Analysis attempt `pa` | $0.015 | $0.030 |
| Render attempt `pg` | $0.120 | $0.400 |
| Safety/validation attempt `pm` | $0.002 | $0.004 |
| Billable attempts per success `F` | 1.15 | 1.25 |
| Effective analysis cost `F × (pa+pm)` | $0.01955 | $0.04250 |
| Effective render cost `F × (pg+pm)` | $0.14030 | $0.50500 |

| Monthly measure | Pilot | Initial growth | Larger growth |
|---|---:|---:|---:|
| MAU | 1,000 | 10,000 | 100,000 |
| Successful analyses | 400 | 4,000 | 40,000 |
| Successful renders | 800 | 8,000 | 80,000 |
| Base AI cost | $120.06 | $1,200.60 | $12,006.00 |
| High AI cost | $421.00 | $4,210.00 | $42,100.00 |

## Infrastructure planning allowance

USD/month indicative capacity allowances, not a cloud quote. They assume a managed single-region multi-zone production design, small nonproduction environment and no self-hosted inference GPUs. Phase 0 must map this budget to real SKUs and capacity tests; the pilot allowance may need to increase to meet availability targets in the selected region.

| Cost bucket | 1k MAU | 10k MAU | 100k MAU |
|---|---:|---:|---:|
| API + Next.js compute | 100 | 300 | 1,500 |
| CPU/media/async workers | 100 | 400 | 2,500 |
| Managed PostgreSQL | 200 | 500 | 2,500 |
| Durable queue + Redis | 75 | 150 | 700 |
| Private/public storage and request charges | 60 | 180 | 1,200 |
| Bandwidth / edge delivery | 50 | 200 | 2,000 |
| Logs, metrics, tracing, alerts | 100 | 250 | 1,500 |
| Backups, secrets, security services | 100 | 200 | 900 |
| Staging / CI incremental allowance | 125 | 300 | 1,200 |
| Infrastructure subtotal | **910** | **2,480** | **14,000** |
| Infrastructure + base AI | 1,030.06 | 3,680.60 | 26,006.00 |
| With 20% contingency | **1,236.07** | **4,416.72** | **31,207.20** |
| Infrastructure + high AI, with 20% contingency | **1,597.20** | **8,028.00** | **67,320.00** |

Storage sizing must use retention, not accumulate all images indefinitely. Example 10k MAU flow: `(4,000+8,000) × 2 MB × 1/30` ≈ 800 MB average short-lived captures, plus `8,000 × 2 MB × 7/30` ≈ 3.73 GB average unsaved outputs, before saved looks, variants, replicas, backups and public catalog media. This simplified example assumes one capture/output each; multi-image edits and retries increase transfers. Public product media, telemetry, minimum service charges and outbound bandwidth can outweigh short-lived facial-image storage. Budget from measured distributions, not this average alone.

Excluded from totals: engineering/payroll, professional evaluation, licensing/SDK/vendor minimums, payment/app-store fees, tax/VAT, refunds/chargebacks/fraud losses, merchant/creator payouts, SMS/email at scale, maps/search or catalog licensing, legal/compliance, support and human moderation, penetration testing, data export fees and FX. Payment/app-store fees are variable commercial costs and must be modelled before pricing is approved. Display-currency/ZAR conversions require a dated FX assumption and tax basis; no exchange rate is asserted here.

## Subscription and marketplace economics

No launch prices are approved. First calibrate credits to measured feature cost and channel net receipts. Do not promise a universal cash value per credit. For plan price `P` inclusive of sales tax `t`, assumed platform/store fee fraction `s` applied to tax-exclusive value, fixed processing cost `f`, AI cost `C`, and attributable variable support/refund cost `v`:

`net_receipts = P / (1+t) × (1-s) - f`

`contribution = net_receipts - C - v`

Actual store/PSP fee and tax calculation order must replace this simplifying assumption. Target margin must also fund allocated infrastructure and overhead; positive contribution alone is not profitability.

Illustration only: P=$9.99, t=15%, s=15%, f=$0, v=$0.50 gives net receipts ≈$7.38. Ten renders plus four analyses cost ≈$1.48 under the base scenario, giving ≈$5.40 contribution, about 73% of net receipts before fixed infrastructure. In the high scenario those same entitlements cost $5.22, leaving ≈$1.66, about 22%. At an illustrative 30% fee, high-case contribution falls to roughly $0.36. This sensitivity is why quotas, quality-tier costs and channel-specific economics must precede pricing. These tax/fee assumptions are not claims about any actual store contract.

Example entitlement mapping for analysis: 1 credit; standard render: 8 credits; premium/fashion: separate quoted tiers after qualification. With base effective costs, eight analysis credits cost $0.1564 versus an eight-credit render at $0.1403; this is only an illustrative alignment. A subscription must specify actual included credits/expiry and supported tiers. Free quotas need anti-abuse limits and a global kill switch; credits may not be issued just because the client claims a subscription.

Marketplace platform contribution per order is `platform commission + disclosed service fees - PSP/platform-borne processing - creator commission funded by platform - refunds/fraud/support - platform-borne tax`. Product GMV, seller payables, collected VAT and advertiser budgets are not platform revenue. Define whether merchant or platform funds creator commissions. Example $50 tax-exclusive goods subtotal at a hypothetical 12% platform take yields $6 gross commission; subtract illustrative $1.75 processing, $1.50 creator commission and $0.75 support/loss allowance leaves $2 before tax/fixed costs. Contracts and actual payment fees must validate those numbers.

Ad contribution is `recognized valid advertising spend - delivery/measurement costs - credits/refunds - sales/support/fraud cost`; unspent prepaid budget is a liability, not earned revenue. Keep ad funds, customer credits and seller payables segregated in accounting.

## Cost controls and decisions

The user subsequently selected Supabase PostgreSQL and Google through Supabase Auth, with connection deferred. The database/auth allowances above are not Supabase plan quotations; reprice project region, connection limits, auth MAU/MFA, backup/PITR and network costs against the selected plan before procurement. No Supabase Storage or AI provider choice is implied. [ADR 015](../adr-015-supabase-google-capture.md) records this selection.

[Complete the Look economics](look-delivery-economics.md) adds decomposition, matching, catalog processing, sponsored commerce and incremental capacity scenarios. It separates GMV from platform revenue and CPC, affiliate, marketplace and sponsored-collection income. Add only genuinely incremental resources; shared capacity and base generation cannot be counted twice. These remain planning inputs, not vendor quotes.

Require a server-side feature price registry, per-account quotas, provider spend caps, concurrency limits, quote expiry and anomaly alerts. Report cost per accepted result and failed attempt, not just cost per API call. Record vendor model changes and rerun quality/cost benchmarks. Finance approves pricing changes; existing accepted quotes retain their price through expiry. Initial safety envelope proposes a hard daily provider budget and per-country feature switches, with final amounts approved in Phase 0.

Decide: vendor commitments and trial budgets, target gross contribution, free quota, billing channels, price localization, credit expiry/refund policy, provider quality tiers, hosting region and maximum monthly burn. Replace this model with dated vendor quotations and a measured pilot invoice before any commercial readiness declaration.
