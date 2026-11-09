# Footer role links and actual native preview status

9 November2026. The five role names in SiteFooter were a paragraph, not links. Replace that paragraph with individual Merchants, Advertisers, Professionals, Creators and Partners anchors. Each opens a dedicated public role page: /merchants, /advertisers, /professionals, /creators and /partners. Every page includes existing business sign-in, registration, approved-workspace and contact destinations. Creator information also links to current app availability. Role descriptions explain required approval; navigating never grants membership, permissions or commercial capabilities. Desktop business access and the mobile-first consumer strategy remain.

The role pages use the existing public layout/tokens and root/static-export path helper. Normal clicks preserve the existing account navigation handoff; links retain real href values for direct loads and modified clicks. Static export also lacked business login/register files: export those routes and render the existing account route component there. No authentication, database, payment, policy or production configuration changes.

Validation: actual built Next.js browser suite and static review export both passed. At390px and1440px every footer role link opens its heading, direct role routes load, sign-in opens the business login and registration opens the existing account registration screen. Each role page passes Axe checks; the existing footer/public-page suite also verifies keyboard order,320–1440px overflow, legal/contact/app availability and protected Auth handoffs. Web/mobile/preview TypeScript and production web build pass. Receipts and desktop/mobile-browser footer captures are in evidence/. These browser screenshots are footer evidence, never native mobile previews.

## Actual built mobile apps

The separate native verification run completed successfully for source31d8ac41618cd6b2f6597d6d9c391e40fe1130e8:

- [Native verification run42577021413](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42577021413): iOS simulator build, installation, launch and startup capture PASS; Android emulator build, installation, launch and startup capture PASS.
- [Actual iOS simulator startup artifact](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42577021413/artifacts/13655134197): home.png plus source/build/launch evidence. This is simulator evidence, not an App Store IPA or physical-device test.
- [Actual Android emulator startup and test APK](https://github.com/Unparalleled-Media-1/Glamit/actions/runs/42577021413/artifacts/13655633941): home.png, source/build/launch evidence and local-verification APK. This is not a Play Store release.

These are actual native captures, not browser imitations. Startup success does not demonstrate the complete authenticated photo-analysis/Style-Passport journey, provider activation or physical-device certification. All Foundation checks for31d8ac4 also passed (backend, hosted API, web, mobile and aggregate clients).

Fresh artifact downloads still return403 in this execution environment, so the PNGs have not been inspected or displayed inline here. The saved network draft adds only productionresultssa31.blob.core.windows.net to the existing custom host list; it requires environment review/save/publish before retry. No new secret was requested and no environment configuration was activated. A proposed persistent screenshot-publishing workflow with contents-write permission was rejected by automatic approval review; it was not created or committed. Existing GitHub artifact links are the safe alternative.

This source repair is for review in PR43 against feat/platform-foundations. No merge, production deployment or domain switch was performed; the live footer is not claimed updated.
