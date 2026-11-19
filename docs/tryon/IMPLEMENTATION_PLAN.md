# Real photo try-on — implementation blueprint

**Status: approved direction, not built.** The decisions in §0 are the owner's. This is a blueprint: **no try-on code exists, no provider has been called, no money has been spent, no migration has been applied, no photograph has been processed, no legal review has happened.** Paid generation is **not** activated and virtual try-on is **not** released to production. Companions: `BAKEOFF_PROTOCOL.md` (how providers will be judged), `PROVIDER_EVALUATION_SCORECARD.csv` (every cell `NOT TESTED`), `ACCEPTANCE_MATRIX.csv` (every test `NOT RUN`).

Customer journey being built toward (not a permanent placeholder):
**Event selection → personalised styling → actual-photo virtual try-on → verified outfit purchasing → makeup/hair booking.**

## 0. Owner decisions (recorded in this revision)

| # | Decision | Where it lands |
|---|---|---|
| 1 | **Providers:** FASHN and Replicate are *candidates*. No provider is approved until real testing and commercial terms are verified | `BAKEOFF_PROTOCOL.md` §2; gate G1 |
| 2 | **Budget:** bake-off proposed within a **US$150** ceiling (provider API spend). **No spend or paid service without separate authorisation** | Protocol §1, §6 |
| 3 | **Thresholds (provisional product gates):** ≥ 90% satisfactory identity preservation, ≥ 85% satisfactory garment fidelity. Rating method and sample size defined *before* testing | Protocol §3–§5 (24 subjects × 8 garments = 192 images/provider) |
| 4 | **Photographs:** users choose their own authorised photographs; the photo is **not** required to match the account/profile photo | §5.3 |
| 5 | **Scope:** full-body outfit try-on required; face-and-torso stays relevant for beauty and upper-body styling | §5.1 |
| 6 | **Privacy:** private by default; separate processing consent; documented retention and deletion; explicit action before any sharing | §5.4, §7 |
| 7 | **Disclosure:** every result labelled as an AI-generated preview; never presented as a guaranteed representation of garment fit or appearance | §5.5 |
| 8 | **Credits:** GLAM-specific, configurable AI credits; provider costs, customer credit prices, reservations, captures, refunds and usage records kept separate and auditable. **GLAM credits are entirely separate from LifeSwap Stay Credits** — balances, pricing, ledgers, purchases, entitlements — with no cross-platform consumption or accounting | §3 |
| 9 | **Reuse** the existing private media, consent, jobs, credits and provider-adapter architecture; verify its current behaviour before changing it | §2 (verified), §5 |
| 10 | **Evidence:** nothing about providers, pricing, licensing or legal position is marked verified without primary-source or test evidence | §4, Appendix |

Corrected interpretation: "Stay-independent GLAM AI credit pricing" means GLAM credits are separate from LifeSwap Stay Credits (item 8). GLAM's customer prices are *also* configurable independently of any one provider's cost, but that is secondary to the separation requirement.

## 1. Where the journey stands today

| Step | Status | Evidence / dependency |
|---|---|---|
| Event selection (six themed events + add your own) | **Built, native, local-only** — PR #78 (draft). The six events are design *sample content* and labelled so | Needs a real verified-event source (§8 P4) |
| Personalised styling | **Built** — rule-based directions, host dress code, etiquette, deadline plan; labelled not-AI | Optional later: server stylist advice |
| **Try-on on the user's own photo** | **Not built.** The app says "Not available yet" and shows no image | This blueprint |
| Verified outfit purchasing | **Not built.** Guidance + a user-started maps search only | Merchants, inventory, price, purchase links, payments approval |
| Makeup/hair booking | **Not built.** Same interim | Professionals directory, availability, booking |

The complete experience is **not done** until every row works for real.

## 2. Verified current behaviour of the reusable infrastructure

Run in this session against **PostgreSQL 16** (isolated throwaway cluster, database `glam_test`, deleted afterwards), main branch at `7e8535b`:

`uv run --frozen pytest tests/test_credits.py tests/test_private_media.py tests/test_analysis_jobs.py tests/test_integrations.py tests/test_migrations.py` → **88 passed** (≈ 11 s).

