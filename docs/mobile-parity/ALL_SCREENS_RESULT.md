# All 232 screens — implementation status (apps/glam_mobile)

Builds on the Batch 0/1 foundation (go_router shell, route table, fixtures, native parity CI). Verification columns in `SCREEN_PARITY.csv` stay `NO` until native iOS/Android CI evidence exists; nothing below is "visually verified".

| Group | Screens | Implementation |
|---|---|---|
| Consumer tabs | home, GL-017, GL-035, GL-069, GL-117 | Batch 1 hand-built shell screens |
| Analyze path | GL-018, 019, 020, 023, 024, 025, 026–034 (15) | hand-built over the real private-analysis logic; GL-021/022 are generated |
| Event dressing and themed events GL-057, 058, 059, 063, 067, 209, 210 (7) | on-device, user-entered event → dress code → three directions → deadline checklist (`lib/events/`, `lib/screens/event_dress.dart`) |
| Everything else | 205 | generated from the design's resolved layout (`lib/screens/design_render.dart`, data in `assets/screens/{dark,light}_{ios,android}.json.gz`, reproducible with `scripts/design-extract/`) |

Honest limits (REQUIRES BACKEND VERIFICATION for all backend behaviour):
- Skin, hair, hairstyle and routine screens say "not available yet": the analysis service returns face-feature/undertone observations only.
- Generated screens show the design's sample content, labelled "DESIGN PREVIEW · SAMPLE CONTENT · NOT LIVE"; no payment, merchant, creator, advertiser, admin or AI behaviour is implemented.
- Local state exists for chip groups and switches; carousels, steppers, form submission and timed/animated states are static.
- Local pixel comparison (Liberation Sans/DejaVu stand-ins, browser render of the design) averaged 3.2–5.8/255 per variant over all generated screens — a development aid, not parity evidence. Differences come mainly from design-side timing/randomised state and the OS chrome (notch, status bar).
- Symbols: DejaVu Sans is bundled as a fallback (`GlamSymbols`); ⌖ ⌕ ⎘ ⓘ ＋ are drawn as vectors because no redistributable font carries them.

- "See it on you" (a picture of the user in the outfit) is **not implemented**: it needs a generation service that does not exist yet. See `TRY_ON_REQUIREMENTS.md`; the app shows a "Not available yet" card and no image.
- "Where to buy / get makeup done" is guidance plus a search the user starts in their own maps app (`url_launcher`); GLAM names no business, price or stock (no verified merchant/professional directory is connected).
