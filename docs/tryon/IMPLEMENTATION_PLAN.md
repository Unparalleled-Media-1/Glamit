# Real photo try-on — scoped implementation plan

Status: **PLAN ONLY. Nothing here is built, applied, purchased or tested.** No provider has been called, no key exists in this session, no authorized test photos exist, no migration is applied, and no legal review has happened. Evidence below is labelled by how strong it is; none of it replaces the real tests in §4.

Date prepared: 2026-11-18. Owner direction recorded: the nine decisions in "GLAM BEAUTY — EVENT STYLING AND REAL PHOTO TRY-ON". The event work stays in PR #78 (separate); this plan adds no code.

## 0. What the owner decided, and how it is interpreted

| # | Decision | How this plan applies it |
|---|---|---|
| 1 | Evaluate production-ready try-on providers on full-body identity preservation, garment fidelity, skin-tone accuracy, body diversity, African fashion, fabric realism; recommend primary + fallback from real tests, pricing and licence evidence | §3 candidates and evidence, §4 test protocol, gate **G1** (no provider is chosen before it passes) |
| 2 | Configurable server-side costs and **GLAM AI credit pricing that is independent of the provider** ("Stay-independent" in the brief read as *provider-independent*; **please confirm** — if "Stripe-independent" or something else was meant, §6 changes) | §6: versioned price rules, cost ledger, margin reporting; no unapproved number hardcoded |
| 3 | Separate explicit consent, AI-generated disclosure, retention and deletion controls, privacy/legal gate before production | §7, gate **G2** |
| 4 | Full-body first; face-and-torso where appropriate; always the user's chosen photo, never an avatar | §5 scopes; the source image is always a `private_media` row owned by the requester |
| 5 | Keep all six themed events; distinguish design sample events from verified real events | §9 (`source`/`verified` on every event; the six stay labelled *sample* until an organiser/provider verifies them) |
| 6 | Build toward verified merchants, inventory, prices, purchase links, professional booking; maps search is interim only | §9 phases P4–P5 |
| 7 | Backend-first: private storage, authenticated jobs, provider adapters, metering, consent records, reliable failure handling; reuse existing infrastructure | §5, §8 |
| 8 | No simulated result presented as genuine; real generation tests with authorized photos; Android and iOS verified separately | §4, §10 |
| 9 | Separate scoped plan incl. provider comparisons, contracts, costs, privacy, acceptance tests, dependencies | this document and its two CSV companions |

## 1. The target experience and its honest status today

`Select an event → styling recommendations → see the outfit on your own photograph → find the actual clothing and accessories → book makeup/hair → purchase or reserve`

| Step | Today | Needs |
|---|---|---|
| Select an event (six themed events + add your own) | **Built in PR #78** (native, local); the six events are design *sample content*, labelled | Verified event source (§9) |
| Styling recommendations | **Built in PR #78**: rule-based directions, host dress code, etiquette; labelled not-AI | Optional later: server stylist advice (`/v1/ai/stylist/advice` exists) |
| See it on **your** photograph | **Not built.** App shows "Not available yet" and no image | Everything in this plan |
| Find the actual clothing | Guidance + a user-started maps search only | Verified merchants, inventory, price, purchase links |
| Book makeup/hair | Guidance + user-started maps search only | Professional directory + availability + booking |
| Purchase or reserve | Not built | Checkout/reservation (existing payment work is gated: `AGENTS.md` Stripe sandbox rules) |

The full experience is **not complete** until every row is genuinely functional.

## 2. What already exists in the repo (reuse, do not rebuild)

Evidence: files read in this session (`services/api/src/glam_api/…`).