What those tests *do* prove (names are the evidence; reproducible with the command above and the repo's documented test database setup in `docs/development.md`):

| Capability | Proven behaviour |
|---|---|
| **Credits** (`credits.py`) | idempotent grant and reservation lifecycle; **parallel reservations cannot overspend**; failure/release/expiry and owner scoping; the database **rejects unbalanced or mutated financial records**; a rolled-back transaction cannot emit or grant |
| **Private media** (`private_media.py`) | owner-only retrieval; client cannot supply storage key, TTL or skip consent; **look-preview consent is not photo-storage consent**; invalid/truncated/animated images never reach storage; withdrawal/re-grant cannot resurrect old media; ambiguous storage failures are cleaned truthfully; **retention is never silently chosen** (absent configuration fails closed); deletion is never blocked by provider or eligibility loss; revoked sessions cannot read photos |
| **Analysis jobs** (`analysis_jobs.py`) | requires explicit configuration; **no automatic replay**; one attempt even with concurrent workers; no database locks held during the provider call; an **interrupted attempt is failed and never re-dispatched**; a **late provider return cannot overwrite** an interrupted attempt; **privacy changes during a provider call (consent, eligibility, expiry, media deletion) never store results**; cancellation at queued/running/completed removes or prevents publication; withdrawal redacts saved reports |
| **Provider adapters** (`integrations/providers.py`) | `Fashn` and `Replicate` refuse to run without explicit consent; FASHN needs a configured pinned model, private-origin image URLs and safe prediction IDs; Replicate needs a **pinned workflow**; redirects are rejected before credentials leave the origin; only safe reads retry (POST is not retried) |

What the tests do **not** prove, and what was found:

1. **Adapters are exercised against doubles, not the real services.** They prove GLAM's guards, not that FASHN's or Replicate's *current* APIs behave as the adapter assumes (request shape, outputs, statuses). That needs real-provider integration (blocked, §6).
2. **The FASHN adapter stops at `start` and `status`.** There is **no step that fetches the generated image, moderates it, stores it privately, labels it, or captures credits** — that pipeline does not exist yet.
3. **Credits are generic units keyed to the GLAM user** (`credit_account.user_id`; buckets `available/held/issuance/consumed`). There is **no price rule, cost ledger or per-feature metering**, and no tag distinguishing credit systems.
4. **No try-on consent purpose exists.** Purposes today are `private_photo_storage`, `cosmetic_photo_analysis`, `private_look_storage`.
5. **Source photos are validated for analysis** (normalised PNG, existing dimension/size rules); **no full-body profile** exists.
6. **Migration chain:** the newest version files are 0014–0017 (`creator_studio`, `private_media`, `analysis_jobs`, `analysis_passport`). Per `AGENTS.md`, candidates 0014–0017 are **not applied to production**, so a try-on migration is a *candidate on top of an unapplied chain* and needs the existing explicit approvals.
7. **There is no LifeSwap or Stay Credits reference anywhere in the repository** (searched). The separation requirement is therefore a clean design constraint, not a refactor.

## 3. GLAM AI credits — separation from LifeSwap Stay Credits

**Rule: GLAM AI credits and LifeSwap Stay Credits never share a balance, ledger, price, purchase, entitlement or accounting treatment.**

Design constraints (proposal, to be confirmed with finance/legal):

- **Own ledger.** Try-on credits use GLAM's existing `credit_*` tables inside GLAM's database. No table, foreign key, view, queue, endpoint or SDK call connects to any LifeSwap system. If both products ever share sign-in, that links **identities only**, never balances.
- **Explicit kind tag.** Add a `credit_kind` (`'glam_ai_credit'`) column with a CHECK constraint to `credit_account`/`credit_journal` so a future second kind cannot be silently mixed into GLAM's ledger (candidate migration; costs nothing at runtime).
- **Own products.** Separate store product IDs/SKUs, separate receipts validation, separate refund and tax handling, a distinct on-screen name ("GLAM AI credits"), and copy that never implies interchangeability.
- **No cross-consumption.** No code path may debit a GLAM job from a Stay Credit balance or vice versa. A **boundary test** greps the dependency graph and schema for any LifeSwap/Stay identifier and fails the build if one appears; a second test asserts a try-on job can only reserve from a `glam_ai_credit` account.
- **Auditable separation of money.** Provider cost (what GLAM pays), customer credit price (what the user pays), reservations, captures, refunds and usage live in **different** tables (§5.2): `generation_cost_event` (cost), `generation_price_rule` (customer price, versioned, configurable), `credit_reservation`/`credit_posting` (customer credits), so each can be audited without the others.

## 4. Provider evaluation

Method, sample size, rating rubric, decision rule, staging and spend controls are fixed in **`BAKEOFF_PROTOCOL.md`** (and must be amended there, in a reviewed commit, before any result is seen).

**Candidates:** FASHN (adapter exists) and Replicate (a platform: only a *specific workflow whose licence permits commercial use* and whose version is pinned). Google Vertex Virtual Try-On, Kling/Kolors and an OpenAI image-edit control are listed in the scorecard as reference candidates the owner may add.

**Licensing finding that constrains Replicate:** the widely used open-source try-on models (IDM-VTON, CatVTON, OOTDiffusion) are reported by secondary sources as **non-commercial (CC BY-NC-SA)**; hosting them on Replicate does not change their licence. They are excluded for production. The repo's `Replicate` adapter must never be pointed at them.

**Evidence status — read this before relying on any figure.** Everything below is **secondary** (search summaries, reseller and competitor blogs); **none is verified from a provider's primary documentation**, because `fashn.ai`, `docs.fashn.ai` and `docs.cloud.google.com` are outside this session's allowed network domains. This is not a prerequisite for the work in §6A; it is a prerequisite for *trusting* the numbers.

| Candidate | Secondary evidence (2026-11-18) | Status |
|---|---|---|
| FASHN try-on | ≈ US$0.075/credit, 1 credit per try-on, a premium tier ≈ 4 credits (~US$0.30); states its own v1.5 model is Apache-2.0 | UNVERIFIED |
| Replicate | platform; per-run prices vary by model; commercial licence depends on the model | UNVERIFIED — workflow not yet chosen |
| Google Vertex try-on (reference) | GA `virtual-try-on-001`; ≈ US$0.06/image; developer-forum reports of face distortion and 429 errors | UNVERIFIED |
| Kling/Kolors (reference) | ≈ US$0.07/generation; data-jurisdiction implications to be reviewed by counsel | UNVERIFIED |

Darker skin tones and non-fitted African garments are a documented weak spot for try-on models (an unreviewed benchmark, small sample), so vendor claims and public benchmarks cannot pick GLAM's provider; the owner-defined test set does.

## 5. Architecture (reuse, backend-first)

**No new application and no second pipeline.** The work extends the existing API service and the Flutter app `apps/glam_mobile`. The try-on job engine follows the proven analysis-job pattern (§2): durable attempt before any external call, per-user locking with `SKIP LOCKED`, live consent/eligibility/retention re-check at dispatch, never re-dispatch an ambiguous attempt. Shared helpers are extracted from `analysis_jobs.py` **only where the existing 88 tests protect the behaviour**; otherwise a sibling module copies the pattern.

### 5.1 Scopes
`full_body` (required, outfits), `torso` (upper-body outfits), `face_hair_makeup` (beauty; possibly a different model class evaluated separately). The client proposes the scope; the server re-validates it from the stored image (dimensions/aspect, optional pose check) and rejects a mismatch before any provider call.

### 5.2 Data model (candidate migration — **not applied**)
`policy_document` row for purpose **`ai_look_generation`** (versioned text); `tryon_job` (owner, `media_id`, scope, outfit brief, garment references, state `queued|running|completed|failed|cancelled|expired|rejected`, provider + pinned model version, attempt id, provider job id, error code, `credit_reservation_id`, `price_rule_id`, timestamps, expiry); `tryon_result` (private object key, hash, size, label version, expiry, deleted_at); `generation_price_rule` (versioned, `effective_from`, scope, `credit_units` — **configuration, never a code constant**); `generation_cost_event` (job, attempt, provider, billed cost in micros + currency, outcome `success|provider_failure|moderation_reject|cancelled`, refunded units); reporting views (cost per successful generation, failure and refund rate, margin per scope/provider/period); `credit_kind` guard (§3). Customer prices are **not** hardcoded, and the unapproved ones do not exist.

### 5.3 Which photograph (decision 4)
The user picks any of **their own authorised photographs** — it need not match the profile photo and no match check is required. The source is always a `private_media` row owned by the requester; **never an avatar, never a stock or sample portrait.** Because another person may appear in a chosen photo, the flow adds: an explicit attestation ("I have the right to use this photo and the permission of anyone pictured"), rejection of multiple-person images, adult-eligibility gating (already enforced), input/output moderation, per-user rate limits, a report/takedown path, and audit events. **Identity preservation is mandatory:** the provider call and acceptance tests forbid face replacement; any provider that alters the face fails G1. Whether attestation alone is adequate when the pictured person is not the account holder is a question for counsel (G2).

### 5.4 API (proposal, mirrors `/v1/analysis/*`)
`GET /v1/tryon/policy` · `POST/DELETE /v1/tryon/consent` · `GET /v1/tryon/quote?scope=` (credit units from the active rule; no side effects) · `POST /v1/tryon/jobs` (media id, scope, outfit brief, garments, `Idempotency-Key`) · `GET /v1/tryon/jobs[/{id}]` · `GET /v1/tryon/jobs/{id}/result` (owner-checked, expiring) · `DELETE /v1/tryon/jobs/{id}`. Stable error codes (`consent_required`, `insufficient_credits`, `scope_mismatch`, `moderation_rejected`, `provider_unavailable`, `attempt_ambiguous` …) feed the app's `message()` map.

### 5.5 Lifecycle and failure handling
1. **Submit:** validate ownership, live consents, eligibility, scope, garment rights; `credits.reserve(job_id, units from price rule)`; insert `queued`.
2. **Dispatch:** re-check; write `running` + attempt id **before** the call; pass the provider a signed URL on an allow-listed private origin only.
3. **Complete:** fetch result, moderate, store privately, attach the AI label, `credits.finish(capture=True)`, write a cost event.
4. **Fail:** `finish(capture=False)` (full release/refund); cost event if the provider still billed.
5. **Ambiguous attempt:** never re-sent; marked failed (`attempt_ambiguous`); credits released; the user may start a new job explicitly. Status polling by provider job id may *recover* a result but never causes a second billed call.
6. **Fallback provider:** only after a *definite* primary failure before provider acceptance; both attempts ledgered; never both billed for one job.

### 5.6 Disclosure, sharing, labelling (decisions 6–7)
Results are **private by default**; viewing is in-app only. Saving to the device or sharing requires an **explicit user action** and carries the visible **"AI-generated preview"** mark (plus C2PA/metadata where the stack supports it). The UI never calls a result a photograph or a guarantee: "Preview only — fit, drape and colour may differ from the real garment."

### 5.7 Native app (Flutter)
Reuse `Session`, `Transport`, `DeviceVault`, the private-image lifecycle (cleared on lock/background). New screens built to the design: full-body capture guidance (FB-01…05), generation consent (distinct text), garment selection, progress with cancel, result with AI badge and before/after slider, history/deletion, and the event hand-offs that replace today's "Not available yet" card. Release builds must contain **no fixture or simulated try-on path** (the existing fixture-leak tests are extended to cover it).

## 6. What can proceed now vs what is blocked

### 6A. Can proceed now — mocks and isolated tests, no credentials, no spend, no real photos
1. **Candidate migrations** (`ai_look_generation` policy, `tryon_*`, `generation_price_rule`, `generation_cost_event`, `credit_kind`) — authored and tested **only in the throwaway `_test` database**; not applied to any shared or production database.
2. **Provider abstraction:** a `TryOnProvider` interface with FASHN/Replicate adapters extended to fetch results; a **test-only provider double**; adapter contract tests (consent guard, pinned model/workflow, private-origin URLs, no POST retry, redirect rejection) — all against doubles.
3. **Backend API and job engine** (`/v1/tryon/*`): consent gating, credit reserve/capture/release, never-replay, withdrawal deletion, result storage, label metadata, quote, rate limits, moderation hooks (doubles), all with isolated-DB tests including the §3 boundary tests.
4. **Metering and pricing configuration:** cost events, price rules, reporting views — no unapproved prices seeded.
5. **Native flow:** consent, capture guidance, progress, result with AI badge, history/deletion, event hand-offs — exercised in widget tests against a **test-only** service double that cannot exist in release builds; the production default stays "service not connected".
6. **Bake-off harness:** dataset manifest, blinded rating-sheet generator, ΔE and face-embedding scripts, and the Clopper–Pearson/κ calculators, tested on synthetic data (no real photos).
7. **Event data model:** `source` (`design_sample | organiser_verified | user_created`) and `verified_at` on events (follow-up to PR #78).
8. **Drafts for counsel:** consent text, retention schedule, privacy-impact assessment, provider DPA checklist.

### 6B. Blocked
| Blocked work | Blocked on |
|---|---|
| Any real-provider call, adapter validation against real APIs, Stage 1–3 bake-off | **Provider credentials; separate spend authorisation (≤ US$150); authorised photographs and subjects; written provider terms** |
| Choosing a primary and fallback; any "verified" provider/price/licence claim | The above, plus primary-source access (network allow-list for provider docs, or owner-supplied documents/contracts) |
| Production activation, any paid generation, release to users | **Legal/privacy review (G2)**, owner approval, production-migration approval (0014–0017 chain), app-store policy review |
| Selling credits | Payments approval and store products; finance/legal confirmation of the Stay-Credit separation |
| Real purchasing and booking | Merchant and professional onboarding, inventory and availability sources, payments guardrails |
| Native Android/iOS installed verification of new flows | GitHub Actions is currently unavailable (billing lock); then provider access for real-result runs |

**Do not:** activate paid generation, release try-on to production, create another application, or build a second backend pipeline.

## 7. Consent, privacy and legal (gate G2)

**Product requirements.** A separate opt-in (default off, never pre-checked) with its own versioned policy text, shown before the first generation and again when the version changes; plain-language disclosure of **who processes the photo (provider and country), what is sent, what is stored, for how long, and that the output is AI-generated**; per-job confirmation of the exact photograph and the attestation in §5.3; withdrawal in Profile › Privacy that deletes jobs and results (outbox worker, as for existing consents); delete-this-result at any time; a **reviewed** retention window (absent configuration fails closed, as it does today for media); **no** use of photos or results for model training, advertising or analytics.

**Points for counsel — secondary sources only, not legal advice, not verified against primary texts:** POPIA cross-border transfer (s72) and whether a processed photograph is *special (biometric) personal information*, with possible prior authorisation under s57(1)(d); EU AI Act Article 50 deepfake labelling (reported as applying from 2 Aug 2026) and what labelling satisfies it; Apple App Review 5.1.2(i) on sharing personal data with third-party AI (explicit permission); Google Play equivalents; biometric statutes in other jurisdictions; whether attestation suffices when the pictured person is not the account holder.

**G2 exit:** completed privacy-impact assessment; counsel sign-off on consent text, retention, cross-border mechanism, labelling and the third-party-photo question; provider DPAs including no-training and deletion; platform-policy review; incident and takedown process.

## 8. Phases and gates

| Phase | Deliverable | Exit criteria | Depends on |
|---|---|---|---|
| **P0 Authorisations** | Spend approval ≤ US$150, accounts, subjects, panel, counsel | Written approvals | Owner |
| **P1 Controlled pipeline (mocks)** — can start now | §6A items 1–6 on the test database with the provider double | All isolated-DB and widget tests green; no release-build fixture path | none |
| **P2 Provider bake-off (G1)** | Stages 1–3 per `BAKEOFF_PROTOCOL.md` | Gates passed; primary + fallback; terms evidence; measured cost inputs | P0 |
| **P3 Real-provider integration** | Adapter validated against the real API with a test account; installed Android and iOS runs **separately** | Real generation with authorised photos; acceptance tests T-13…T-20 | P1, P2 |
| **P4 Verified commerce** | Garment ↔ verified catalog listing, live price/stock, purchase links; real events | Catalog review pipeline in use; freshness shown | Merchants onboarded |
| **P5 Beauty booking** | Verified professionals, availability, reservations | Real bookings in a test account | Professionals onboarded; payments guardrails |
| **P6 Pilot, pricing, launch review (G2)** | Pilot; measured cost/margin; owner-approved credit prices; legal sign-off | G2 passed; production-migration approval | P3–P5 |

The next meaningful milestone is **P1**: a functioning, privacy-safe try-on pipeline in a controlled environment, followed by real-provider evaluation (P2/P3). Events (decision 5 of the earlier brief) get `source`/`verified_at`; the six themed events stay `design_sample` and labelled until a real source verifies them.

## 9. Acceptance
See `ACCEPTANCE_MATRIX.csv`. Nothing is satisfied by source reading or a test double alone where real evidence is named; no simulated result is ever presented as a genuine try-on; Android and iOS are verified separately.

## Appendix — sources and evidence status (retrieved 2026-11-18; all secondary unless stated)

- **Repo evidence (primary):** files read and the 88-test run described in §2.
- Provider pricing/features (secondary): innvesti.com and fal.ai provider roundups; FASHN pricing blog and fal.ai FASHN listing (via search summaries; fashn.ai unreachable); Kling developer page and aggregator listings; Vertex AI pricing and try-on pages (via search summaries; docs.cloud.google.com unreachable); Google developer-forum threads (user reports).
- Licences (secondary): yisol/IDM-VTON repository (CC BY-NC-SA 4.0); OOTDiffusion Hugging Face discussion; FASHN commentary on open-source VTON models (competitor).
- Diversity: AfriVTON-Bench (NeurIPS 2026 virtual page; unreviewed submission).
- Regulation/platform (secondary): CSA, Ropes & Gray, Jones Walker, Houthoff on EU AI Act Art. 50; Bowmans, MJK, Webber Wentzel, Michalsons on POPIA; TechCrunch/Dataconomy/iGeeksBlog on Apple's 5.1.2(i) change.

Everything that affects a decision must be re-verified against provider documentation and contracts, statute text and platform policy before G1/G2.
