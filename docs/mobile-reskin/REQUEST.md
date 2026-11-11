# CODEX MASTER TASK — GLAM BEAUTY 1:1 NATIVE MOBILE RESKIN

## OBJECTIVE

Implement **100% screen-by-screen visual parity** between the existing GLAM Beauty mobile application and the approved **GLAM Beauty Mobile Design System v3**.

This is an **implementation task, not another design exercise, prototype, audit-only exercise or website conversion**.

The finished deliverable must be a real, installable iOS and Android application whose screens reproduce the approved design as faithfully as technically possible.

### SOURCE OF TRUTH

Use the attached design artifacts:

1. **GLAM Beauty — All 232 Screens** (`index.html` and associated design resources).
2. **GLAM Beauty — Handover v3** (`Handover.html`).
3. All accompanying design-system files, screen components, assets, icons, specifications and navigation definitions.

The approved design overrides the current mobile application's visual styling wherever there is a discrepancy.

The existing application remains authoritative for backend integration, security, permissions, business rules and working functionality.

Do not invent a replacement design.

---

## 1. MANDATORY NATIVE IMPLEMENTATION

Target the existing mobile application in `apps/mobile`.

Use Expo / React Native and genuine native-compatible components.

**Strictly prohibited:**

- WebView-based application screens.
- Embedded HTML reproductions of the design.
- Repackaging the website into an APK or IPA.
- Browser-style layouts presented as native screens.
- Screenshot images substituted for functioning interfaces.
- Placeholder buttons and nonfunctional navigation.
- Rebuilding the application from scratch unnecessarily.

Preserve working native Capture functionality, camera permissions, photo selection and privacy protections.

If the repository contains multiple mobile implementations, identify the canonical application and avoid developing a disconnected third version.

Do not migrate to Flutter unless a specific technical blocker is demonstrated and approved.

---

## 2. EXACT VISUAL PARITY

For every applicable screen in the approved 232-screen registry, reproduce:

- Layout hierarchy and component placement.
- Typography, font weights, sizes and line heights.
- Backgrounds, gradients and brand colors.
- Buttons, cards, borders and corner radii.
- Icons, illustrations and photography.
- Spacing, margins and padding.
- Navigation bars and bottom tabs.
- Shadows, overlays and modal treatments.
- Form fields and input states.
- Loading, empty, error and success states.
- Light and dark themes.
- iOS and Android platform variations.

Do not replace the approved visual language with generic React Native UI components or an alternative design system.

Use reusable native components and centralized design tokens without sacrificing screen-level accuracy.

Account for safe areas, screen dimensions, keyboard behavior and accessibility.

---

## 3. COMPLETE SCREEN INVENTORY

Extract the authoritative screen registry from the design artifacts.

Create:

`docs/mobile-reskin/screen-parity-matrix.md`

Include these columns:

| Field | Description |
|---|---|
| Design ID | Exact design registry ID |
| Screen name | Approved screen title |
| Native route | Actual application route |
| Implementation | Existing, modified, new or not applicable |
| Visual parity | Pass / fail / not tested |
| Functional parity | Pass / fail / not tested |
| iOS verification | Pass / fail / not tested |
| Android verification | Pass / fail / not tested |
| Evidence | Screenshot and test reference |

Do not assume that all 232 design entries are independent navigation routes. Classify screens, variants, states and design-system entries correctly.

**No screen may silently disappear from the matrix.**

---

## 4. IMPLEMENT THE COMPLETE MOBILE EXPERIENCE

Cover every applicable consumer-facing journey, including:

- Splash and onboarding.
- Authentication and account creation.
- Home and discovery.
- AI beauty and style analysis.
- Native camera Capture.
- Photo Review and consent.
- Analysis progress.
- Analysis results and Style Passport.
- Makeup and hairstyle experiences.
- Personal styling and outfit recommendations.
- Beauty routines and tutorials.
- Product discovery and shopping.
- Merchant and professional discovery.
- Salon and professional bookings.
- Creator and affiliate experiences where applicable.
- User profiles, settings and notifications.
- Checkout, payments and order history.
- All associated modal, error, loading and empty states.

Implement the exact approved designs rather than creating visually similar substitutes.

---

## 5. PRESERVE EXISTING FUNCTIONALITY

This is a **reskin with functional integration**, not a destructive rewrite.

Do not break or replace:

