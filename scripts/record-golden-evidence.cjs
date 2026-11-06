/** Actual browser interaction recordings. Mobile emulation is explicitly not native evidence. */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
process.env.PLAYWRIGHT_BROWSERS_PATH = "/tmp/glam-pw-video-runtime";
const { registry } =
  require("../docs/design-preview/node_modules/playwright-core/lib/coreBundle.js").registry;
const encoder = registry.findExecutable("ffmpeg").executablePath();
fs.mkdirSync(path.dirname(encoder), { recursive: true });
if (!fs.existsSync(encoder)) fs.symlinkSync("/usr/bin/ffmpeg", encoder);
const { chromium } = require("../docs/design-preview/node_modules/playwright");
(async () => {
  const out = path.resolve("docs/application-preview/recordings");
  fs.mkdirSync(out, { recursive: true });
  const allocation = http.createServer();
  await new Promise((r) => allocation.listen(0, "127.0.0.1", r));
  const port = allocation.address().port;
  await new Promise((r) => allocation.close(r));
  const origin = "http://127.0.0.1:" + port;
  const server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: path.resolve("apps/web"),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "ignore",
    },
  );
  let browser;
  const evidence = [];
  const errors = [];
  try {
    for (let n = 0; n < 100; n++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
      if (n === 99) throw Error("Preview server unavailable");
    }
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const screens = [
      ["home", "/"],
      ["analyze", "/analyze"],
      ["studio", "/studio"],
      ["shop", "/shop"],
      ["product", "/product"],
      ["results", "/results"],
    ];
    for (const device of [
      { name: "desktop", width: 1440, height: 1050, mobile: false },
      { name: "ios-browser-emulation", width: 390, height: 844, mobile: true },
      {
        name: "android-browser-emulation",
        width: 412,
        height: 915,
        mobile: true,
      },
    ]) {
      for (const [screen, route] of screens) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height },
          isMobile: device.mobile,
          hasTouch: device.mobile,
          recordVideo: {
            dir: out,
            size: { width: device.width, height: device.height },
          },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(origin + route);
        await page.locator("h1").waitFor();
        await page.waitForTimeout(500);
        if (screen === "home")
          await page
            .getByRole("button", { name: "Analyze My Face", exact: true })
            .click();
        if (screen === "analyze") {
          await page
            .getByRole("button", { name: "Start Face Analysis", exact: true })
            .click();
          await page.getByRole("checkbox").check();
        }
        if (screen === "studio") {
          await page
            .getByRole("button", { name: "Makeup Match", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Berry", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Berry swatch 4", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Undo choice", exact: true })
            .click();
        }
        if (screen === "shop")
          await page
            .getByRole("button", { name: "Makeup", exact: true })
            .click();
        if (screen === "product") {
          await page
            .getByRole("button", { name: "Rose reference color", exact: true })
            .click();
          await page.locator("summary").first().click();
        }
        if (screen === "results") {
          await page
            .getByRole("button", { name: "Add my perspective", exact: true })
            .first()
            .click();
          await page
            .getByLabel("Your face shape note")
            .fill("My own description — not an AI finding");
          await page
            .getByRole("button", { name: "Clear this note", exact: true })
            .click();
          assert(
            await page
              .getByRole("button", {
                name: "Analysis connection required",
                exact: true,
              })
              .isDisabled(),
          );
        }
        await page.evaluate(() =>
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "instant",
          }),
        );
        await page.waitForTimeout(500);
        const video = page.video();
        await context.close();
        const file = device.name + "-" + screen + ".webm";
        await video.saveAs(path.join(out, file));
        const original = await video.path();
        if (path.resolve(original) !== path.resolve(out, file))
          fs.rmSync(original, { force: true });
        evidence.push({
          file,
          pattern: screen,
          platform: device.name,
          engine: "Chromium",
          viewport: { width: device.width, height: device.height },
          nativeDevice: false,
          liveAI: false,
          liveCommerce: false,
        });
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "manifest.json"),
      JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          source: "actual local application interaction",
          nativeIOS: "BLOCKED: no Apple runtime/device available",
          nativeAndroid: "BLOCKED: no Android runtime/device available",
          endToEnd:
            "BLOCKED: provider credentials, private storage/auth G0, verified marketplace inventory and payment/order activation unavailable",
          files: evidence,
        },
        null,
        2,
      ) + "\n",
    );
    fs.writeFileSync(
      path.join(out, "index.html"),
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLAM AI interaction evidence</title><style>body{background:#f8f3ef;color:#30252d;font:15px Arial;padding:24px}h1,h2{font-family:Georgia}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}video{width:100%;max-height:600px;background:#181719;border-radius:20px}article{padding:20px;border:1px solid #dfd1d5;border-radius:24px}</style><h1>Six patterns. Actual browser interactions.</h1><p>Desktop + iOS-sized and Android-sized Chromium emulation. These are not native device recordings. Live AI, payments and order confirmation remain unconnected.</p><main>' +
        evidence
          .map(
            (e) =>
              `<article><h2>${e.pattern}</h2><p>${e.platform}</p><video controls preload="metadata" src="${e.file}"></video></article>`,
          )
          .join("") +
        "</main></html>",
    );
    console.log(
      "PASS 18 actual browser recordings. Native iOS/Android and live end-to-end acceptance remain blocked.",
    );
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
