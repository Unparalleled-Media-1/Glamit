# Analysis-first application preview

The latest [contextual-catalog update](../specification/contextual-catalog-build.md) adds `/hair`, `/skin` and `/body-fit`, recommendation/save/no-match sections inside every relevant result/guide/Studio, and Merchant **Snap & List / My Products / Draft Listings / Catalog Health** modules. The provider-connected card renderer is typed against the canonical API, but the disconnected app does not invent listings. Choose Merchant → Snap & List to prepare unchanged local photos, select optional AI steps, manually review facts and save session drafts. Publication remains gated. Draft Listings supports a bounded session JSON import/export; imports reset review and discard image metadata/identities.

This is the actual Next.js/Expo application build, separate from the earlier standalone design prototype.

Start web from the repository root with `npm run dev:web`, then open the local URL printed by Next.js in a browser on that machine (normally `http://localhost:3000`; it may choose another port if occupied). A cloud-local address is not a public preview URL. The main pages are `/analyze`, `/consent`, `/quality`, `/goals`, `/report`, `/color`, `/guide`, `/studio`, `/advisor`, `/profile`, `/history`, `/privacy`; secondary journeys include `/explore`, `/complete`, `/screenshot`, `/budget`, `/booking`, `/wardrobe`, `/calendar`, `/groups`, `/agent`. Business tools are `/business`; `/admin` shows only a public denied/inventory state until separate staff authority is connected.

Start mobile with `npm run dev:mobile`. One Expo app supports the personal experience and role-tool inventory; no separate business apps are created. Compatible native/device setup remains required. JavaScript exports are not native binary/device qualification.

Try the local flow: Analyze My Face → permission → choose JPEG/PNG/WebP → technical file review → goals → report workspace → Color Analysis → editable routine → Studio. AI fields remain “Not computed”; generation, actual advisor answers and server image upload are disabled. Build/save/check/delete routines in memory. Clear the photo in Privacy. Raw images, tokens and notes are not written to browser localStorage. Native cached copies have explicit deletion; source library originals are untouched.

Business roles have their own navigation and task fields; session planning drafts are not tenant records. Selecting a role inventory never activates privileges. Actual workspace APIs require authenticated, eligible, active membership plus verified capabilities and scoped grants; all are checked on every request. Invitations never grant access until the intended recipient accepts while authority remains valid.

Original editorial/product illustrations reuse the provenance documented in `../design-preview/assets`; no supplied third-party brand art, fake before/after, face scores, inventory, prices, revenue or reviews are represented as real. The original image is preserved in Studio. Personal color swatches are labeled brand illustrations, not inferred personal results.

The [current information architecture](information-architecture.json) derives from the shared application navigation/modules. The [deferred connection checklist](connections.md) distinguishes adapter boundaries from remaining domain implementation.

Validation results and captured screens are in `test-results.json` and this directory's PNG files. Remaining connection/qualification work is tracked in [implementation status](../implementation-status.md), with architecture/parity/permissions in [the build specification](../specification/analysis-first-build.md). Native Figma authoring remains outstanding; these are implemented app components and browser captures.
