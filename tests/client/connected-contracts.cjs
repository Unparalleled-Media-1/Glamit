/** Browser contract tests with explicit isolated doubles; never evidence of live end-to-end success. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { build } = require("esbuild");
const {
  chromium,
} = require("../../docs/design-preview/node_modules/playwright");
(async () => {
  const root = "/tmp/glam-connected-contracts";
  fs.mkdirSync(root, { recursive: true });
  await build({
    entryPoints: ["tests/client/companion-harness.tsx"],
    bundle: true,
    jsx: "automatic",
    outdir: root,
    platform: "browser",
    format: "iife",
    define: { "process.env.NODE_ENV": '"test"', "process.env": "{}" },
    loader: { ".webp": "file" },
    external: ["/images/*"],
    logLevel: "silent",
  });
  const errors = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://local");
    if (u.pathname.endsWith(".js") || u.pathname.endsWith(".css")) {
      const file = path.join(root, path.basename(u.pathname));
      if (fs.existsSync(file)) {
        res.setHeader(
          "Content-Type",
          u.pathname.endsWith(".js") ? "application/javascript" : "text/css",
        );
        return res.end(fs.readFileSync(file));
      }
    }
    if (u.pathname.startsWith("/images/")) {
      res.setHeader("Content-Type", "image/webp");
      return res.end(fs.readFileSync(path.join("apps/web/public", u.pathname)));
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><link rel="stylesheet" href="/companion-harness.css"></head><body><div id="root"></div><script src="/companion-harness.js"></script></body></html>',
    );
  });
  let browser;
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = "http://127.0.0.1:" + server.address().port;
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error("TEST HARNESS RUNTIME:", e.message);
    });
    await page.route("https://fixture.invalid/**", (route) =>
      route.fulfill({
        contentType: "image/webp",
        body: fs.readFileSync("apps/web/public/images/editorial.webp"),
      }),
    );
    async function prepare() {
      await page.goto(origin);
      await page
        .getByRole("button", { name: "Analyze My Face", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Start Face Analysis", exact: true })
        .click();
      await page.getByRole("checkbox").check();
      await page
        .getByTestId("photo-input")
        .setInputFiles(path.resolve("apps/web/public/images/editorial.webp"));
      await page
        .getByRole("button", { name: "Choose my goals", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Open Personalized Results", exact: true })
        .click();
      await page
        .getByRole("checkbox", { name: /I authorize processing/ })
        .check();
    }
    await prepare();
    await page.evaluate(() => (window.testFixture.mode = "wrong-owner"));
    await page
      .getByRole("button", { name: "Analyze my photo", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByText("TEST oval", { exact: true }).count(), 0);
    assert.match(
      await page.locator(".personal-result-status").innerText(),
      /No personal analysis yet/,
    );
    await page.evaluate(() => (window.testFixture.mode = "ok"));
    await page
      .getByRole("button", { name: "Analyze my photo", exact: true })
      .click();
    await page.getByText("TEST oval", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Add my perspective", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Your face shape note")
      .fill("TEST self-described shape");
    await page
      .getByRole("button", {
        name: "Explore TEST rose look in AI Studio",
        exact: true,
      })
      .click();
    await page
      .getByRole("checkbox", { name: /I authorize virtual try-on/ })
      .check();
    await page
      .getByRole("button", { name: "Generate my chosen look", exact: true })
      .click();
    await page.goBack();
    await page
      .getByRole("button", { name: "Edit my correction", exact: true })
      .click();
    await page
      .getByLabel("Your face shape note")
      .fill("TEST updated correction");
    await page.waitForTimeout(650);
    await page
      .getByRole("button", {
        name: "Explore TEST rose look in AI Studio",
        exact: true,
      })
      .click();
    assert.equal(
      await page.getByAltText("Qualified personal virtual try-on").count(),
      0,
    );
    await page
      .getByRole("checkbox", { name: /I authorize virtual try-on/ })
      .check();
    await page
      .getByRole("button", { name: "Generate my chosen look", exact: true })
      .click();
    await page.getByAltText("Qualified personal virtual try-on").waitFor();
    const previewCalls = await page.evaluate(() =>
      window.testFixture.trace.filter((t) => t.kind === "preview"),
    );
    assert.equal(
      previewCalls.at(-1).request.corrections["face-shape"],
      "TEST updated correction",
    );
    assert(
      previewCalls.at(-1).request.correctionRevision >
        previewCalls[0].request.correctionRevision,
    );
    await page
      .getByRole("button", { name: "Get This Look", exact: true })
      .click();
    await page
      .getByLabel("Style requirements (comma-separated tags)")
      .fill("rose");
    await page.getByLabel("Delivery country code").fill("ZA");
    await page.getByLabel("Shopping city (optional)").fill("Cape Town");
    await page
      .getByRole("button", { name: "Find verified local matches", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "TEST ONLY lipstick", exact: true })
      .waitFor();
    assert.match(
      await page.locator(".sponsored-panel").innerText(),
      /Sponsored/,
    );
    const publicTrace = await page.evaluate(() =>
      window.testFixture.trace.filter((t) => t.kind === "matches"),
    );
    assert(!JSON.stringify(publicTrace).includes("photoUri"));
    assert(!JSON.stringify(publicTrace).includes("corrections"));
    await page
      .getByRole("button", { name: "Review merchant handoff", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", {
        name: "Add verified variant to cart",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Request checkout quote", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Continue to secure checkout", exact: true })
      .waitFor();
    const quoteTrace = await page.evaluate(() =>
      window.testFixture.trace.find((t) => t.kind === "quote"),
    );
    assert.deepEqual(Object.keys(quoteTrace.request.destination).sort(), [
      "city",
      "country",
      "currency",
    ]);

    await page
      .getByRole("button", { name: "03 / Order status", exact: true })
      .click();
    assert.match(
      await page.locator("main").innerText(),
      /No order is confirmed/,
    );
    await page
      .getByRole("button", { name: "Check verified order status", exact: true })
      .click();
    await page.getByText("Payment pending", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("heading", { name: "Your order is confirmed.", exact: true })
        .count(),
      0,
    );
    await page.evaluate(() => (window.testFixture.mode = "paid"));
    await page
      .getByRole("button", { name: "Check verified order status", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your order is confirmed.", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Open profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Privacy & photo deletion", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Clear local photo", exact: true })
      .click();
    await page.getByRole("button", { name: "AI Advisor", exact: true }).click();
    await page
      .getByRole("button", { name: "Personalized Results", exact: true })
      .click();
    assert.match(
      await page.locator(".personal-result-status").innerText(),
      /No personal analysis yet/,
    );
    assert.equal(
      await page
        .getByText("TEST self-described shape", { exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS isolated TEST DOUBLE browser contract journey: owner rejection, analysis uncertainty/corrections, stale preview discard, current try-on handoff, explicit local matching, separate sponsorship, verified variant/cart/server quote, pending vs paid receipt and photo clearing. Not live provider/payment evidence.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
