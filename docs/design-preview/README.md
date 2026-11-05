# GLAM AI design review

Open the [mobile screenshot](mobile.png), [consumer web screenshot](website.png) or [admin screenshot](admin.png) to review the visual direction. The full [UI/UX handoff](../specification/ui-ux-design-handoff.md) records scope, journeys, states, acceptance and remaining work.

For the interactive prototype, serve this directory on the same machine as your browser:

```sh
npm start --prefix docs/design-preview
```

Open `http://127.0.0.1:3345`. This is a local address, not a public cloud or phone link. Set `GLAM_DESIGN_PORT` if needed. This prototype uses separate local HTML/CSS/JS/assets; it is not a single embedded HTML file. The provided server adds static-only/security headers; the prototype makes no API requests.

Choose iOS, Android, Consumer web, Merchant, Advertiser, Professional, Creator or Web /admin. Two additional review tools are Design system and Screen-family library. Mobile has Home, Discover, Studio, Shop and Profile; Advisor is contextual. The toolbar selects lifecycle states, restricted-audience layouts, wireframes and a partial Arabic RTL study.

Review these interactions:

- Discover → look → Studio → Complete the Look → compare → merchant handoff review.
- Shop → illustrative product detail → look plan.
- Home → Occasion Concierge → date/location/budget → three concept directions.
- Contextual Advisor, profile preference reset and professional quote-request summary.
- Merchant draft review, seven-step advertiser wizard and creator/customer placement.
- Fifteen admin module groups and seven role layouts, including platform-wide mobile controls.
- Screen-family library: 71 consumer, eight web and 54 workspace task studies. Select a family for dedicated fields, a related flow and acceptance/dependency notes. These are combined requirement families, not 133 complete service implementations.

Images are original AI-generated editorial/product illustrations, not private user inputs, real try-on results or verified inventory. No login/camera/AI/catalog/payment/booking/business-data service is connected. No business metrics are fabricated. Inputs and preferences are ephemeral; unavailable publication/financial actions stay disabled. Layout audience/role selection is not backend authorization.

Reproduce the exports and checks:

```sh
npm ci --ignore-scripts --prefix docs/design-preview
npm run export:frames --prefix docs/design-preview
npm test --prefix docs/design-preview
```

The isolated test uses `/usr/bin/chromium`, `CHROMIUM_EXECUTABLE_PATH`, or Playwright's installed Chromium. It starts and closes its own temporary loopback server/browser. Browser installation, if needed, must use the locked Playwright version's verified installer. Current results: [test-results.json](test-results.json); 25 primary PNG captures and 133 task JPEG captures in [frames](frames/).

Handoff includes [tokens](tokens.json), [component contracts](components.json), [IA](information-architecture.json), [screen catalog](screen-catalog.json), five editable primary SVG studies and 133 task wireframes in [figma-ready](figma-ready/). SVG text/shapes are editable; photos are raster fills. **No native Figma file, auto-layout/component library or Figma import verification was produced: no Figma authoring tool is connected.** Native device, complete localization, assistive-technology, usability and real-service validation remain outstanding. The brief requires primary-flow/design-system approval before application implementation.
