/** Real local Next and original PNGs; no Auth or AI acceptance is inferred. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  net = require("node:net"),
  assert = require("node:assert/strict"),
  { spawn } = require("node:child_process");
const {
  chromium,
} = require("../../docs/design-preview/node_modules/playwright");
(async () => {
  const out =
    process.env.GLAM_BRAND_ARTIFACTS || "/workspace/artifacts/glam-exact-brand";
  fs.mkdirSync(out, { recursive: true });
  const manifest = JSON.parse(
    fs.readFileSync("docs/branding/original-assets.json"),
  );
  for (const [name, meta] of Object.entries(manifest))
    for (const root of ["apps/web/public/brand", "apps/mobile/assets/brand"])
      assert.equal(
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(root, name)))
          .digest("hex"),
        meta.sha256,
      );
  const alloc = net.createServer();
  await new Promise((r) => alloc.listen(0, "127.0.0.1", r));
  const port = alloc.address().port;
  await new Promise((r) => alloc.close(r));
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
    { cwd: path.resolve("apps/web"), stdio: "ignore" },
  );
  let browser;
  const checks = [];
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      try {
        response = await fetch(origin);
        if (response.ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(response?.ok);
    const html = await response.text();
    assert(html.includes("/brand/favicon.png?v=20261108"));
    assert(html.includes('rel="apple-touch-icon"'));
    assert(html.includes("/site.webmanifest"));
    for (const [name, meta] of Object.entries(manifest)) {
      const r = await fetch(origin + "/brand/" + name + "?v=20261108");
      assert.equal(r.status, 200);
      assert(r.headers.get("content-type").includes("image/png"));
      assert.equal(
        crypto
          .createHash("sha256")
          .update(Buffer.from(await r.arrayBuffer()))
          .digest("hex"),
        meta.sha256,
      );
    }
    checks.push(
      "Web/native assets match all three ZIP originals byte-for-byte; live local HTTP returns exact PNG bytes and correct metadata",
    );
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext();
    await context.route("https://**/*", (r) => r.abort());
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/",
        "/business",
        "/business/login",
        "/business/register",
        "/admin/login",
        "/shop",
        "/studio",
      ]) {
        await page.goto(origin + route);
        await page.locator(".brand-artwork").first().waitFor();
        await page.waitForFunction(() =>
          [...document.querySelectorAll(".brand-artwork")].every(
            (i) =>
              i.complete && i.naturalWidth === 1300 && i.naturalHeight === 455,
          ),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `Overflow at ${width} ${route}`,
        );
        checks.push(
          width + " " + route + " exact original logo loads without overflow",
        );
        if (
          (route === "/business" ||
            route === "/business/login" ||
            route === "/") &&
          [390, 1440].includes(width)
        )
          await page.screenshot({
            path: path.join(
              out,
              (width === 1440 ? "desktop" : "mobile") +
                (route === "/" ? "-home" : route.replaceAll("/", "-")) +
                ".png",
            ),
            fullPage: true,
          });
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        {
          scope:
            "Original asset integrity and local browser image loading; no production or native-device certification",
          checks,
          errors,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(checks.length + " artwork checks passed");
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
