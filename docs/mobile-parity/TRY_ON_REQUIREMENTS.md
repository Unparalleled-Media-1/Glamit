# "See it on you" — what a real try-on needs (not built)

**Goal (from the owner):** show the user themselves dressed in a recommended outfit, from their own photo — not an avatar and not a stock/sample portrait.

**Why the app does not show it today.** The backend has no image-generation or try-on route (`services/api` exposes catalog publish/review, private media, analysis and `/v1/ai/stylist/advice` only). The native app therefore shows an explicit status card ("Not available yet") and no image. Anything drawn client-side (colour overlays, cut-outs, avatars) would misrepresent the outfit and the person, so it is deliberately not done.

## What would have to exist (proposal — needs owner decisions)
1. **Provider and cost.** An image-editing model that can place garments on a supplied photo (e.g. an OpenAI image-edit model) or a dedicated try-on provider; per-image cost, rate limits, regional availability, and a credits ledger entry per job (the design shows credits and "failure refund").
2. **Separate consent purpose.** `ai_look_generation`, distinct from `private_photo_storage` and `cosmetic_photo_analysis`, with versioned policy text, server-confirmed grant, withdrawal, and a per-photo confirmation screen (design GL-024 pattern).
3. **Authenticated job API** following the existing private-analysis pattern: create job (idempotency key, `media_id`, `outfit_brief`), poll job, fetch result through an owner-checked private-media endpoint with expiry, cancel/delete. No client-side image processing beyond the existing normalisation.
4. **Outfit brief contract.** A structured description derived from the user's chosen direction (garment types, colours, fabrics, dress code), never from inferred culture, faith or body attributes; garments from verified merchants only once a catalog exists, otherwise descriptive.
5. **Safety and misuse controls.** Only the account owner's own photo; face/body-of-another-person and minors policy; content moderation on input and output; no sensitive-attribute inference; outputs labelled "AI-generated" in-app and in any share image; private-data rule from `AGENTS.md` (face data never enters advertising/analytics).
6. **Retention and deletion.** Result images stored privately with expiry, deleted on account deletion and on withdrawal of consent; no provider-side retention beyond the provider's contractual minimum, documented.
7. **Evidence before it is called done.** Contract tests with an isolated provider double (tests only), an installed iOS/Android run against a real provider with a test account, failure/refund/cancel/withdrawal cases, and native screenshots compared to the design (Studio GL-048/049/050 and the full-body fitting room FB-01…05).

## Decisions needed from the owner
- Which provider/model, and the per-image cost and credit price.
- The consent policy text and who approves it.
- Whether results may be shared, and if so the labelling rule.
- Full-body (FB-01…05) versus face/torso previews for the first release.

Until these exist, the app must keep showing the "Not available yet" card. This document is a requirements proposal, not an implementation or a claim of capability.
