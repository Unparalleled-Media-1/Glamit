# Native reskin checkpoint — implementation in progress

11 November 2026. Review branch: `feat/native-reskin-v3`, based on preserved Capture commit `7ad9c01e1f0553a8eb153da3d0fa96950c6b1a16`. The latest [master request](REQUEST.md) supersedes the earlier Capture-only implementation scope. The target remains **`apps/mobile` (Expo / React Native)**. Recovery commits `96ff8ff`, `dac5a34` and the Capture branch are preserved. No default-branch merge or production action was performed.

**The 232-screen reskin is not complete.** This checkpoint implements native foundations and connected consumer/Analyze/beauty controls, retains existing domain journeys, and records every remaining design screen. There are 150 IDs whose design-specific UI remains missing and whose route currently presents an explicit dependency gate. The other 82 IDs map to shared new/modified or existing native compositions; these are not 82 independently finished screens. None has passed installed-platform or measured visual acceptance.

## Concrete application changes

- A React Navigation native stack, native shared brand/message chrome and five approved consumer tabs. Capture retains its full-screen boundary. Native focus now prevents an inactive Capture camera/back handler or hidden analysis screen from intercepting the active journey.
- Central dark/light v3 tokens, final dark button/error overrides, reusable RN typography/buttons/cards/rows/safe-area pages, exact supplied sprite geometry and native gradients. Theme choice currently lasts for the running session. Android uses a system-serif fallback because the package contains no licensed Georgia font file; exact typography is unverified.
- Native Home, introductory screens, Profile, destination search, editorial Discover shell and permission/error handling. The search does not pretend to search disconnected products/creators. Public feed data and distinct onboarding/auth stage layouts remain incomplete.
- Preferences integrate existing opt-in `Journey` device metadata; saved written looks use the original `saveLook` contract. These are not canonical profile identity or generated images. Existing account/OTP/PKCE/biometric logic remains intact, with themed styling.
- Capture hands its app-owned photo lease and supported goals to a real RN Review screen. Review shows the actual selected image and dimensions/size, supports cleanup/retake and does not upload. No sample image is a selectable personal photo. Crop/rotation, normalization/metadata stripping and actual lighting/face/filters evaluation remain missing.
- Separate native consent, Progress, report/correction, account history and canonical Passport controls reuse the existing private-media and analysis operations. Grants come from current server policies and eligibility, storage is honestly required for the supported durable operation, and upload is explicit. There is no fabricated result, timed success or unsupported skin/hair/full-body service.
- Original upload/job idempotency keys are retained for explicit retries of the same active request after ambiguous responses. Polling is bounded, stops on read errors/inactive screens and distinguishes stopping a local wait from confirmed server cancellation. Owner/token/photo/privacy/foreground changes reject stale work. Withdrawal starts after photo-scope reset so cleanup does not abort its own request. Cleanup failures remain visible and retryable. This is not a claim of process-death submission recovery or live-provider acceptance.
- Native Studio entry and reusable beauty workbench implement actual shade/finish/written direction selection and carry the direction to the existing outfit brief. Live rendering, hair segmentation and generation remain disabled with reasons; no fictional try-on result or credit balance is displayed.
- Existing wardrobe/routine, Advisor, destination, contextual marketplace, offer/cart/checkout/order, creator private drafts and local merchant Snap & List tools remain reachable. Product and offer routes are distinguished so navigation cannot switch a product detail into an unrelated offer. Existing legacy compositions still require their v3 screen-specific styling.
- Account/private-photo management is reachable from Security & Privacy. Workspace selection lists verified account memberships and never grants a role or live merchant listing. Creator/publication/affiliate/finance dashboards are not inferred from the private-draft composition.

## Design-to-native evidence

[screen-parity-matrix.md](screen-parity-matrix.md) contains all 232 design IDs plus DS, registered native route, implementation classification, known functional boundary and independent visual/platform status. `apps/mobile/reskin/registry.json` holds the matching runtime catalog and source annotations. Capture type/goals/preparation/camera/gallery are states of one private lifecycle, not separate services. Auth, report, beauty and creator variants sharing a component are explicitly identified as shared compositions, not full screen parity.

All needed v3 HTML/JSX screen definitions and the 11 artwork files were found; no newer Flutter project is required. The approved package supplies Georgia/Arial names but no bundled fonts. Licensed font assets or an approved platform mapping, real native screenshots and live qualified service evidence remain necessary for exact visual acceptance.

