# Interactive GLAM AI preview

This is a real browser preview of the current React application, with a review toolbar, phone/desktop viewport switching and nine guided journeys. It is built from the same consumer, Studio and business components used by Next.js. It contains no live analysis, account, private storage, inventory, payment or booking service. Reference imagery is explicitly editorial; unknown data is not fabricated.

## Run it

```sh
npm ci --ignore-scripts
PREVIEW_BASE_PATH=/Glamit npm run build:preview
npm run preview:serve
```

Open the loopback URL printed by the server, normally `http://127.0.0.1:4173/Glamit/` **on that machine**. This is not a public cloud URL. The prebuilt preview package includes a dependency-free Node HTTP server; follow its README instead of opening HTML with the `file:` protocol.

The toolbar provides First-time visitor, First face analysis, Returning GLAM Profile, Event styling, AI makeover/Studio, Live Look Builder, Get This Look, Merchant Snap & List and Workspace switching. A full-page link opens the selected application surface directly. Restart screen clears unsaved in-memory work. Approved profile text remains only if Remember was explicitly enabled; the footer offers a specific local profile reset. No photo file or conversation is placed into durable browser memory. Phone mode is responsive **web**, not a claim that a native device or signed binary was tested.

## GitHub source and hosting

All eight source/build snapshots from the requested previous 24 hours were pushed and remote hashes verified. [Published build inventory](published-build-snapshots.json) preserves exact branches/commits. Existing earlier branches were already present; five newer build branches were uploaded. No default-branch merge or force push is required.

The new source is on `feat/interactive-preview`. The workflow `.github/workflows/interactive-preview.yml` builds and tests the preview, packages all eight historical source archives, exports native iOS/Android JavaScript and uploads review artifacts. It then attempts a standard GitHub Pages deployment using GitHub's own token. Where automatic enablement is not permitted, a repository administrator must enable **Settings → Pages → Source: GitHub Actions** once. No personal token should be pasted into code or chat. GitHub Pages URL: `https://unparalleled-media-1.github.io/Glamit/` **only after a successful Pages deployment**. Do not call this URL live without deployment evidence.

The separate `gh-pages` branch can retain the prebuilt site as a review artifact. If choosing branch-based Pages hosting instead of the workflow, select **Deploy from a branch → gh-pages → /(root)**. Choose one hosting mode. No production application/database is deployed by the static preview; do not connect providers or add credentials to the public bundle.

Local GitHub Git transport was available and the build pushes succeeded. Direct GitHub API calls returned Forbidden in this environment, so API-based Pages configuration/remote run verification is not established by the local build. The workflow's published deployment/run status is authoritative for hosting. This document records an integration boundary, not a claim that Pages settings were changed.

## Validation

```sh
npm run typecheck
npm run typecheck:preview
npm run test:client
PREVIEW_BASE_PATH=/Glamit npm run build:preview
npm run test:preview
```

The preview test uses the real static app under the repository prefix. It checks phone width, desktop expansion, category/Studio selection and component handoff, merchant entry, denied workspace switching, static disconnected capabilities, direct routes, errors and external requests. Main Next.js tests remain applicable independently. The artifact is not native-device, model-quality, real supply or commercial qualification.
