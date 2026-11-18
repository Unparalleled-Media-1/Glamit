# Provider bake-off protocol (fixed before any testing)

Status: **protocol only — nothing has been run, no provider has been called, no money has been spent.** Thresholds are the owner's *provisional product gates*, not industry benchmarks. Changing any number below after seeing results invalidates the run; amend this file first, in a reviewed commit.

## 1. Authorisations required before any step that costs money or uses people's photos

| Needed | From | Status |
|---|---|---|
| Spend authorisation up to the **US$150 provider-API ceiling** (separate written approval; this document is not that approval) | Owner | NOT GIVEN |
| Sandbox accounts and keys, via secure configuration only | Owner | NOT PROVIDED |
| Written commercial-use, retention, training-use and region terms for each provider | Provider / counsel | NOT OBTAINED |
| Authorised test subjects with signed consent (evaluation use, storage period, deletion on request, aggregate-only publication) | Owner + subjects | NOT RECRUITED |
| Rating panel (including people from the represented communities) and the garment set approved by people from the attire's communities | Owner | NOT RECRUITED |

The ceiling covers **provider API spend only**; subject and rater costs are outside it (owner to confirm).

## 2. Candidates

FASHN and Replicate are the **initial candidates, not approved winners**.

- **FASHN** — dedicated try-on API; an adapter already exists in the repo.
- **Replicate** — a hosting platform, so the candidate is a *specific workflow*. Many try-on models on hosting platforms (IDM-VTON, CatVTON, OOTDiffusion) are reported as non-commercial licences and are **excluded**; a Replicate workflow enters only after its licence is read from the model page and found to permit commercial use, and its version is pinned (the adapter already requires a pinned 64-hex version).
- **Reference only, not owner-approved candidates:** Google Vertex AI Virtual Try-On, Kling/Kolors, and an OpenAI image-edit control. They may be added to Stage 1 if the owner approves; they are listed in `PROVIDER_EVALUATION_SCORECARD.csv`.

## 3. Test set