Reference screenshots, gallery/report generation and exclusions are documented in [VISUAL_EVIDENCE.md](VISUAL_EVIDENCE.md). HTML reference images are never installed-app evidence. With no native captures, every current comparison is blocked; there is no measured 95% similarity claim.

## Validation

| Check | Result / limit |
| --- | --- |
| Full current backend/tool regression | 402 passed on isolated local PostgreSQL `glam_test`; original API/Auth/finance contracts retained |
| Final focused backend/visual-tool checks | 4 passed, including actual native component → isolated HTTP/API/PostgreSQL Passport bridge for both platform ports; OS/provider doubles remain explicit |
| Capture | 40 component scenarios, plus SDK/plugin checks; includes stale focus/back-handler fencing and shared Review lease ownership; OS/camera/filesystem are doubled |
| New reskin/session tests | Both platform configurations pass Home/Profile/search/theme, Review/Consent/Progress, preferences, beauty directions/saved briefs, no implicit processing, original-key retry, withdrawal race, background/account fencing and cleanup retry |
| Existing native tests | Photo handlers, private-photo library, Advisor and Auth gate/contracts pass with explicit OS/network ports |
| TypeScript | All mobile/web workspaces pass |
| Client / web regressions | 13 client tests and 12 web application groups pass; web evidence is separate from native acceptance |
| Frozen install / Android generation | 567 packages installed with the committed lockfile and no legacy peer override; Android prebuild succeeded in an isolated snapshot; not a compiled binary |
| Expo / runtime | SDK dependency compatibility and single React-instance checks pass; React remains 19.3.0, no permanent legacy-peer-deps workaround |
| Native JavaScript exports | Android/iOS Hermes bundles export successfully; this is not APK/IPA compilation |
| Web production build | Pass; no deployment |
| Ruff / configuration | Ruff and existing native production/configuration guards pass |
| Android native binary | Exact baseline compilation failed at blocked React Native AAR download; no APK produced |
| iOS / physical devices / native screenshot comparison | BLOCKED / not executed |

Source/port tests do not certify installed platforms, actual signing, camera hardware, real photo-picker/permission interfaces, production providers, payment acceptance or launch readiness. Test-generated web/Stripe evidence was restored to its pre-run tracked content; it is not mixed into native deliverables.

## Remaining work and blockers

1. Allow `repo.reactnative.dev` and `api.github.com` in cloud environment settings; the current draft-save tool is unavailable. Native compilation and Actions inspection/dispatch are blocked by actual HTTP 403 responses. See exact command, SDKs, log, permissions and installation instructions in [NATIVE_VERIFICATION.md](NATIVE_VERIFICATION.md).
2. Build/install this branch independently from the immutable Capture baseline, inspect compiled CameraView in the binary, and execute actual emulator/simulator and physical-device privacy/permission/picker/navigation cases. This Linux runtime has no Xcode or iPhone signing/devices; software Android startup did not establish installed-app acceptance.
3. Finish the 150 missing design-specific screens, distinct shared-screen variants, legacy journey reskins, exact typography/icons/spacing/chrome, theme persistence and applicable loading/empty/error states. An unavailable gate is a gap, not a finished replacement. Distinct Auth stages, full Review editing, report presentation, beauty/category layouts and commerce/service/role detail screens still need substantial UI work.
4. Qualify original authenticated API/provider/private-storage integrations against isolated test identities, and prove process relaunch, consent/deletion races, account reopening and ambiguous-operation recovery. Current session-key reuse is not durable recovery. Never run provider acceptance against production records to fill this evidence gap.
5. Rendering/generation, qualified public feeds, advanced search, inclusive hair/skin/full-body services, subscriptions/credits, bookings, publication/affiliate payouts and role dashboards require their existing contracts/capabilities and release gates. No API keys alone can replace missing operations or authorization. The preserved legacy marketplace does not make every new commerce design functional.
6. Capture matching native screenshots, run the defined comparison protocol, correct differences and obtain human visual review. Zero screens are visually accepted at this checkpoint. Existing full-journey native automation also needs selector/navigation reconciliation before it can certify the reskin.

No Flutter changes, WebView core screens, alternate app, production schema/Auth policy change, Stripe/payment activation, financial calculation change, store submission, merge or deployment is included. The 10% item commission remains server-owned and unchanged, with the original discount/shipping/tax/fee boundaries and release restrictions.
