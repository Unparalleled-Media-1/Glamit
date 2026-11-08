# Exact GLAM Beauty artwork — installed in the review build

8 November 2026. The original ZIP `GLAM LOGOS.zip` supplied all three PNGs. They have been copied byte-for-byte to `apps/web/public/brand` and `apps/mobile/assets/brand`. [Source names, dimensions and SHA256 hashes](original-assets.json) verify provenance. No redraw, AI generation, recoloring, cropping or image re-encoding was used.

| Original | Installed filename | Size | Use |
| --- | --- | --- | --- |
| glam_beauty_logo.png | wordmark.png |1300×455| Consumer header/footer, login/registration, private dashboard entry, business/staff sidebar, native header/auth, native splash |
| glam_beauty_favicon.png | favicon.png |256×256| Browser icon, Apple touch icon, Expo web favicon |
| glam_beauty_app_icon.png | app-icon.png |1024×1024| Expo iOS/Android launcher icon, web manifest |

The shared web component preserves the original aspect ratio, image colors and accessible GLAM Beauty name. Narrow headers use a smaller image with reserved space for location and account controls. Original cream artwork remains cream on dark screens; no CSS inversion or replacement logo is applied. Canonical color/typography tokens and application identities remain unchanged.

Next metadata points to the ivory PNG and manifest. Versioned icon URLs prevent reuse of an older icon URL. Both static build scripts copy the original assets and emit favicon/Apple icon links; repository-prefixed preview asset URLs are tested. The Railway Dockerfile already copies the full public directory; no hosting, domain or payment configuration changed.

Expo uses the original burgundy launcher icon, original horizontal wordmark as its contained splash image, and the ivory web favicon. Missing identifiers, signing and EAS registration still block production store builds. JavaScript exports and config tests do not prove native installation or launcher appearance on real devices.

## Verification

- 43 artwork checks: all six installed originals match source hashes; actual local PNG HTTP responses match; metadata is present; seven page families load the actual1300×455 logo without overflow at320/390/768/1024/1440/1920px.
- Next production build and web/native TypeScript checks pass after integrating default `f033f16`, including the merged photo and dashboard repairs. The actual browser photo regression also passes; synthetic camera evidence does not certify real camera hardware.
- Authentication/session and private-workspace regressions remain covered; provider doubles are not live authentication evidence.
- cPanel and interactive review exports retain the exact original assets, including the `/Glamit` repository prefix.
- iOS/Android JavaScript exports pass with the original wordmark bundled. No signed IPA/AAB or native-device verification was performed.

[Desktop dashboard entry](evidence/artwork-desktop-business.png) · [Mobile dashboard entry](evidence/artwork-mobile-business.png) · [Mobile Home](evidence/artwork-mobile-home.png) · [Results](evidence/artwork-results.json).

## Deployment boundary

Artwork is installed in the candidate source/builds, not the currently deployed Railway site. The PR must be reviewed/merged and an approved build deployed before its web logo/favicon appears publicly. Existing installed mobile apps need a rebuilt and installed native binary for launcher/splash changes. No public deployment or store publication was performed.

The previous blocker was unavailable binary files in inline chat previews. The ZIP resolves that asset-input blocker; historical audit records describe the earlier state.
