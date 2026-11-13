# Batch 0 + Batch 1 — plan and result

**Starting commit:** `f1fedc7` (`feat/platform-foundations`, PR #62 merged). **Branch:** `claude/adoring-lamport-mfe70f`.
**Scope:** screen IDs `home`, `GL-017`, `GL-035`, `GL-069`, `GL-117`; dark/light; iOS/Android presentation; default state natively.
**Target files:** `apps/glam_mobile/lib/{design,shell,screens,data}`, `main.dart`, `pubspec.yaml`, assets, tests, Maestro flows, CI workflow `.github/workflows/flutter-parity-batch1.yml`.
**Expected visible change:** the app opens on a five-tab consumer shell matching the design instead of the camera-first Analyze screen. The working camera-first analysis remains reachable (GL-018 interim entry).

## Status after local work (no CI evidence yet)

| Check | Result | Where |
|---|---|---|
| Design extraction (232 screens, tokens, assets, states) | DONE | `docs/mobile-parity/*` |
| Flutter implementation of the five screens | IMPLEMENTED | `apps/glam_mobile/lib/screens` |
| `flutter analyze` (Flutter 3.47.9) | 0 errors/warnings; 10 pre-existing infos in untouched files | local |
| `flutter test` (39 tests incl. navigation, state gates, text-scale) | PASS | local; isolated tests, not native evidence |
| Native Android/iOS screenshots, comparison scores | **PENDING — produced by CI** | see CI section |
| Visual approval | NOT GRANTED | requires owner review |

The independent statuses per screen are in `SCREEN_PARITY.csv`. Nothing is marked VISUALLY VERIFIED, IOS/ANDROID VERIFIED or APPROVED.

## Known deviations and gaps

See defects `PARITY-B1-001…009` in `docs/launch/DEFECT_REGISTER.csv` (fonts, Discover overlap fix, light-theme STUDIO title, large text, sample content, glyph icons, 639-link baseline, guest identity, interim analysis entry).

## Not done / blocked

* Backend connections for these screens (ads, events, feed, credits, identity): no confirmed contracts; fixtures are labelled and switchable.
* State variants (loading/empty/error) are implemented and widget-tested but not captured natively in Batch 1.
* Local environment cannot run an emulator or simulator; native evidence comes only from CI.
* Reconciliation of the 140-row feature matrix with the 232 design screens is not started (Batch 0 follow-up).