| Need | Existing piece | Reuse notes |
|---|---|---|
| Private photo storage | `private_media.py`: `POST /v1/media` (intent) → content upload → normalised **PNG**, private bucket, owner checks, retention via reviewed config (`reviewed_media_retention_configuration_required` is raised when absent), purpose `private_photo_storage`, adult-eligibility check | Source image = an existing `private_media` row. Needs a full-body constraint profile (aspect, min height, ≤10 MB cap already) |
| Consent | `policy_document(purpose, version, approved_at)` + `consent_event`; purposes `private_photo_storage`, `cosmetic_photo_analysis`; withdrawal emits outbox `privacy.consent_withdrawn.v1`; `worker.py` deletes dependent data under the same user lock | Add purpose **`ai_look_generation`**; extend the withdrawal worker to delete generation jobs/results |
| Authenticated jobs | `analysis_jobs.py`: durable attempt written **before** any external call; `SKIP LOCKED` claiming; live re-check of consent/eligibility/retention at dispatch; **ambiguous/crashed attempts are never re-dispatched** (marked failed) | Copy this discipline: a billable image call must never be silently repeated |
| Credits | `credits.py`: sealed, balanced journals; buckets `available/held/consumed/issuance`; `reserve(key, units, expires)` / `finish(capture|release)` with idempotency keys; negative balances impossible (DB trigger) | Hold on submit → capture on success → release on failure = refund |
| Provider adapters | `integrations/providers.py`: `OpenAI` (analysis), **`Fashn`** (`/v1/run`, `model_name` from config, consent guard, `private_image()` only accepts URLs on allow-listed private origins), **`Replicate`** (pinned 64-hex workflow only), readiness probes | Add a provider-neutral `TryOnProvider` interface; keep the consent guard and private-origin rule |
| Verified catalog | `catalog.py`, `catalog_jobs.py`: organization listings, revisions, admin review queue, bulk publish | Source of "verified" garments for try-on and for "where to buy" |
| Privacy cleanup | `media_cleanup.py`, outbox events | Add result-image expiry/deletion |
| Native private-media client | `lib/analysis/*` (Flutter): upload, consent, polling, history, private PNG fetch, lock-on-background | Extend, don't fork: same session, transport and vault |

Gaps that need new work: try-on job + result tables, consent purpose + policy text, provider adapter for the chosen primary/fallback, cost/price tables, moderation, labelling, garment sourcing contract, native screens (FB-01…05, GL-047…050 equivalents), and the commerce/booking backends.

## 3. Provider candidates and evidence

**Verification status key — P:** read from the provider's own primary page. **S:** secondary (search summary, reseller or competitor blog). **U:** unverified. **No row below is P**: this session could not reach `fashn.ai`, `docs.fashn.ai` or `docs.cloud.google.com` (outside the session's allowed network domains). Those hosts must be allowed before provider claims are checked against primary sources.

### 3.1 Candidates

| Candidate | What is known (evidence) | Risks / unknowns |
|---|---|---|
| **FASHN** (try-on v1.5/1.6, "Max") | Already has an adapter in the repo (`Fashn`). Secondary sources: dedicated try-on API; on-demand price **$0.075/credit**, try-on **1 credit**/output, "Try-On Max" **4 credits (~$0.30)**, $7.50 minimum purchase (S: FASHN blog via search; resellers list higher, e.g. $0.1072 for v1.6). FASHN states its own VTON v1.5 is Apache-2.0 (S: competitor/own blog) — would make a self-hosted route possible | Full-body support, identity preservation, skin-tone behaviour, data retention/training use, region, DPA: **U**. Self-hosting needs GPUs and ops |
| **Google Vertex AI Virtual Try-On** (`virtual-try-on-001`, GA; replaced `virtual-try-on-preview-08-04`) | S: GA; one person image + one garment image per call; **$0.06/image** in Google's price table per one search summary, resellers $0.063–$0.075; preview doc listed 50 requests/min/project quota and "person generation: not supported" (that is generating people, not editing a supplied photo). Google developer-forum posts report **face distortion and wrong sleeve rendering** and **429 errors** (user reports, not official) | Full-body vs torso framing, multi-garment outfits (one garment per call suggests composing calls), SynthID/watermark behaviour, region/data residency, retention/training terms: **U**. Needs new adapter (none exists) |
| **Kling / Kolors Virtual Try-On** (Kling developer API; also via fal.ai) | S: listed at **$0.07**/generation on Kling's developer page and on fal.ai per search summaries; prepaid-unit packages; one aggregator shows $0.007 (almost certainly a different unit/error — ignore) | Jurisdiction/data-transfer implications of a China-based provider for biometric-like photos under POPIA/GDPR (**needs legal view**), retention terms, full-body: **U** |
| **OpenAI image editing** (general model, not a dedicated try-on) | The repo already integrates OpenAI for analysis (key/model config exist). General image-edit models can be prompted to change clothing | Not purpose-built; identity drift and garment fidelity are the usual failure modes; needs garment-reference support check; **U**. Useful as a *control* in the bake-off |
| **Open-source IDM-VTON, CatVTON, OOTDiffusion** | S: **CC BY-NC-SA 4.0 / non-commercial** (IDM-VTON repo; OOTDiffusion per Hugging Face discussion; CatVTON per competitor blog, not confirmed on its repo). Hosted copies on Replicate/others do **not** change the model's licence | **Excluded for production** unless a written commercial licence is obtained. The repo's `Replicate` adapter must never be pointed at an NC-licensed workflow |
| Others surfaced (ModelsLab ~$0.02, PixelAPI ~$0.04, Replicate IDM-VTON ~$0.024/run) | S: reseller listings | Low price often = NC-licensed model; treat as untrusted until licence + terms are read |

