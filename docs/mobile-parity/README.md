# Mobile 1:1 design parity (apps/glam_mobile)

**Authority.** The supplied GLAM design atlas, handover and design system are the visual and navigation reference. **Framework decision (approved by the owner):** Flutter in `apps/glam_mobile` is the single canonical mobile application. `apps/mobile` (Expo) and `apps/flutter_app` (rejected F1) are preserved for reference and rollback; nothing was deleted.

## Registries (Batch 0)

| File | Content |
|---|---|
| `SCREEN_REGISTRY.csv` | 232 screens (212 GL, 14 TP, 5 FB, Home) with role, proposed route, purpose, action, destinations, backend dependency, states, widget, status |
| `NAVIGATION_GRAPH.json` | 341 edges derived statically from each screen's declared destinations, plus proposed routes. The handover's 639-link crawl was **not** reproduced (its crawler throws headlessly; defect PARITY-B1-007) |
| `DESIGN_TOKENS.json` | Global tokens, dark/light roles, frame metrics, font substitution |
| `ASSET_MANIFEST.csv` | Design assets with SHA-256 and licensing notes |
| `SCREEN_PARITY.csv` | Ten independent statuses per screen (never collapsed into "done") |
| `BACKEND_CONTRACT_MAP.csv` | Per-screen backend status from the handover: 26 confirmed, 64 partial, 142 unverified |
| `AD_PLACEMENTS.json` | The 10 ad placements, events and blocked screens |
| `reference/` | The two standalone design HTML files with `SHA256SUMS` (the zip's hash is recorded, not committed) |

Counts verified by rendering the standalone atlas: 233 registry entries = 232 screens + the `DS` design-system board.

## Batch 1 screens (verified from the registry)

`home` Home · `GL-017` Analyze landing · `GL-035` Studio landing · `GL-069` **Discover feed** · `GL-117` **Profile overview** (Consumer tabs). `GL-132`/`GL-118` (creator profile, edit profile) were deliberately not used.

## Visual comparison method

`scripts/mobile-parity/compare.py`: SSIM, 7×7 uniform window, grayscale at 780×1688 (2× the 390×844 design viewport), masking only OS chrome (status bar, home indicator, device-frame corners). Target ≥ 95%. It is a project target, not proof of pixel parity; a structural/branding difference fails a screen regardless of score. The reference is rendered with the same bundled font files as the app. The Android emulator is resized to 1080×2337 (the design's aspect); iOS uses the simulator's native aspect and the script records the aspect distortion.

Dart-engine renders (`test/tool/render_screens_test.dart`) exist only to iterate quickly; they are **not** native evidence.

## Status rules

A screen is `VISUALLY VERIFIED` only with an actual native iOS/Android screenshot comparison from CI. Source code, a green build or widget tests never set that status. See `BATCH_0_1_RESULT.md`.
