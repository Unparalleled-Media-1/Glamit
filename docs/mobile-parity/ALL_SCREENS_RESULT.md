# All 232 screens — implementation status (apps/glam_mobile)

Builds on the Batch 0/1 foundation (go_router shell, route table, fixtures, native parity CI). Verification columns in `SCREEN_PARITY.csv` stay `NO` until native iOS/Android CI evidence exists; nothing below is "visually verified".

| Group | Screens | Implementation |
|---|---|---|
| Consumer tabs | home, GL-017, GL-035, GL-069, GL-117 | Batch 1 hand-built shell screens |
| Analyze path | GL-018, 019, 020, 023, 024, 025, 026–034 (15) | hand-built over the real private-analysis logic; GL-021/022 are generated |
| Everything else | 212 | generated from the design's resolved layout (`lib/screens/design_render.dart`, data in `assets/screens/{dark,light}_{ios,android}.json.gz`, reproducible with `scripts/design-extract/`) |

Honest limits (REQUIRES BACKEND VERIFICATION for all backend behaviour):
- Skin, hair, hairstyle and routine screens say "not available yet": the analysis service returns face-feature/undertone observations only.
- Generated screens show the design's sample content, labelled "DESIGN PREVIEW · SAMPLE CONTENT · NOT LIVE"; no payment, merchant, creator, advertiser, admin or AI behaviour is implemented.
- Local state exists for chip groups and switches; carousels, steppers, form submission and timed/animated states are static.
- Local pixel comparison (Liberation Sans/DejaVu stand-ins, browser render of the design) averaged 3.2–5.8/255 per variant over all generated screens — a development aid, not parity evidence. Differences come mainly from design-side timing/randomised state and the OS chrome (notch, status bar).
- Symbols: DejaVu Sans is bundled as a fallback (`GlamSymbols`); ⌖ ⌕ ⎘ ⓘ ＋ are drawn as vectors because no redistributable font carries them.
