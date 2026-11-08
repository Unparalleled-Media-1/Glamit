# Native architecture — implementation findings

Observed 8 November 2026. Scope: the actual `apps/mobile` source and native build attempt, not another platform-wide audit. This answers the user's native-versus-browser question and bounds batch N1.

**A substantial genuine React Native UI exists, but the consumer application is not complete or independently verified on devices.** The earlier interactive HTML used `apps/web/components/GlamApp.tsx`; it was the wrong artifact for demonstrating native screens. It remains a design reference only.

| Area | Actual implementation | Exact remaining gap |
| --- | --- | --- |
| Entry/rendering | `index.ts` registers Expo's root; `App.tsx` renders `ConnectedApp` and `PersonalApp` using React Native View, ScrollView, Text, Pressable, Image, Switch, TextInput and Modal | No inspected mobile screen imports WebView, DOM controls or the web UI. Many native screens are partial/empty states, not completed operations |
| Navigation | Shared page reducer, native Pressable bottom tabs, slide Modal workspace switcher and ScrollView | No Expo Router/React Navigation navigator, native stack, Android BackHandler, gesture navigation or native-stack transition system. Tabs are Home/Analyze/AI Studio/AI Advisor/Profile; approved Home/Studio/Analyze/Discover/Me architecture is not yet implemented |
| Camera/photos | Expo ImagePicker launches actual camera/system image picker; local image/quality/consent screens are RN | N1 repairs reproduced stale-permission, concurrency, consent and cache ownership defects. Upload/result pipeline remains disconnected. No full-screen custom camera or device permission evidence |
| Authentication | NativeAccount/useNativeAccount, original Supabase SDK contracts, native S256 PKCE, cold `glamai://auth/callback` handling | Real provider activation, warm product links and secure web-to-app identity/destination transfer remain unverified or missing. Not every recovery/privacy operation is implemented |
| Secure sessions/biometrics | Expo SecureStore, protected refresh token, LocalAuthentication and background-lock lifecycle | Native doubles pass; no Face ID/Touch ID/Android biometric hardware proof, entitlement/signing or long-running device evidence |
| Consumer backend | Companion hooks accept an optional `CompanionConnection`; root `App()` supplies none | Analysis, generation, weather and marketplace requests are unavailable from the default app. This is integration code missing, not merely a missing key |
| Hosted account/creator APIs | Account/profile/routine/workspace loading calls original Supabase Edge API. CreatorStudio uses token-scoped creatorRequest and draft operations | Real live identity/tenant/persistence journeys not demonstrated; creators lack public feed/follow/moderation and full shoppable/campaign/earnings operations |
| Durable local state | Expo File stores explicitly opted-in profile/wardrobe/look metadata; other state is session-only | Saved canonical analysis/report versions and realistic generated-image persistence absent. Local notes/reference looks are not completed AI operations |
| Native notifications | No expo-notifications/APNs/FCM registration, token lifecycle or push-open routing implementation found | Missing application code plus provider/store configuration and real-device testing |
| Gestures/animation | Native ScrollViews, touch Pressables and Modal slide animation | No dedicated swipe/edit/compare gesture system, native navigation transitions or qualified haptic behavior |
| Native/build config | app.json/app.config.ts: picker privacy strings, microphone disabled, biometric plugins, scheme; EAS dev/preview/production profiles | Actual registered bundle/package IDs, EAS project/owner and signing credentials are not configured. Local verification identifiers are not store registrations |
| Branding | Ivory logo/app icon installed; dark artwork source PR #36 remains separate | Do not infer its live deployment from source changes |

There is no basis for declaring iOS or Android 100% built. See the two screen inventories and build reports. Shared PostgreSQL/API tests, JS exports, prebuilds and browser images cannot supply missing native functionality or device acceptance.

No Railway, Supabase, Stripe, production schema, identity rules or financial logic changed. N1 repairs actual native source without rewriting working backend/services. The permanent strategy is in `docs/specification/mobile-first-policy.md`.
