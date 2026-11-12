# Batch 1 — five consumer tabs in `apps/glam_mobile` (Flutter)

Source of truth: `GLAM All Screens.html` (+ `ui_kits/mobile-v3/theme.css`, `ui.jsx`, `s1–s4.jsx`). Target: `apps/glam_mobile` only. `apps/mobile` and `apps/flutter_app` are untouched. No backend, Supabase, auth, AI or payment code was changed.

## What is built
| Design id | Screen | Flutter |
|---|---|---|
| `home` | Home | `HomeTab` |
| GL-017 | Analyze landing | `AnalyzeTab` → "Start analysis" opens the **existing** private Analyze journey (camera → consent → server analysis); "History" opens it and loads account history when signed in |
| GL-035 | Studio landing | `StudioTab` |
| GL-069 | Discover feed | `DiscoverTab` |
| GL-117 | Profile overview | `ProfileTab` |

Design layer: `lib/design/tokens.dart` (dark + light tokens from `theme.css`, Georgia/Arial type), `lib/design/widgets.dart` (sprite `Photo`, glass pill/circle, pill buttons, chips, cards, rows, scrim, iOS floating / Android flat tab bar). `lib/screens/screen_registry.dart` and `docs/mobile-design/SCREEN_MAP.csv` carry all 233 reference entries (232 screens + design-system board), generated from the design's own `window.SC`. Every destination not yet built opens a labelled placeholder that does nothing simulated.

## Deliberate deviations from the mock (all honesty rules from AGENTS.md)
- "12 credits" / "12 of 20 this month" are mock sample data. Batch 1 shows "✧ Credits" and "Balance unavailable — balances come from your account" until the entitlement API is wired.
- Look names, creator `@amarabeauty` and captions keep the design's "Illustrative" labelling; no ranking/score copy is added.
- The app follows the dark theme only for now; light tokens exist and are tested but the light theme is not switched on.

## Verification (what is and is not proven)
- `flutter analyze`: 0 errors/warnings (10 pre-existing lint infos). `flutter test`: 41 pass — incl. the 5 tabs on iOS and Android at 360×740, 390×844, 430×932 and text scale 1.0/1.5 with no overflow, and the registry count.
- NOT done here: real native screenshots. The Maestro flows now capture `00-tab-*` on both OSes in the existing CI; pixel comparison against the design must use those CI artifacts. Flutter's headless test font (Ahem) cannot judge typography, so no local pixel comparison is claimed.
- Open parity risks to inspect in those screenshots: unicode glyph icons (⌂ ◎ ✧ ⌖ ○ ♢ ⇄) may fall back to different system fonts on Android; Georgia is absent on Android (serif fallback); sprite crop/backdrop blur vs CSS.
- No physical-device, backend or store-signing evidence.

Stop point: Batch 1 awaits visual approval before any further screens.
