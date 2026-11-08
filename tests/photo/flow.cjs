/** Browser photo picker/camera regression with synthetic media; no real hardware or uploads. */
const cp = require("node:child_process"),
  path = require("node:path");
const { build } = require("esbuild"),
  { chromium } = require("../../docs/design-preview/node_modules/playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const out = process.env.GLAM_PHOTO_ARTIFACTS || "/tmp/glam-photo-regression";
  fs.mkdirSync(out, { recursive: true });
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import GlamApp from './apps/web/components/GlamApp';import './apps/web/app/styles.css';import './apps/web/app/golden-tokens.css';import './apps/web/app/golden-screens.css';createRoot(document.getElementById('root')).render(<GlamApp start='consent'/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    outdir: "/tmp/glam-photo-bundle",
    jsx: "automatic",
    external: ["/images/*"],
    plugins:
      process.env.GLAM_PHOTO_BASELINE === "1"
        ? [
            {
              name: "baseline-photo-code",
              setup(b) {
                b.onLoad({ filter: /GlamApp\.tsx$/ }, (args) => ({
                  contents: cp.execFileSync(
                    "git",
                    ["show", "d846b94:apps/web/components/GlamApp.tsx"],
                    { encoding: "utf8" },
                  ),
                  loader: "tsx",
                  resolveDir: path.dirname(args.path),
                }));
              },
            },
          ]
        : [],
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""',
      "process.env.NEXT_PUBLIC_GLAM_BASE_PATH": '""',
      "process.env.NEXT_PUBLIC_GLAM_STATIC_PREVIEW": '"true"',
    },
  });
  const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text,
    css = bundle.outputFiles.find((f) => f.path.endsWith(".css")).text;
  const server = http.createServer((q, r) => {
    r.setHeader(
      "Permissions-Policy",
      "camera=(self), microphone=(), geolocation=()",
    );
    r.setHeader(
      "Content-Type",
      q.url === "/app.js"
        ? "application/javascript"
        : q.url === "/app.css"
          ? "text/css"
          : "text/html",
    );
    r.end(
      q.url === "/app.js"
        ? js
        : q.url === "/app.css"
          ? css
          : '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLAM Beauty photo test</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin =
    process.env.GLAM_PHOTO_ORIGIN ||
    "http://127.0.0.1:" + server.address().port;
  const target = new URL(origin);
  if (
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    target.username ||
    target.password
  )
    throw Error("LOCAL_PHOTO_TEST_ORIGIN_REQUIRED");
  let browser;
  const checks = [],
    network = [];
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox", "--use-fake-device-for-media-stream"],
    });
    const context = await browser.newContext({
        permissions: ["camera"],
        viewport: { width: 390, height: 844 },
      }),
      page = await context.newPage();
    page.setDefaultTimeout(10000);
    await context.route("https://**/*", (r) => {
      network.push(
        r.request().method() + " " + new URL(r.request().url()).origin,
      );
      return r.abort("blockedbyclient");
    });
    await page.goto(origin + "/consent");
    assert(
      await page
        .getByRole("button", { name: "Choose a photo", exact: true })
        .isDisabled(),
    );
    assert(
      await page
        .getByRole("button", { name: "Take a photo", exact: true })
        .isDisabled(),
    );
    checks.push("File selection and camera require explicit consent");
    await page.getByLabel("I have permission to use this image").check();
    const image = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 640;
      const x = c.getContext("2d");
      x.fillStyle = "#e0b6c4";
      x.fillRect(0, 0, 640, 640);
      return c.toDataURL("image/png").split(",")[1];
    });
    // Some mobile file pickers return an empty MIME type even for a valid PNG.
    await page.evaluate((encoded) => {
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const transfer = new DataTransfer();
      const file = new File([bytes], "mobile-photo.png", { type: "" });
      if (file.type !== "") throw Error("Expected empty MIME fixture");
      transfer.items.add(file);
      const input = document.querySelector("[data-testid=photo-input]");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, image);
    await page
      .getByRole("heading", { name: "A clear starting point." })
      .waitFor({ timeout: 4000 });
    checks.push("Valid photo with empty MIME type reaches local preview");
    await page.goto(origin + "/consent");
    await page.getByLabel("I have permission to use this image").check();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Choose a photo", exact: true })
      .click();
    const chosen = await chooser;
    assert(chosen.isMultiple() === false);
    await chosen.setFiles([]);
    checks.push("Accessible Choose a photo opens real file chooser");
    await page
      .getByRole("button", { name: "Take a photo", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Take a private photo" }).waitFor();
    await page.waitForFunction(
      () => document.querySelector("video")?.videoWidth > 0,
    );
    await page.screenshot({ path: out + "/camera-mobile.png", fullPage: true });
    await page
      .getByRole("button", { name: "Use this photo", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "A clear starting point." })
      .waitFor();
    checks.push("Synthetic browser camera capture reaches preview");
    await page.goto(origin + "/consent");
    await page.getByLabel("I have permission to use this image").check();
    await page
      .getByRole("button", { name: "Take a photo", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page
      .locator("video")
      .evaluate((v) => (window.__photoTestTracks = v.srcObject.getTracks()));
    await page
      .getByRole("button", { name: "Cancel camera", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const tracks = await page
      .locator("video")
      .evaluate(
        (v) =>
          v.srcObject === null &&
          window.__photoTestTracks.every((t) => t.readyState === "ended"),
      );
    assert(tracks);
    checks.push("Cancel clears camera stream");
    await page.getByTestId("photo-input").setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("not image bytes"),
    });
    await page
      .getByRole("alert")
      .filter({ hasText: /JPEG|PNG/ })
      .waitFor();
    checks.push("Malformed image shows an inline error");
    await page.screenshot({ path: out + "/photo-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: out + "/photo-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    checks.push("Desktop and mobile photo controls fit the viewport");
    const cdp = await context.newCDPSession(page);
    const targetInfo = await cdp.send("Target.getTargetInfo");
    await cdp.send("Browser.setPermission", {
      permission: { name: "camera" },
      setting: "denied",
      origin,
      browserContextId: targetInfo.targetInfo.browserContextId,
    });
    assert.equal(
      await page.evaluate(
        async () =>
          (await navigator.permissions.query({ name: "camera" })).state,
      ),
      "denied",
    );
    await page.reload();
    await page.getByLabel("I have permission to use this image").check();
    await page
      .getByRole("button", { name: "Take a photo", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Camera permission was denied or blocked" })
      .waitFor();
    checks.push("Browser camera denial displays recovery guidance");
    assert.deepEqual(network, []);
    checks.push("No external photo upload or provider request");
    fs.writeFileSync(
      out + "/results.json",
      JSON.stringify(
        {
          checks,
          scope:
            "Synthetic Chromium media only; physical devices and server upload unverified",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(checks));
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