### 3.2 Evidence that bears on the quality criteria

- **African garments and darker skin tones are a known weak spot.** *AfriVTON-Bench* (NeurIPS 2026 submission page; not peer-reviewed, small sample, mostly Monk ~7) reports that voluminous, non-fitted garments (agbada, boubou, dashiki) differ from the body-congruent clothing in standard benchmarks, and that darker-skin subjects (Monk 7–8) show measurable skin-tone shift in try-on outputs that garment-only metrics miss (S). VITON-HD and DressCode, the common benchmarks, skew to lighter skin and fitted Western garments (S). **Consequence:** vendor marketing and public benchmarks cannot select GLAM's provider; our own test set (§4) must.
- **Reliability.** The Google 429 and face-distortion threads are reminders to test failure rate and latency under load, not facts about current behaviour.

### 3.3 Pricing snapshot (illustrative, **S**, retrieved 2026-11-18)

| Provider | Price seen | Per success if 1.3 attempts/success (illustrative) |
|---|---|---|
| Google Vertex try-on | $0.06 (resellers $0.063–0.075) | ≈ $0.078 |
| FASHN try-on | $0.075 | ≈ $0.098 |
| Kling | $0.07 | ≈ $0.091 |
| FASHN Max | ~$0.30 | ≈ $0.39 |

The 1.3 attempts/success factor is a placeholder to show the arithmetic, **not a measurement**. Real numbers come from §6.

## 4. Provider bake-off protocol (gate G1)

**Preconditions (all outstanding):** provider sandbox accounts and keys; written confirmation of data-retention/training terms and processing region for each candidate; **authorized test subjects** (signed consent covering use in evaluation, storage period, deletion, and publication of aggregate results only); a secured evaluation bucket separate from production.

**Test subjects (proposal, owner to adjust).** ≥ 30 consenting adults covering Monk skin tone 1–10 with the dark end well represented; body shapes and sizes from XS to 4XL; hair textures and styles incl. locs, braids, afros, wigs, headwraps; people who wear modest or religious coverage *by choice*; full-body and torso framings; indoor/outdoor light; phone-camera quality; standing poses with arms away from/against the body.

**Garment set (proposal).** All-white linen/cotton co-ords and dresses (the flagship event case); evening gowns; suits; cocktail dresses; garden/race-day prints; hats and fascinators; **African and South African attire** (e.g. agbada, kaftan, dashiki, ankara and kente prints, boubou, shweshwe) supplied or approved by people from those communities, with attire styled as the owner's choice and never inferred; multi-piece outfits (top + bottom + outer layer) to test composition.

**Providers under test.** Each shortlisted candidate **plus** an OpenAI image-edit control. Same inputs, same crops, three seeds where supported.

**Metrics.**

