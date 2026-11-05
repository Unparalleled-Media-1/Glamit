# Product design preview

`index.html` is a standalone design file with embedded styles/scripts and no build step, external fonts or images. View it in a local browser, or serve this directory using `python -m http.server 3344 --bind 127.0.0.1` and open it in the same machine's browser. Choose Website, Mobile app or Web /admin at the top. The mobile preview has five selectable bottom tabs; the admin sidebar has 16 selectable module headings, including Mobile app controls.

This is a design proposal informed by the uploaded master and [screen blueprint](../specification/screen-blueprint.md). The running app still contains the earlier foundation screens. No API, camera, login, chat, purchase, catalog, metrics or admin authorization is connected. Downloads and other unavailable operations are disabled. An admin module selection changes the explanatory heading; it is not a working business module.

Visual checks performed in Chromium include surface switching, all five mobile tabs, 16 admin module headings, keyboard selection, disabled unavailable actions, no external network requests, no browser runtime errors and desktop/phone screenshots. Native device appearance, VoiceOver/TalkBack and full accessibility testing remain unverified.

To repeat the automated interaction checks and refresh screenshots from this directory:

```sh
npm ci --ignore-scripts
npm test
```

The test starts a temporary loopback server and closes it and the browser when complete. It uses installed `/usr/bin/chromium` when present, or `CHROMIUM_EXECUTABLE_PATH`, otherwise Playwright's installed Chromium. If a local browser is absent, install the version required by the locked Playwright release using its normal verified browser-install workflow. This preview tooling is isolated from the application's root workspace/dependencies. The managed browser blocks `file:` URLs, so its checks use HTTP on loopback; an ordinary local browser can open the standalone file directly.
