# Batch 1 — exactly what is evidenced, and how

Legend: **NATIVE** = actual installed app on an Android emulator / iOS simulator in CI. **WIDGET** = Flutter widget test (isolated, not a device). **NONE** = not evidenced.

| Aspect | Android | iOS | Notes |
|---|---|---|---|
| Five default screens, dark + light | NATIVE (CI capture) | NATIVE (CI capture) | 20 screenshots required; the workflow fails if any is missing |
| Tab switching, control routing, pending screens, Follow/Save toggles, tab-state retention | NATIVE (Maestro) + WIDGET | NATIVE (Maestro) + WIDGET | Maestro `interactions.yaml` |
| System Back from a pushed screen | NATIVE (`android-back.yaml`) | NONE | iOS swipe-back gesture not tested |
| Icons (glyph rendering) | NATIVE (visible in captures; reviewed by eye) | NATIVE (same) | Missing-glyph boxes would show in the screenshots |
| Safe areas | NATIVE (emulator resized to 1080×2337; real insets) | NATIVE (simulator insets) | Top/bottom areas are masked in the score |
| Gestures other than tap/back (scroll, horizontal carousels, drag) | NONE | NONE | |
| Loading, empty, error states | **WIDGET only** | **WIDGET only** | No native capture; `GLAM_REFERENCE_STATE` exists for a later native run |
| Fixtures disabled (release default) | WIDGET (leak test) | WIDGET (leak test) | No release binary is captured |
| Physical devices | NONE | NONE | |
| Typography vs real Georgia/Arial | NONE | NONE | See D3 |

Statuses in `SCREEN_PARITY.csv` are updated only from the CI results, never from this table alone.
