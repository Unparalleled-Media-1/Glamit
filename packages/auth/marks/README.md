# Authentication identity marks

Source snapshots, retrieved 7 November 2026:

- Google and Facebook SVG geometry: Google's FirebaseUI Web repository, `https://raw.githubusercontent.com/firebase/firebaseui-web/master/image/google.svg` and `facebook.svg`. Original copyright headers are retained.
- Apple SVG geometry: `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/apple.svg`, a standard vector mark distributed by Simple Icons. This is not an Apple SDK control.

`provider-marks.json` extracts the path geometry. Google's four source colours are preserved. Apple uses the standard white monochrome treatment on black. Facebook uses white negative-space f geometry and Facebook blue `#0866FF`. Provider colours are deliberately separate from GLAM's palette. Native PNGs are rasterized from the same JSON by `scripts/auth/rasterize-marks.cjs`; no handwritten approximations or emoji logos are used.

Official guideline reference pages:

- https://developers.google.com/identity/branding-guidelines
- https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
- https://developers.facebook.com/docs/facebook-login/userexperience/

These are custom Supabase OAuth controls, not provider-issued SDK widgets. Upstream vector snapshots were retrieved through the allowed GitHub connection; the official guideline pages were not independently re-fetched because their hosts are outside the applied network allowlist. A current branding review remains part of provider launch validation. No provider is enabled by adding these assets. Trademarks remain their respective owners' property.
