# Native-first design review — UNAPPROVED

The user's [P0 directive](../../../specification/sources/2026-11-native-first-rejection-directive.md) is authoritative. The current Flutter UX is rejected. No existing screen is certified NATIVE-FIRST simply because it compiles, uses Flutter, or has a passing touch test.

The replacement inventory is [REPLACEMENT_SCREEN_INVENTORY.csv](REPLACEMENT_SCREEN_INVENTORY.csv). It covers all eight actual route patterns, every supported collection variant, route recovery, presented sheets and the explicitly required missing workflows. Its classifications reflect source gaps and the user's visual rejection, not independently reproduced production incidents. Framework navigation, safe-area handling, platform back transitions and useful widgets may be retained as components; retaining a component does not qualify a screen.

## Five representative candidates for review

The latest candidate source is `1b5aa123e2eae7df4734b1d32d994724dd3b44af`. The following actual installed Flutter captures are design-review material. They do not prove the real product operations requested in section5.

- [Android screens, recording and tested x86_64 emulator APK](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42771393011/artifacts/13742536192).
- [iOS screens, recording and simulator application — successful retry](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42771393011/artifacts/13743240362).
- [Exact verification run, attempt2](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42771393011/attempts/2).

Each successful package contains `01-home.png`, `02-analyze.png`, `03-studio.png`, `04-discover.png`, `05-profile.png`, an OS interaction recording, the tested review binary and runtime/source receipts. Android uses the Material NavigationBar; iOS uses CupertinoTabBar and Cupertino detail transitions. These are emulator/simulator builds. Physical-device usability is NOT TESTED.

This executor's enforced network policy still prevents downloading signed artifact URLs. No local visual inspection of these images or frame-by-frame recording review is claimed. Source-level differences below are not a substitute for comparing the actual candidates with the website and rejected builds. That visual comparison and the user's approval remain OPEN.

| Destination | Current representative composition | Mobile interaction proposal | Required real-operation work after approval |
| --- | --- | --- | --- |
| Home | Compact session actions, saved-look strip and image-led exploration; promotional hero/slogan removed | One-tap camera entry; resume a genuine session; compact recent activity | Existing authenticated user data, genuine recommendations and persisted recent activity |
| Analyze | Viewport guide, thumb-reachable shutter/source actions, separate mode/guidance accessibility nodes | Full-screen camera; swipe guidance; native photo-library choice and consent sheet | Actual camera/gallery, permission recovery, upload, face/skin/hair jobs, processing and personal results |
| Studio | Fixed large image canvas with comparison and reachable tool tray; brief entry uses a modal sheet | User photo/live canvas; gesture tools; expandable tool sheet; before/after; save/share | User-owned media, real try-on jobs, progress/retry/failure, durable save and native share |
| Discover | Edge-to-edge vertical feed, compact category controls and contextual bookmark/detail entry | Swipe content; tap through to look details; contextual save/try/book | Actual personalized content, verified products/professionals/creators, persistent saves and bookings |
| Profile | Compact identity area and grouped account/library rows; promotional Passport block removed | Native library/settings navigation; authorized workspace switch | Authentication, preferences, saved records, subscription, settings and full privacy lifecycle |

The current camera guide is not a camera. The monochrome reference is not AI try-on. Session-only bookmarks/briefs and local confirmations are placeholders, not saved account operations. The new directive requires replacing those with real authenticated backend operations after visual approval; they must not be reused as acceptance evidence for functional completion.

## Design acceptance checklist

Approval requires reviewing both OS variants of all five candidates against the website and rejected screenshots. Check compositions and gestures, not framework labels: thumb reach, immersive camera/canvas, safe areas, native sheets, Android back/iOS swipe-back, dynamic text, accessibility, tactile feedback, meaningful empty states and skeleton/loading designs for genuine pending operations. Test success cannot answer whether the appearance is sufficiently different.

Missing loading, permission, processing, error, report, generation and account states are explicitly inventoried. They are not assumed complete because one representative frame exists. No broader screen rebuild or live integration proceeds before the user's explicit approval of the representative designs.

## Verification boundaries

- Implementation: five renderable candidates exist; the inventory contains substantial PLACEHOLDER and MISSING operations.
- Functional verification: Dart analysis, eight widget tests and limited installed UI journeys pass. Authenticated photo→analysis→try-on→save/book workflows do NOT pass in Flutter and are not implemented by these local tests.
- Platform verification: separate Android emulator and iOS simulator UI evidence exists at the source above. Physical devices, store/signing distribution and full parity are NOT VERIFIED.
- Launch readiness: NOT ESTABLISHED. No merge, production migration, public deployment or live payment activation occurred.

The iOS first attempt failed during Maestro driver startup before the UI flow. The failed attempt is preserved; a targeted retry at the same application source and dependency inputs passed. Android passed in the first attempt. Do not use the earlier failed iOS artifact as the successful review package.

## Next gate

The exact user instruction is: “Do not proceed with the entire implementation until these five screens have been reviewed and approved.” The candidate remains UNAPPROVED. After approval, implement real operations through existing canonical backend/auth/data/financial contracts in dependency order. Where a backend operation is absent, implement that gap rather than treating local UI state or missing credentials as a complete operation. Preserve existing production and payment approvals separately.
