# Photo capture repair — 7 November 2026

Status: locally verified release candidate. Not deployed or verified on Railway. Logo/favicon replacement remains blocked on downloadable original artwork.

## Confirmed findings

- The web consent page had no camera capture control. Next's Permissions-Policy explicitly denied all cameras.
- Valid PNG/JPEG/WebP files with empty MIME metadata were rejected before browser decoding. An empty-MIME PNG failed to reach the preview on baseline commit d846b94; the failure transcript is retained in evidence/baseline-regression.txt.
- Consent intentionally gates file selection. The supplied screenshot shows an unchecked checkbox; this restriction remains, with clearer guidance.
- The existing header still uses a text treatment. The supplied exact logo, favicon and app icon are visible inline in chat but no original image files are available in this checkout's attachments. No substitute artwork has been introduced.

## Repairs

Added a semantic file-picker button and consent-gated camera dialog. Enabled same-origin camera permission while retaining microphone denial. Actual image bytes and browser decoding validate selected files, so empty or incorrect MIME metadata is no longer the deciding factor. Size/dimension checks remain. Invalid files and camera denial display recovery guidance. The file input resets to permit selecting the same image again.

Camera streams stop on cancellation, capture, page hiding, unmount or consent removal. Async cancellation prevents stale camera requests and file reads from replacing newer choices. Photo data remains in device-local memory; no server upload or AI result is implied.

The approved colors/layout, authentication, financial logic, database and production settings were preserved.

## Validation

- Web/mobile TypeScript: passed.
- Ruff and isolated local PostgreSQL backend regression: passed, 260 tests (one upstream deprecation warning).
- Next production build: passed.
- Existing web regression: 13 application groups passed.
- Production-server photo regression: 9 checks passed; see evidence/results.json and production-server-regression.txt. Covers consent gating, real chooser activation, empty-MIME image decoding, synthetic camera capture, stream shutdown, malformed files, desktop/mobile width, actual browser permission denial and absence of external requests.
- Next response verified camera=(self) and microphone=().
- CI routing regression passed; photo tests are included in the web CI job.

Reproduce: npm run build:web, then npm run test:photo. Browser tests use synthetic Chromium media, not a physical camera. Screenshots show mobile/desktop browser layouts, not native-device verification. Test source in tests/photo; CI supports its installed Playwright Chromium or CHROMIUM_EXECUTABLE_PATH.

## Remaining blockers

- Server photo upload, connected analysis and physical iOS/Android camera tests are not demonstrated by this repair.
- Exact logo/favicon/app icon installation requires the original files, requested together as a ZIP. No claim of completed branding replacement.
- Current Codex environment still lacks Railway access: RAILWAY_TOKEN is absent and Railway domains are absent from the active network policy. Adding the token only to Railway service variables does not grant this environment access.
- No Railway deployment, source change, service creation, public domain change or public launch was performed. Actual deployed commit and behavior remain unverified; preserve the release approval gate.
