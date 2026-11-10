# GLAM BEAUTY — REJECT CURRENT MOBILE UI AND REBUILD AS A TRUE NATIVE-FIRST EXPERIENCE

**PRIORITY: P0 — MOBILE EXPERIENCE REBUILD**

The current Flutter Android and iOS builds are REJECTED from a UX perspective.

Although implemented using Flutter, the application still resembles the responsive website.

This is not acceptable.

## 1. NON-NEGOTIABLE REQUIREMENT

Do not convert, wrap, replicate or adapt the website interface into mobile screens.

Do not simply:

- Change CSS-equivalent styling.
- Reduce card widths.
- Rearrange website sections.
- Replace icons.
- Add a bottom navigation bar to existing web-derived layouts.
- Reproduce the current screens with different colours.

**Rebuild the mobile presentation layer around native mobile interaction patterns.**

Keep reusable backend APIs, authentication, business logic and data models where appropriate.

## 2. MOBILE INFORMATION ARCHITECTURE

Implement five primary navigation destinations:

**Home**

- Personalized beauty dashboard.
- Immediate camera/analysis entry point.
- Relevant recommendations.
- Compact, mobile-first content.
- No desktop dashboard layout.

**Analyze**

- Full-screen native camera experience.
- Face, skin and hair analysis.
- Photo-library selection.
- Processing and results.
- Personalized recommendations.

**Studio**

- Immersive makeup and hairstyle try-on.
- User photo or live camera as the primary canvas.
- Bottom-sheet controls.
- Gesture-based selection.
- Before/after comparison.
- Save and share.

**Discover**

- Full-screen editorial inspiration.
- Vertical swipe or native card browsing.
- Personalized looks.
- Relevant products, professionals and creators.
- Save, try and book actions.

**Profile**

- Saved looks.
- Beauty profile and preferences.
- Subscription.
- App settings.
- Account and privacy controls.

## 3. REQUIRED MOBILE DESIGN PRINCIPLES

- Use Flutter-native navigation and transitions.
- Use edge-to-edge layouts where appropriate.
- Use platform-appropriate safe areas.
- Use modal bottom sheets instead of desktop-style panels.
- Use gestures where they genuinely improve interaction.
- Keep primary actions reachable with one hand.
- Use large visual canvases for analysis and try-on.
- Use skeleton loading and meaningful empty states.
- Provide tactile feedback for important actions.
- Respect Android back navigation and iOS swipe-back conventions.
- Support dynamic text and accessibility.
- Never display browser-style layouts, website headers or desktop sidebars.

## 4. SCREEN-BY-SCREEN REPLACEMENT

Audit every existing Flutter screen.

Classify each as:

- NATIVE-FIRST — retain.
- WEB-DERIVED — redesign.
- PLACEHOLDER — implement.
- MISSING — build.

Produce a complete replacement screen inventory.

Do not count a screen as native-first merely because it uses Flutter widgets.

## 5. BUILD ACTUAL FUNCTIONALITY

The app must connect to the existing backend.

Camera, analysis, AI try-on, saved looks, authentication, subscriptions, discovery and bookings must perform their real intended operations.

Do not replace functionality with mock data, static demonstrations or local-only success messages.

## 6. DESIGN APPROVAL BEFORE IMPLEMENTATION

Before rebuilding all screens:

Produce five representative, fully designed mobile screens:

1. Home.
2. Camera/Analyze.
3. Studio.
4. Discover.
5. Profile.

Show Android and iOS variants.

The design must be visibly different from the responsive website and optimized for mobile use.

Do not proceed with the entire implementation until these five screens have been reviewed and approved.

## 7. ACCEPTANCE CRITERIA

The mobile app passes only when:

- Its information architecture is purpose-built for mobile.
- It does not visually resemble the responsive website.
- Core actions are designed for touch and gestures.
- Camera and AI experiences are immersive.
- Navigation follows native mobile conventions.
- Screens use real backend functionality.
- Android and iOS demonstrate equivalent core experiences.
- Physical-device usability tests pass.

Provide screen recordings of the actual installed Android and iOS applications.

**Do not claim success merely because the project compiles in Flutter.**

The required outcome is a genuinely mobile-first beauty application, not a website recreated using Flutter widgets.