| Metric | Method |
|---|---|
| Identity preservation | Face-embedding similarity to source (threshold set from same-person vs different-person calibration on our set) **and** blind human rating 1–5 ("is this recognisably the same person?") |
| Skin-tone fidelity | ΔE (CIELAB) of skin regions vs source after masking garments, reported by Monk bin; human rating |
| Garment fidelity | Pattern/colour ΔE vs garment photo, length/silhouette correctness, logo/text integrity, fabric plausibility (drape, transparency of white), human rating |
| Body preservation | Shape/height/proportions unchanged unless garment demands (human rating); no slimming/reshaping |
| Artefacts | Hands, feet, hair edges, background, extra limbs; counted per image |
| Reliability | Success rate, provider error codes, moderation false-rejects, P50/P95 latency, 429 behaviour at target concurrency |
| Cost | Billed cost per attempt and per **successful** image (invoice, not price page) |
| Compliance | Retention window, training-use opt-out, region, sub-processors, DPA, SynthID/C2PA/watermark behaviour, takedown/deletion API |

**Panel.** Blind, randomised, ≥ 3 raters per image incl. people of the represented groups; rubric written before testing. **Pass thresholds are an owner decision** (proposed starting point: ≥ 90% of images rated ≥ 4/5 on identity and garment, no Monk bin materially worse than the pooled score, and zero images that alter body shape or skin tone beyond ΔE tolerance chosen with the panel).

**Output of G1:** a signed evaluation report, a **primary and a fallback provider**, the licence/terms evidence for each, and the measured cost inputs for §6. If no provider passes, the feature stays "Not available yet".

## 5. Architecture (backend-first, reusing existing infrastructure)

### 5.1 Scopes

| Scope | Source photo | Garments | Use |
|---|---|---|---|
| `full_body` | full-body, standing, whole body in frame | tops/bottoms/one-pieces/outer, composed from one or more garment images | outfits (priority) |
| `torso` | head-to-hip | tops/outer | upper-body outfits |
| `face_hair_makeup` | face and shoulders | makeup, hair styling | makeup/hairstyle previews (different model class; may use another provider — to be evaluated separately) |

The scope is chosen by the client **and re-validated server-side** from the stored image (dimensions/aspect, optional pose check); a mismatch is rejected before any provider call.

### 5.2 Data model (proposal — candidate migrations, **not applied**; production DDL needs the existing explicit approvals)

- `policy_document.purpose = 'ai_look_generation'` (new versioned policy text).
- `tryon_job`: `id, owner_id, media_id (private_media), scope, outfit_brief jsonb, garment_refs jsonb, state (queued|running|completed|failed|cancelled|expired|rejected), provider, provider_model_version, attempt_id, attempted_at, provider_job_id, error_code, credit_reservation_id, price_rule_id, created_at, finished_at, expires_at`.
- `tryon_result`: `id, job_id, object_key, stored_sha256, width, height, ai_label_version, expires_at, deleted_at`.
- `generation_price_rule`: versioned, `effective_from`, `scope`, `provider`, `credit_units` (**configuration; values are an owner decision, nothing hardcoded**).
- `generation_cost_event`: `job_id, attempt_id, provider, billed_cost_micros, currency, outcome (success|provider_failure|moderation_reject|cancelled), refunded_units, recorded_at`.
- Views for reporting: cost per successful generation, failure/refund rate, margin per scope/provider/period.

### 5.3 API (proposal, mirrors `/v1/analysis/*`)

```
GET    /v1/tryon/policy                       consent text + version + whether granted
POST   /v1/tryon/consent                      grant ai_look_generation (policy id + version)
DELETE /v1/tryon/consent                      withdraw (triggers deletion via outbox)
GET    /v1/tryon/quote?scope=…                credit units from the active price rule (no side effects)
POST   /v1/tryon/jobs                         {media_id, scope, outfit_brief, garments[], Idempotency-Key} → 202 job
GET    /v1/tryon/jobs/{id}                    state, error_code, label metadata
GET    /v1/tryon/jobs/{id}/result             owner-checked private image (PNG/JPEG) with expiry
DELETE /v1/tryon/jobs/{id}                    cancel / delete result
GET    /v1/tryon/jobs                         history
```

Errors are stable codes (`consent_required`, `eligibility_required`, `insufficient_credits`, `scope_mismatch`, `garment_not_allowed`, `moderation_rejected`, `provider_unavailable`, `attempt_ambiguous`, …) that the Flutter `message()` map translates.

