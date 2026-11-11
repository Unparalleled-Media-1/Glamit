# Native redesign preparation — 11 November 2026

**Later source inspection and current React Native planning:** the split source/artwork uploads have now been inspected. See [the React Native Analyze plan](REACT_NATIVE_ANALYZE_PLAN.md), [archive hashes](archive-manifest.json), and [232-route reconciliation](design-v3-route-reconciliation.csv). For this current React Native request the existing target is `apps/mobile`; `apps/glam_mobile` remains Flutter. The initial preparation below is preserved as historical evidence and its “ZIP not attached” statements describe the earlier task, not the completed split-upload inspection.

This is preparation and source mapping, not a redesign implementation or design approval. The user confirms the newer Flutter redesign exists as a ZIP in their possession. It has not been attached to this task, so its contents, screen names, provenance and native routes are unverified. No verified-screen claim is made about that ZIP.

## Authoritative implementation

| Path | Authority and current boundary |
| --- | --- |
| `apps/glam_mobile` | Current controlled Flutter Analyze restart; `lib/main.dart` enters `AnalyzeApp` / `AnalyzeJourney`; camera-first, native widgets and typed authenticated backend calls |
| `apps/flutter_app` | Preserved rejected F1 candidate; five go_router branches exist but are not the approved replacement or live functionality |
| `apps/mobile` | Preserved Expo/React Native implementation and regression reference; its runtime dependencies are repaired without changing application logic |
| `apps/web`, `docs/design-preview` | Web application and historical HTML/SVG design studies; neither is a native-screen substitute |

Authority comes from `docs/specification/sources/2026-11-controlled-flutter-restart.txt`, `docs/implementation/batches/ANALYZE_RESTART/PLAN.md`, and the later `ANALYZE_HISTORY/PLAN.md` / `RESULT.md`. The earlier five-screen Flutter sequence was superseded by Analyze-first acceptance and review. The root AGENTS file retains older Expo/native instructions; those must be read with these later scoped directives. Nothing here deletes or replaces an existing application.

The current Flutter flow uses a nested `Navigator` with page keys `camera` and `analyze-flow`; it does **not** expose a five-tab named-route registry. Controller phases select capture, photo review, consent, processing, report and history. iOS uses Cupertino pages and Android Material pages. `SignInSheet` and correction sheets use root native bottom sheets. Do not describe hypothetical `/home`, `/studio`, `/discover` or `/profile` routes as implemented in this app.

## Design and artwork inventory

| Requested material | Located evidence | Limitation |
| --- | --- | --- |
| New Flutter redesign ZIP | User confirms they have it | Not attached or present in accessible workspace project/shared/download locations; exact archive name and contents unknown |
| Brand artwork | `docs/branding/original-assets.json`; `apps/mobile/assets/brand`; `apps/flutter_app/assets/brand`; `apps/glam_mobile/assets/brand/app-icon.png` | Original icon/favicon/wordmark copies match recorded SHA-256 hashes; only the icon is bundled in the controlled app |
| Historical editorial imagery | `docs/design-preview/assets/{editorial,products}.webp`, `provenance.json`; old Flutter editorial assets | Illustrative generated artwork; never personal results, inventory or evidence of a new redesign |
| Design tokens | `docs/design-preview/tokens.json`, `packages/product/consumer-design.json`, `apps/web/app/golden-tokens.css`, `apps/flutter_app/lib/app/theme.dart` | Historical sets; do not automatically adopt them as the missing ZIP's tokens |
| Current mobile design | `apps/glam_mobile/lib/presentation/design.dart` | Independent native chrome, 48-point minimum actions, dark/cream/rose/blush values; not ZIP verification |
| Screen registry | `docs/design-preview/screen-catalog.json`: 71 consumer, 8 web, 54 business/admin families | All are historical proposed studies; not 133 accepted or implemented native screens |
| Screen assets | `docs/design-preview/figma-ready/screen-families/*.svg`, captured `frames/`, HTML prototype | All 133 catalog IDs have SVG studies present; no native implementation inferred from a file |
| Navigation export | Historical `information-architecture.json`; rejected Flutter `lib/app/app.dart`; current `main.dart` | No new redesign navigation export located. Old IA includes Shop and conflicts with later Home/Analyze/Studio/Discover/Profile target |
| Figma handoff | `docs/design-preview/figma-ready/handoff-manifest.json`, starter SVGs, components | Five referenced starter SVGs exist. Manifest explicitly states no native Figma file/import verification; no `.fig` archive located |

The [historical screen map](historical-screen-map.csv) accounts for every one of the 133 existing catalog IDs. It identifies current native correspondences only where source supports them, marks missing routes/components, carries the catalog's proposed backend domain, and lists actual native endpoints where present. A correspondence is not acceptance of that screen's appearance, complete feature parity, or successful live integration. Web/business entries remain separate; merchant/admin screens are not silently ported into the consumer app.

The newer ZIP must be inspected before a verified redesign-to-native map can be completed. Inventory its files and hashes first; review archive paths before extracting into a separate staging directory. Do not run bundled scripts or overwrite any app. Identify Flutter source, image/font licenses, token definitions, screen registry, route definitions, responsive states and service stubs. Map each actual screen to the controlled app's route/component/API, explicitly labeling new work and unsupported capabilities. Preserve supplied artwork exactly where authorized. Never reuse embedded browser content as a native screen.

## First five native screens proposed

