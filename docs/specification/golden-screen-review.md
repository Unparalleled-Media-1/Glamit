# Five golden screens — review candidate

5 November 2026. Branch `feat/golden-screen-recovery`. Next.js web and the existing Expo app remain separate implementations sharing product state and tokens.

## Review the actual UI

- [Phone review sheet](../application-preview/golden-iphone-review.html) and [PNG](../application-preview/golden-iphone-review.png).
- [Desktop review sheet](../application-preview/golden-desktop-review.html) and [PNG](../application-preview/golden-desktop-review.png).
- [Uncomputed face report](../application-preview/golden/iphone-report.png).
- Interactive build: `PREVIEW_BASE_PATH=/Glamit npm run build:preview`, then `npm run preview:serve`; open the printed local URL. The hub offers phone/desktop and eleven journeys, including Shop and Product Detail.
- Native app: `npm run dev:mobile`. Both Hermes exports compile; exports and phone-sized web captures do not establish physical native-device behavior.

The uploaded recovery directive says: “Submit the five golden screens for visual approval before redesigning the remaining screens.” This candidate is submitted for that review. No visual baseline is approved automatically. Destination Stylist and other new modules remain specified proposals under the later freeze, while existing approved backend behavior is retained.

## Design system

`packages/product/consumer-design.json` is the shared token source. `npm run design:tokens` generates web CSS; `node scripts/generate-consumer-tokens.mjs --check` detects drift. Native golden commerce and core beauty typography consume the same source. Existing non-golden screens retain earlier styles until review.

Charcoal and blush frame Home, photo preparation and Studio; ivory, mauve and champagne distinguish commerce. Georgia/serif display text pairs with system sans body copy. Spacing uses 4/8/12/16/24/32/48; controls target at least 44px. Radius, palette, font and motion values live in the token file. Reduced-motion support remains active.

Home has compact immediate Face Analysis/Personal Stylist entry points and goal continuity. Analysis uses a portrait preparation panel, explicit local consent/photo review and an uncomputed report with progress statuses. Studio uses reference strips, separately labeled color moods, reversible choice history and original-preserving handoff. Shop uses an editorial feature and filterable product grid; Product Detail uses a larger contained study, reference moods and factual availability/fulfillment disclosures. These are five distinct content patterns rather than repeated tool forms.

Destination editing uses an accessible dialog with explicit Save/Cancel, Escape and focus restoration. Mobile navigation stays fixed with safe-area space; commerce remains secondary through Get This Look. Product study artwork is fictional, unbranded and labeled not for sale; see golden-product-art.json. No reference shade implies a merchant SKU or compatibility result.

## Interaction and state boundaries

Undo stores up to twenty allowlisted styling choices, never private media. Reset preserves the original. Copy/Share exports a text-only brief on user gesture. Changing one look component preserves others. Comparison remains locked until an actual qualified generated result exists; a color or intensity control changes request metadata and never pretends to transform the original photo.

Loading, failure, empty and unavailable states must correspond to real operations. Current local photo inspection and session edits are real; absent providers remain unavailable. No fake scan, synthetic report, fake inventory, invented prices, loading-time claims or fabricated job progress are added. Future provider skeletons must follow actual job status, permit retry/cancel where supported and preserve the original on failure. Their real loading, quality and matching gates remain open.

## Validation and remaining gates

Automated evidence is in docs/validation.md. Browser checks cover real task paths, independent selections, denied workspace access, consent, local-data deletion, responsive layouts, reduced motion, shop filtering, location Save/Cancel, reference handoff and disconnected commerce. Twenty-four candidate captures cover six states at four viewports. `npm run test:golden` checks completeness/dimensions; `node scripts/check-golden-visuals.cjs --compare-approved` additionally requires an explicitly approved manifest and compares pixels. It refuses to silently bless these candidates.

Human task-completion testing, visual approval, physical iOS/Android safe areas and keyboard behavior, assistive-technology audit, actual generation quality and real catalog matching accuracy remain unverified. No live AI, account integration, stock, payment, booking or weather service is enabled by this work. Existing 10% item-sale commission logic remains server-side and unchanged; no service commission is invented.