### 5.4 Job lifecycle and failure handling

1. **Submit:** validate ownership, live consent for `private_photo_storage` **and** `ai_look_generation`, adult eligibility, scope, garment rights; `credits.reserve(key=job_id, units=price_rule)`; insert job `queued`.
2. **Dispatch (worker, `SKIP LOCKED` per user):** re-check consent/eligibility/retention; write `running` + `attempt_id` **before** the provider call; pass the provider a signed URL on the allow-listed private origin (never public URLs, never raw bytes unless the provider requires it and the DPA allows).
3. **Complete:** fetch result, run output moderation, store privately, stamp label metadata, `credits.finish(capture=True)`, write `generation_cost_event`.
4. **Fail:** `credits.finish(capture=False)` (full release = refund), record cost event if the provider billed anyway.
5. **Ambiguous attempt (crash/timeout after dispatch):** never re-dispatched automatically (existing rule); marked failed `attempt_ambiguous`, credits released, user may start a new job explicitly. Provider-side status polling by `provider_job_id` is allowed to *recover* a result but never to create a second billed call.
6. **Fallback provider:** used only on a *definite* primary failure before any provider acceptance (e.g. validation or capacity error), recorded per attempt, and each attempt appears in the cost ledger. Never both.

### 5.5 Labelling and provenance

Every result is shown and stored as **"AI-generated preview"**: visible in-app badge, label version in the DB, embedded metadata/provenance (C2PA if the chosen provider/stack supports it; otherwise a minimal visible mark on exported/shared images), and the share sheet only exports the labelled image. The app never presents a result as a photograph or as a purchase guarantee ("fit and colour may differ from the real garment").

### 5.6 Safety and abuse controls

Own-photo attestation at upload + server checks (adult eligibility already exists); reject images with multiple people or with a face not matching the account's own analysis photo *if the owner opts into that check* (decision needed, privacy-sensitive); input and output moderation; no sensitive-attribute inference; per-user and global rate limits; log without image content or personal data.

### 5.7 Native app (Flutter, `apps/glam_mobile`)

Reuse `Session`/`Transport`/`DeviceVault`. New screens built to the design: full-body capture guidance (FB-01…FB-05), consent screen for generation (GL-024 pattern, distinct text), garment selection, job progress with cancel (GL-048 pattern), result with AI badge and before/after slider (GL-049/050), save/delete, and the event hand-offs (GL-063/GL-210 "See it on me" replaces the "Not available yet" card). Tokens are never persisted; photos/results are cleared on lock/background like the analysis flow; Android and iOS are verified separately (§10).

## 6. Pricing, credits and cost tracking (decision 2)

- **Server-side only.** Provider cost and customer price live in configuration tables (`generation_price_rule`, plus provider-cost config), never in the app or in code constants. The app asks `/v1/tryon/quote` and displays the result.
- **Metering.** Every provider attempt writes `generation_cost_event` (billed cost from invoices/webhooks reconciled monthly). Dashboards: cost per **successful** generation, failure rate, refunds, margin per scope/provider.
- **Price proposal process (after G1, not before):** credit price per scope = (measured P50 cost per success × measured attempts-per-success + moderation/storage/egress + payment and store fees + support/refund allowance) ÷ (1 − target margin), rounded up to whole credits; sanity-checked at P95 cost and against the free-tier/plan credits shown in the design. The owner approves the numbers; the rule is versioned so past jobs keep the price they were charged.
- **Store fees:** consumables sold through Apple/Google in-app purchase carry platform commissions; model net revenue per credit after fees (billing details are a separate payments workstream governed by the existing payment guardrails).

## 7. Consent, privacy and legal (decision 3) — gate G2

**Product requirements.** Separate opt-in (default off, never pre-checked) with its own policy text and version; shown before the first upload for generation and re-shown when the policy version changes; plain-language disclosure of **who processes the photo (provider name and country), what is sent, what is stored, for how long, and that the output is AI-generated**; per-job confirmation of the exact photo; withdrawal in Profile › Privacy that deletes jobs and results (outbox worker); delete-this-result at any time; retention window configured and reviewed (the existing `reviewed_media_retention_configuration_required` rule applies to results too); no use of photos or results for model training, advertising or analytics (repo rule: private face data never enters advertising/analytics).

