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

## Responsiveness: emulator instability vs app performance

The 20-second Maestro wait exists only to survive infrastructure stalls; it must not hide a slow app. The run therefore records and publishes:

* **Cold start to interactive** (process start, engine, first frames, image decode) per flow, from Maestro's own command durations.
* **Time to visible** for every navigation target, and every **failed command** (a lost tap or missing target is reported, never silently retried away).
* An **emulator baseline** measured the same way: Android `am start -W` of the stock Settings app and of the app; iOS wall-clock `simctl launch`.

`perf.md` / `perf.json` list SLOW flags (navigation wait > 3 s, cold start > 8 s). Those thresholds are reporting aids, not pass/fail: the owner judges them. Earlier Android data (superseded run `eb3bf68`, same app code): cold start 4.3–5.1 s on a software-GPU emulator; Studio target visible 72–114 ms after the tab tap in the capture flow, while the interaction failure was a **lost first tap**, not slow rendering. No application behaviour was changed to make automation pass; only test flows and scripts changed.