These are refinements of the existing Analyze vertical slice, subject to the missing ZIP's design inspection. They are not five new tabs and do not authorize broad implementation.

| Order / native screen | Existing route/component to refine | Real dependency and acceptance |
| --- | --- | --- |
| 1. Analyze camera and gallery | Root `camera` page; `CameraSurface`, `analysis/photo_source.dart` | Native camera permission/preview/capture; real OS picker; denial/cancel/fallback, no upload before consent |
| 2. Private photo review | `analyze-flow`, phase `photo`; `PhotoReview`, `PrivatePhoto` | Bounded normalized image, retake/back, metadata removal, app-private cleanup and background privacy |
| 3. Account and consent | `SignInSheet`; phase `consent`, `ConsentScreen` | Original Supabase email session/server identity; GET permissions/media/analysis status; current policy text and two explicit consent grants |
| 4. Upload and analysis progress | Phases `uploading`, `submitting`, `processing`, `uncertain`, `stopped`; `_status` and `AnalyzeController` | POST media intent, PUT private content, POST/GET durable analysis job, explicit ambiguity recovery/cancel; no automatic billable retries |
| 5. Results, corrections and Passport | Phase `report`; `ReportScreen`, correction sheet; history/reopen follow-through | Corrected-report GET, corrections POST, revision-checked canonical Passport GET/PUT, account history and authenticated private-photo reload |

Follow-through uses `AnalysisHistory` at phase `history`, GET `/v1/analysis/jobs`, owner-scoped metadata/content and fresh-session recovery. It must not be replaced with a local saved-results list. Separate skin/hair analysis is not present in current result contracts and must not be fabricated. After the first real Analyze journey and design approval, the eventual primary destinations remain Home, Analyze, Studio, Discover and Profile, with contextual Advisor and backend/RBAC gates. Their final visual mapping awaits the ZIP.

## Android and iOS verification

Current local changes affect only dependency manifests/lockfile and recovery/preparation documentation. No Flutter source changed and no new native binary/device checks ran here. Flutter/Dart, adb/emulator and Xcode tools are absent. Historical `ANALYZE_HISTORY/RESULT.md` records run `42849509362` at `df4f22cb4d2c587cb86bd8cac87a0fe4ffa18871`; those retained receipts were read, not rerun or independently replayed in this task.

Use `.github/workflows/flutter-analyze-restart.yml` and `scripts/analyze-restart` with official Flutter 3.47.9. Retain exact source/SDK/generated native inputs and one resolved dependency lock shared across both platforms. Run Flutter analysis, contract/privacy/layout tests, then independent native builds and installed OS-driven journeys. Verify the actual app ID `com.glambeauty.analyzereview` before installation; do not overwrite an account-bearing installed app inadvertently. This is a local review identifier, not proof of a registered store identity.

- Android: install and exercise the actual x86_64 emulator APK, camera prompt/preview/capture, library source and denied permissions, Android back, keyboard, rotation/text scaling/accessibility. Compile/signature-check ARM64 separately, then install and exercise it on a physical Android phone. An unrun ARM64 APK remains untested.
- iOS: macOS/Xcode native build and simulator installation, actual OS library selection and cancellation, camera-unavailable fallback, native swipe-back, sheets/keyboard/safe areas and accessibility. Verify real camera/permission behavior and privacy on a physical iPhone with an appropriately signed device build; a simulator `.app` is not an IPA/TestFlight acceptance.
- Each OS independently: real authenticated photo → private upload → durable analysis → corrections → canonical Passport → force-stop/relaunch → fresh-sign-in and account reopen. Record actual job/media/report/revision IDs and redacted owner/session checks; retain native screenshots/video and command exit outcomes.
- Each OS independently: withdrawal during picker/upload/analysis; interruption and network loss; expiry; account switching and late responses; duplicate submissions and correction conflicts; delete/cleanup failures and retries; regrant without resurrection; background/app-switcher privacy and no private photo/token leakage. Loading/error/denial states must remain truthful.
- Separate signing, store registration, physical hardware, live-provider qualification, visual approval, security and public-release gates. Component tests, browser checks and Expo JS exports close none of these gates.

## Remaining blockers and preserved rules

The new Flutter ZIP is needed to verify the requested redesign assets and exact screen mapping. The platform draft cannot be read, so configuration registration/publication remains blocked without changing the original. Native toolchains/runners and physical devices are required for new installed evidence.

The last recorded remote readiness inspection (10 November, historical only) found the canonical photo/analysis schema absent in the original Supabase target and its active Edge function incompatible with the FastAPI photo routes. This task made no fresh production/network-provider inspection or changes. The current cloud machine also has no native public build settings or authorized test identity injected. A qualified non-production canonical API, approved schema, real Auth identity, private storage/current policies/eligibility, worker and provider data qualification are prerequisites for live acceptance; credentials alone cannot supply missing operations. Deliver credentials securely, never in documentation/chat.

Preserve original Supabase project `bkkmsbxrxkqaveymcrgi`, session/owner fences, purpose-specific consent, organization RBAC and canonical `db/migrations` history. Keep all pending production migrations (0014–0017), production data, live provider activation, payment operations and deployment under their existing explicit approval gates. The commission remains server-calculated 10% on completed discounted physical-item value with existing per-line rounding; separate shipping, tax and processing fees stay outside its base. No affiliate/service rate is invented. No WebView, simulated analysis or reference portrait substitutes for the native authenticated journey.
