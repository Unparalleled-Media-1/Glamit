# Batch 4 — all remaining screens, light theme and Android layouts

All 232 reference screens (plus the design-system board) now have a Flutter implementation in `apps/glam_mobile`.

| Group | Count | How |
|---|---|---|
| Consumer tabs (Home, Analyze, Studio, Discover, Profile) | 5 | hand-built, real widgets (Batch 1) |
| Analyze path GL-018/019/020/023/024/025 and GL-026–034 | 15 | hand-built over the real private-analysis logic (Batches 2–3); skin/hair/routine honestly "not available yet" |
| Everything else | 212 | generated from the design's resolved layout and rendered by `lib/screens/design_render.dart` with real Flutter widgets (see `scripts/design-extract/README.md`) |

Variants: dark and light theme × iOS and Android, chosen from the system theme and platform. Chip groups and switches keep local state; every control navigates to the destination the design defines (aliases from the design's `ALIAS` map; ids that belong to the hand-built Analyze flow open the real screens).

## Verification
- `flutter analyze`: no errors/warnings. `flutter test`: 61 pass — every registry id except exactly the 21 hand-built ones (5 tabs, design-board marker, 15 Analyze ids) is present in the generated data in all four variants (an earlier version of this test wrongly counted GL-021 and GL-022 as covered; both are now generated); every generated screen renders without exceptions at 360×740, 390×844 and 430×932 in all four variants.
- Pixel comparison of every generated screen against a browser render of the design (Liberation Sans/DejaVu stand-in fonts): mean abs difference 3.2–5.8 / 255 per variant. Largest differences are timing/state in the design itself (screens that pick a random item or load a sponsored slot after a delay) and the device chrome (notch, home indicator, status bar) that the OS draws on a real phone.
- Symbols: DejaVu Sans is bundled as `GlamSymbols`; five symbols no redistributable font carries (⌖ ⌕ ⎘ ⓘ ＋) are drawn as vectors.

## Not carried over / limits
- Generated screens show the design's sample content and are labelled "DESIGN PREVIEW · SAMPLE CONTENT · NOT LIVE". They call no backend; payments, merchant, creator, advertiser, admin and AI behaviours are **not implemented** — all remain REQUIRES BACKEND VERIFICATION.
- Interactions beyond navigation, chip selection and switches (carousels, steppers, sliders as inputs, timed/animated states, form submission) are static or local-only.
- Fonts: Georgia/Arial are system fonts; the pixel comparison used metric-compatible stand-ins, so real-device typography still needs the native screenshots.
- Native CI screenshots (Android emulator, iOS simulator) are the remaining parity evidence.