**Legal and platform considerations to put in front of counsel** (all from secondary sources; **not legal advice, not verified against the primary texts**):

- **South Africa / POPIA.** Cross-border transfer to a provider abroad needs a lawful gateway under s72 (consent is one); biometric information is *special personal information*, and secondary sources note prior authorisation under s57(1)(d) may be needed to transfer special information to a country without adequate protection. Whether a photo processed this way counts as biometric processing is exactly the question for counsel. Operator agreements with each provider; breach procedure.
- **EU AI Act Art. 50.** Secondary sources say the deepfake-labelling duty for deployers applied from 2 Aug 2026 and only machine-readable marking for providers of already-marketed systems was deferred (to 2 Dec 2026). Whether GLAM is a deployer for EU users, and what labelling satisfies it, needs counsel; the in-app and exported labelling in §5.5 is designed to meet the intent regardless.
- **Apple App Review 5.1.2(i)** (as described by secondary sources, Nov 2025 update): disclose and obtain explicit permission before sharing personal data with third-party AI; consent must be opt-in and a privacy-policy paragraph alone is insufficient. Check the current guideline text before submission. Google Play has comparable policies to review.
- Other jurisdictions with biometric statutes (for example some US states) if the app is offered there.

**G2 (before any production activation):** completed privacy impact assessment; counsel sign-off on consent text, retention, cross-border mechanism and labelling; provider DPAs including no-training and deletion; platform-policy review; incident/takedown process.

## 8. Dependencies and what is needed from the owner

1. **Network access for research:** allow `fashn.ai`, `docs.fashn.ai`, `docs.cloud.google.com` (and any other provider docs) so claims can be verified against primary sources.
2. **Accounts and secrets** (secure configuration only): sandbox access for each candidate; the repo's `FASHN_API_KEY` slot exists; a Google Cloud project for Vertex; no keys in code or chat.
3. **Authorized test subjects and photos** with signed consent (§4), and people from the represented communities to approve garments and sit on the rating panel.
4. **Legal/privacy counsel** (G2) and a named approver for consent wording.
5. **Budget** for the bake-off (a few hundred generations at the snapshot prices is small, but fix a ceiling).
6. **Decisions:** pass thresholds (§4); whether to include the optional "face must match the account's own photo" check (§5.6); whether results may be shared and the labelling rule; whether face-and-torso/makeup previews ship in the same release as full-body.
7. **Commerce/booking owners** for P4–P5 (below).

## 9. Delivery phases and gates

| Phase | Deliverable | Exit criteria | Depends on |
|---|---|---|---|
| **P0 Access & decisions** | Network allow-list, accounts, test-subject recruitment, counsel engaged, decisions in §8 | Written approvals | Owner |
| **P1 Provider bake-off (G1)** | Evaluation report; primary + fallback; licence/terms evidence; measured cost inputs | Report signed; thresholds met; commercial licence/terms confirmed per provider | P0 |
| **P2 Backend foundation** | Candidate migrations (reviewed, **not applied to production** without explicit approval); consent purpose + policy; `tryon_*` tables; `TryOnProvider` interface + chosen adapters; credit reserve/capture/release wiring; cost ledger; price rules; moderation; labelling; deletion worker; **test-only** provider double with contract tests | Isolated-DB tests (`_test` database), idempotency/refund/ambiguity/withdrawal tests green; installed-app run against the **real** provider with a test account | P1 |
| **P3 Native flow** | FB-01…05 capture guidance, consent, progress, result + slider, history, event hand-offs replacing the "Not available" card | Maestro + manual runs on **Android and iOS separately**; screenshots compared to design; no-fabrication checks | P2 |
| **P4 Verified commerce** | Garment ↔ catalog listing mapping ("try on this item"), verified merchants, live price/stock, purchase links; event screens show real items | Catalog review pipeline in use; prices/stock from merchants, labelled with freshness; ad/commission rules respected | Merchants onboarded; catalog APIs exist |
| **P5 Beauty professionals & booking** | Verified professionals directory, availability, booking/reservation | Real bookings in a test account; cancellation/refund rules | Professionals onboarded; payments guardrails |
| **P6 Pilot, pricing, launch review (G2)** | Pilot with real users; measured cost/margin; owner-approved credit prices; legal sign-off | G2 passed; owner approval; production migration approval | P2–P5 |