- Supabase authentication and database integrations.
- Existing APIs and backend contracts.
- User accounts and role-based permissions.
- Camera and image privacy protections.
- AI analysis workflows.
- Marketplace operations.
- Stripe payment integration.
- GLAM Beauty's 10% platform commission.
- Booking, order and transaction records.
- Existing security policies.
- Admin and merchant workflows.

Do not change production schemas, financial calculations, payment routing, secrets or deployment infrastructure without explicit approval.

Where a design requires functionality that does not yet exist, implement it against the established architecture when safely possible. Otherwise document the dependency and clearly distinguish it from completed work.

---

## 6. SCREENSHOT-BASED PARITY TESTING

For each screen:

1. Render the approved reference design.
2. Render the corresponding native screen.
3. Capture screenshots at matching viewport dimensions.
4. Compare both screenshots side by side.
5. Produce an image-difference report.
6. Correct visual discrepancies.
7. Repeat until the screen satisfies the acceptance criteria.

Use a consistent reference device and viewport for comparisons.

Measure visual differences, including spacing, typography, component geometry and color.

Target at least **95% automated visual similarity**, where the metric and exclusions are explicitly documented. This numerical target does not override human review of obvious mismatches.

Exclude dynamic personal data, camera imagery and platform-owned system chrome only where justified and recorded.

Screenshots from a web preview do not count as native-device evidence.

---

## 7. REQUIRED DEVICE VALIDATION

Build and test the actual application on:

**Android:** An installable development APK or equivalent native test build.

**iOS:** A native simulator or device build, using the available signing and build infrastructure.

Verify:

- Real native navigation.
- Real camera functionality.
- Permission prompts.
- Photo picker.
- Keyboard interactions.
- Safe-area handling.
- Back navigation.
- Scroll behavior.
- Modal presentation.
- Performance and rendering.
- Network and API integration.
- Authentication persistence.

Do not mark a platform as verified without executing its tests.

If device infrastructure is unavailable, explicitly mark device verification as blocked rather than reporting success.

---

## 8. IMPLEMENTATION STRATEGY

Work in controlled, independently testable batches.

**Batch A — Foundation**

- Extract design registry.
- Audit existing native routes.
- Map design IDs to routes.
- Establish typography, tokens, assets and reusable components.
- Implement shared navigation chrome.

**Batch B — Core consumer experience**

- Splash, onboarding and authentication.
- Home, discovery and navigation.
- Profiles and settings.

**Batch C — AI analysis**

- Capture.
- Review.
- Consent.
- Progress.
- Results.
- Style Passport.

**Batch D — Beauty and styling**

- Makeup, hairstyles and virtual try-ons.
- Personal styling.
- Routines and recommendations.

**Batch E — Marketplace and services**

- Product discovery.
- Merchant listings.
- Shopping and checkout.
- Salon bookings.
- Creator-related mobile journeys.

**Batch F — Remaining states and verification**

- Remaining design-registry coverage.
- Theme and platform variants.
- Screenshot parity.
- End-to-end regression tests.
- Native installation testing.

Each batch must leave the application buildable and must not regress previously completed screens.

Do not stop after producing the foundation or a few sample screens.

---

## 9. DEFINITION OF DONE

The reskin is complete only when:

- Every applicable design entry has a documented native implementation or justified classification.
- Every implemented screen uses the approved visual design.
- Native routes and navigation work.
- Existing backend functionality remains intact.
- No WebView or website wrapper is used for core screens.
- Automated tests pass.
- Native Android and iOS builds have been produced and tested, or outstanding platform verification is explicitly reported as blocked.
- Screenshot comparison evidence is available.
- No unresolved critical visual or functional regressions remain.

### REQUIRED FINAL DELIVERABLES

1. Updated native mobile application source.
2. Screen-by-screen parity matrix.
3. Reference-versus-native screenshot comparison gallery.
4. Visual difference reports.
5. Functional regression report.
6. Android build artifact and iOS build evidence, where infrastructure permits.
7. Exact commit hashes.
8. Remaining gaps and blockers.

### EXECUTION DIRECTIVE

**Start implementing immediately after validating the design artifacts and repository.**

Do not respond with another theoretical implementation plan.

Do not claim completion based solely on TypeScript compilation, mock tests, web previews or generated screenshots.

Do not alter production services or financial infrastructure.

**The approved design is the visual contract. The existing backend is the functional contract. The installed native application is the final product.**

Begin with Batch A and continue through the implementation batches, reporting completed work and evidence at each checkpoint.