- **Subjects: 24 consenting adults**, 8 in each skin-tone group by the Monk scale — **1–3, 4–6, 7–10** — with a spread of body shapes and sizes (XS–4XL), hair textures and styles (locs, braids, afros, wigs, headwraps), and people who choose modest or religious coverage. Photos: phone-quality, full body, standing, mixed indoor/outdoor light. A second, smaller torso-framed set (6 subjects) covers upper-body styling.
- **Garments: 8**, chosen so each category appears: all-white linen/cotton co-ord; evening gown; suit; cocktail dress; printed garden/race-day dress; a hat/fascinator; and **two African or South African garments** approved by people from those communities (attire is always the wearer's choice; nothing is inferred about anyone).
- **Unit of analysis: one generated image** = subject × garment × provider. **192 images per provider** (24 × 8); **64 per Monk group**.
- Each image is generated once with fixed inputs (same crop, same garment photo). Retries are counted as failures of the first attempt, not hidden.

## 4. Rating method

**Blind and randomised.** Raters see the source photo and the result side by side with the provider hidden and the order shuffled; ≥ **3 independent raters per image**; at least one rater from each skin-tone group represented in the subject set.

**Calibration first.** Before scoring, raters score a shared set of 20 anchor images (including known failures) and discuss; the rubric is revised once if inter-rater agreement is poor.

**Identity (mandatory).** "Is this clearly the same person, wearing the garment?" scored 1–5.
- An image is **satisfactory** if the median of three raters is ≥ 4 **and** no rater flags *face replaced / different person*.
- **Hard fail** (unsatisfactory regardless of scores): any rater's "face replaced / different person" flag, any automated face-embedding similarity below a threshold calibrated *before* testing on same-person vs different-person pairs from the same set, or any visible face reshaping/lightening. No unapproved face replacement is acceptable.

**Garment fidelity.** Colour, pattern, length, silhouette, fabric and logo/text accuracy against the garment photo, scored 1–5. **Satisfactory** if the median is ≥ 4.

**Also recorded (reported, not gates unless the owner adds them):** skin-tone shift (ΔE in masked skin regions against the source, by Monk group — darker tones are a known risk area), body-shape preservation (no slimming/reshaping), white-fabric opacity, artefacts (hands, feet, hair edges, extra limbs), success rate, latency P50/P95, 429/provider errors, moderation false-rejects, and **billed cost per successful image from invoices**.

**Agreement.** Report Fleiss' κ on the satisfactory/unsatisfactory decision; κ < 0.4 means the rubric or training failed and the stage is re-rated before any conclusion.

## 5. Decision rule (provisional gates from the owner)

For **each** provider, on its 192 images:

| Gate | Rule |
|---|---|
| Identity | observed satisfactory rate **≥ 90%**, **and** one-sided 95% exact (Clopper–Pearson) lower bound **≥ 82%**, **and** every Monk group's observed rate ≥ 90% (n = 64 each) |
| Garment fidelity | observed satisfactory rate **≥ 85%**, **and** lower bound **≥ 77%**, **and** every Monk group ≥ 85% |
| No hard-fail identity flags in the *accepted* subset used for real features | by construction of the rule above |

The lower-bound floors (82% and 77%) are *proposals* added so a lucky sample cannot pass a weak provider; the owner may change them before testing.

**What the numbers mean (computed in advance, exact binomial):**

| n | k to reach the target | one-sided 95% lower bound at that k | chance a *truly good* provider passes | chance a *truly weak* provider passes |
|---|---|---|---|---|
| identity, n = 192 | 173 (90.1%) | 0.858 | 99.8% (true rate 95%) | 2.5% (true rate 85%) |
| identity, n = 64 per group | 58 (90.6%) | 0.823 | 96.0% (true 95%) | 13.6% (true 85%) |
| garment, n = 192 | 164 (85.4%) | 0.806 | 99.9% (true 92%) | 3.3% (true 80%) |
| garment, n = 64 per group | 56 (87.5%) | 0.767 | 93.2% (true 92%, with the 0.77 floor) | 8.4% (true 80%) |

Per-group gates at n = 64 are looser statistically (a weak provider passes a single group 8–14% of the time) but the pooled gate at n = 192 is strict; passing needs **both**. Observed 90% does not prove a true 90%; the lower bound is what protects against that.

If **no** candidate passes, the feature stays "Not available yet". If two pass, the better on identity then garment fidelity is primary and the other the fallback (and each must also pass the commercial-terms and retention checks).

## 6. Staging and spend (illustrative arithmetic — prices are secondary, unverified)

| Stage | Images (attempts) | Purpose |
|---|---|---|
| 0 — no spend | 0 | Mock/isolated tests of the pipeline and adapters |
| 1 — screening | ≤ 3 candidates × 48 (6 subjects × 8 garments) | Eliminate clear failures cheaply |
| 2 — full evaluation | ≤ 2 finalists × 192 | The gates above |
| 3 — re-run allowance | ≤ 192 | After a provider-side fix or garment-set correction |

At the secondary price snapshot (about US$0.06–0.10 per attempt; a premium endpoint is about US$0.30) and an assumed 1.3 billed attempts per success: Stage 1 ≈ 144 × 1.3 × US$0.10 ≈ US$19 (if one of the three is a premium endpoint, add up to ≈ US$13 for its 48 images); Stage 2 ≈ 384 × 1.3 × US$0.10 ≈ US$50; Stage 3 ≈ 192 × 1.3 × US$0.10 ≈ US$25 — **roughly US$95–110 against the US$150 ceiling**. This is arithmetic on unverified prices, **not a quote**.

**Spend controls:** a ledger of billed attempts (the cost-event table in the plan), a hard stop at 80% of the ceiling that needs fresh owner approval, and the rule that **sample size is not reduced to fit the budget** — a candidate is dropped instead.

## 7. Evidence discipline

A provider, price, licence or legal claim is recorded as **verified** only if read from the provider's primary page/contract or produced by these tests, with the date and the person who checked it. Search-summary and reseller figures stay labelled *secondary*. The scorecard cells start as `NOT TESTED` / `UNVERIFIED` and are changed only with a link to the evidence file.
