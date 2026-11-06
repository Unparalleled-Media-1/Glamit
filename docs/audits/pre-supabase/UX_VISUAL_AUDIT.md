# UX visual and interaction audit

Approved direction is preserved: dark premium Home, Face Analysis and AI Studio; light luxury Shop/Product Detail; existing typography/editorial imagery, rounded elements and pink accents. This audit did not redesign or change the application. Prior visual direction approval is not functional release acceptance.

| Pattern                 | Available evidence                                                                        | Acceptance limitation                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Home                    | Desktop/mobile Chromium screenshots; approved comparison 0 difference                     | First-use and returning behavior tested; actual native tasks pending            |
| Face Analysis           | Photo/consent/technical review/uncomputed/error states; approved comparison 0             | Real user-specific provider analysis unverified                                 |
| AI Studio               | Interactive selections, history/reset and references; approved comparison 0               | Render fidelity, true before/after and exact-shade accuracy unverified          |
| Shop                    | Light editorial browsing and honest unavailable offers; approved comparison 0             | Real local verified inventory not connected                                     |
| Product Detail          | Light editorial detail and verified-contract boundary; approved comparison 0              | Merchant stock/variant/delivery/cart/payment actual journey blocked             |
| Personalized AI Results | Sixth pattern with uncertainty, editable corrections and Studio handoff; browser captures | Visual/function approval pending; double-backed results are not a live analysis |

The golden check verifies 28 capture dimensions at iPhone-sized, Android-sized, tablet and desktop viewports. Twenty approved comparisons all have zero changedFraction. Viewport names do not imply actual iOS/Android devices. Existing 18 recordings cover six patterns across browser desktop and phone-size modes; their manifest explicitly flags native iOS/Android BLOCKED. Recording files predate this audit; regression comparisons establish preserved screens, not new native recordings.

Browser regression covers 320–1920px, five fixed destinations(Home, Analyze, AI Studio, AI Advisor, Profile), scroll reachability/bottom navigation clearance, focus restoration, reduced motion, denied switching, upload/deletion, empty/loading/offline/error behavior and destination/packing continuity. Safe-area CSS and native layout still need actual notched-device/orientation/keyboard testing. No claim of WCAG certification or screen-reader task completion is made.

Required manual/native evidence: all six patterns on actual supported iOS/Android with OS/build identifiers; VoiceOver/TalkBack, dynamic text, zoom, contrast/touch targets, camera permission denial, keyboard/fixed-nav clearance, orientation, long results and slow/error recovery; measured task completion and comprehension. Do not replace approved colors/layout to satisfy unmeasured preferences.

- [Desktop contact sheet](../../application-preview/golden-desktop-review.html)
- [Phone contact sheet](../../application-preview/golden-iphone-review.html)
- [Screenshot/result manifest](../../application-preview/test-results.json)
- [Approved pixel report](../../application-preview/golden/approved-regression.json)
- [Existing recording manifest](../../application-preview/recordings/manifest.json)
- [Interactive preview instructions](../../application-preview/interactive-preview.md)

These are actual browser artifacts and honest blocked states. They do not prove live AI, booking, payments, stock or product-matching accuracy.