**Events (decision 5), concretely:** add `source` (`design_sample` | `organiser_verified` | `user_created`) and `verified_at` to every event; the six themed events remain `design_sample` and keep the on-screen "Sample event — confirm with the organiser" label until a real source verifies them; user-created events are labelled as the user's own.

## 10. Acceptance tests (matrix in `ACCEPTANCE_MATRIX.csv`)

Highlights — each needs evidence of the stated kind, and none is satisfied by source reading or a test double alone:

- **No fake try-on:** with the service unavailable or consent missing, the app shows no image, only the status; there is no code path that renders a stand-in. (widget + backend tests)
- **Consent:** cannot create a job without a live `ai_look_generation` grant for the current policy version; withdrawal deletes jobs/results and blocks in-flight dispatch; policy change forces re-consent. (backend, native)
- **Credits:** reserve on submit, capture on success only, release on failure/cancel/ambiguity; idempotency-key replay is safe; no negative balances; cost ledger row per provider attempt. (isolated PostgreSQL)
- **Never double-bill:** crash after dispatch → attempt marked ambiguous, not re-sent, credits released. (backend)
- **Privacy:** results private, owner-checked, expiring; deletion removes storage objects; logs contain no image data; nothing enters analytics/ads. (backend, audit)
- **Quality (G1 and again in P3 on device):** identity, garment, skin-tone and body-shape thresholds met on the authorized set per Monk bin; all-white outfits render opaque and correctly; African garments pass the community panel. (human + metrics)
- **Labelling:** badge always visible; exported images carry the label; no result presented as a photo. (native, review)
- **Platform:** Android and iOS **separately** installed runs with a real account and real provider; screenshots compared to design; text-scale and small-screen checks. (native CI + manual)
- **Commerce linkage (P4/P5):** only verified listings are offered; price/stock freshness shown; purchase/booking links resolve; sample events never shown as real. (backend + native)

## 11. Out of scope for this plan

No provider selection, no pricing numbers, no migrations applied, no production activation, no rewrite of the event feature (PR #78), no generation without consent, no avatars.

## Appendix — sources consulted (retrieved 2026-11-18; all secondary unless stated)

- Virtual try-on API pricing roundups and listings: Best Virtual Try-On APIs for Developers in 2026 (innvesti.com); 10 Best Virtual Try-On APIs in 2026 (fal.ai); FASHN pricing update (fashn.ai/blog — via search summary only; host unreachable); FASHN Virtual Try-On 1.5 on fal.ai; Kling developer try-on page (klingai.com/global/dev/model/tryon) and 302.ai/piapi.ai listings; Vertex AI pricing (docs.cloud.google.com — via search summary only; host unreachable) and LiteLLM's Vertex listing.
- Google Vertex AI Virtual Try-On 001 / preview 08-04 / API reference pages (docs.cloud.google.com — via search summaries only); Google developer-forum threads on try-on face distortion and 429 errors.
- Licences: yisol/IDM-VTON GitHub (CC BY-NC-SA 4.0); OOTDiffusion Hugging Face discussion; FASHN blogs on open-source VTON models and building a try-on app (competitor/own commentary).
- Diversity evidence: AfriVTON-Bench (NeurIPS 2026 virtual page and project page; unreviewed submission).
- Regulation and platform policy (all secondary): Cloud Security Alliance, Ropes & Gray, Jones Walker, Houthoff and others on EU AI Act Article 50 and the Digital Omnibus; Bowmans, MJK, Webber Wentzel, Michalsons on POPIA (s72, s57(1)(d)); TechCrunch, Dataconomy, iGeeksBlog on Apple's Nov 2025 App Review 5.1.2(i) change.

Everything above that affects a decision must be re-verified against the primary source (provider documentation and contracts, statute text, Apple/Google policy text) before G1/G2.
