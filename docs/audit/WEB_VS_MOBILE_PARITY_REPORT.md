# Web versus native parity

08 November 2026 08:04 SAST. **NO-GO. Audit plus one tested P0 candidate repair; no agent-initiated production deployment, schema write, login message or financial mutation.**

[Master feature matrix](GLAM_BEAUTY_MASTER_FEATURE_MATRIX.csv) · [Fresh remote metadata](evidence/remote-readiness.json) · [Production catalog](evidence/production-catalog.json) · [Deployed receipt](evidence/railway-ci-receipt.json).

Both web and native sources were inspected. No signed IPA/AAB, OS camera/biometric/screen-reader run or native installation was available.

| Area | Actual web | Actual React Native | Qualification gap |
| --- | --- | --- | --- |
| Identity & onboarding | /login; /auth/callback; /profile; /security | NativeAccount; useNativeAccount | Auth UI and lifecycle code exist; production phone/social providers disabled; current Auth callback origins still reference glamit.beauty. |
| AI Beauty Analysis | /consent; /analyze; /results; /report | App consent/quality/results; CompanionViews PersonalResults | Consumer starts without CompanionConnection; adapters and schemas do not dispatch operational analysis; no genuine provider result tested. |
| AI Studio & Virtual Try-On | /studio; /preview; /builder; /get-look | BeautyExperience; StylingJourney; CompanionViews PersonalPreview | Editorial references, selection history and local look metadata exist; real generated media, exact shade fidelity and persisted generation history are unverified. |
| Personal Styling & Discovery | /advisor; /event; /destination; /builder; /wardrobe | StylingJourney; CompanionViews Destination; App advisor | Manual brief, packing checklist and opt-in local metadata are not grounded AI, real weather or cross-device wardrobe persistence. |
| Shopping & Marketplace | /shop; /product; /cart; /checkout; /orders | GoldenCommerce; CompanionViews Marketplace; ContextualRecommendations | Strict match/ranking and offer validators are tested locally; no verified production stock, transactional cart/order/inventory reservation service is connected. |
| Merchants & Professionals | /business merchant/professional workspaces | App workspace planning; MerchantSnapList | Planning fields, local Snap & List drafts and canonical catalog APIs exist; generic workspace drafts are not executed business operations. |
| Creators & Social Media | /creator; creator workspace | CreatorStudio | Private drafts and strict social URL validation exist; 0014 is not applied; pasting a profile URL does not link an account or retrieve media. |
| Advertising & Growth | /business advertiser/affiliate; contextual match placements | App role planning; ContextualRecommendations | Sponsored label rendering and ranking policy tests do not implement ad serving, billing or measured attribution. |
| Payments & Financial Controls | /checkout; /business billing panels (not connected to sandbox app) | CompanionViews Marketplace gated checkout | Local Stripe transport doubles and sandbox ledger tests are not actual payments, fees or settlement proof; current remote balance call still reports livemode=true. |
| Platform, Admin & Release | /admin; /business; /privacy; web health | App; app.config.ts; eas.json | Read-only deployment evidence, local RBAC/RLS and build checks exist; real role sessions, restore rehearsal, device/store release and runtime monitoring remain unverified. |

## Confirmed parity gaps

1. Web HostedAccount.tsx implements profile editing and authenticated routine CRUD. Native NativeAccount.tsx shows an account summary, biometric enable/disable and logout; native App.tsx routines use the local reducer. Shared session/account helpers do not establish synced native routine editing.
2. Web AccountSecurity.tsx implements link-provider and phone-change/OTP forms; the signed-in native account panel has no equivalent account-security controls. Actual providers are disabled on both.
3. Native App.tsx and MerchantSnapList.tsx invoke Expo camera/gallery and cache cleanup. Default web has no camera action; the separate reviewed/tested repair remains PR28, unmerged. No physical-device behavior is inferred.
4. Web business/admin has broad desktop module layouts; native has role quick tools/planning, not an equivalent operational admin console. Admin may intentionally remain web-only; no native admin completion is required by a generic responsive pass.

AI/provider generation, durable wardrobe, visual search, real checkout and bookings are missing/disconnected across both clients; matching empty states are not operational parity. Exact source references are in the CSV, notably apps/mobile/App.tsx, apps/mobile/auth/NativeAccount.tsx, apps/web/components/HostedAccount.tsx and AccountSecurity.tsx.
