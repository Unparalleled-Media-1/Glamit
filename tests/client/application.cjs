const {
  chromium,
} = require("../../docs/design-preview/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
(async () => {
  const checks = [],
    errors = [],
    external = [],
    screenshots = [];
  const out = path.resolve(__dirname, "../../docs/application-preview");
  fs.mkdirSync(out, { recursive: true });
  const allocation = net.createServer();
  await new Promise((r) => allocation.listen(0, "127.0.0.1", r));
  const port = allocation.address().port;
  await new Promise((r) => allocation.close(r));
  const origin = "http://127.0.0.1:" + port;
  let log = "";
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
      cwd: path.resolve(__dirname, "../../apps/web"),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 25000;
      const tick = async () => {
        if (server.exitCode !== null) return reject(Error(log));
        try {
          if ((await fetch(origin)).ok) return resolve();
        } catch {}
        if (Date.now() > deadline) return reject(Error(log));
        setTimeout(tick, 150);
      };
      tick();
    });
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
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (new URL(r.url()).origin !== origin && !r.url().startsWith("blob:"))
        external.push(r.url());
    });
    const pass = (n) => {
      checks.push(n);
      console.log("PASS " + n);
    };
    const capture = async (name) => {
      await page.screenshot({
        path: path.join(out, name + ".png"),
        fullPage: !name.startsWith("mobile-"),
      });
      screenshots.push(name + ".png");
    };
    await page.goto(origin);
    assert.match(await page.locator("h1").innerText(), /Discover What/);
    await capture("web-home");
    await page
      .getByRole("button", { name: "Analyze My Face", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start Face Analysis", exact: true })
      .click();
    const photo = page.getByTestId("photo-input");
    assert(await photo.isDisabled());
    await page.getByRole("checkbox").check();
    assert(await photo.isEnabled());
    await photo.setInputFiles({
      name: "invalid.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    assert.match(await page.locator("main [role=alert]").innerText(), /JPEG/);
    await photo.setInputFiles(
      path.resolve(__dirname, "../../apps/web/public/images/editorial.webp"),
    );
    await page
      .getByRole("heading", { name: "Photo review", exact: true })
      .waitFor();
    assert.match(await page.locator("main").innerText(), /Not evaluated/);
    assert.match(await page.locator("main").innerText(), /Not uploaded/);
    await capture("photo-quality");
    await page
      .getByRole("button", { name: "Choose my goals", exact: true })
      .click();
    await page.getByRole("checkbox", { name: "Discover my colors" }).check();
    await page
      .getByRole("button", { name: "Check analysis availability" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "No photo has been uploaded or analyzed" })
      .first()
      .waitFor();
    await page.getByRole("button", { name: "View report workspace" }).click();
    assert.equal(
      await page.getByText("Not computed", { exact: true }).count(),
      7,
    );
    await capture("face-report");
    pass(
      "Consent-gated photo selection, invalid-file rejection, technical review, goals and honest uncomputed report",
    );
    await page
      .getByRole("button", { name: "Explore Color Analysis", exact: true })
      .click();
    await capture("color-report");
    await page
      .getByRole("button", { name: "Build a chosen-color routine" })
      .click();
    await page
      .getByLabel("Routine title", { exact: true })
      .fill("Five-minute routine");
    await page
      .getByLabel("One step per line", { exact: true })
      .fill("Prepare my own tools\nFollow one technique");
    await page.getByRole("button", { name: "Save session routine" }).click();
    await page
      .getByRole("checkbox", { name: "Prepare my own tools", exact: true })
      .check();
    assert(
      await page
        .getByRole("checkbox", { name: "Prepare my own tools", exact: true })
        .isChecked(),
    );
    await capture("glow-up-guide");
    await page
      .getByRole("button", { name: "Try AI Makeover", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Makeup Match", exact: true })
      .click();
    await page.getByLabel("Style direction").selectOption("Locs");
    await page.getByRole("slider", { name: "Comparison handle" }).focus();
    await page.keyboard.press("End");
    assert.match(await page.locator(".canvas-label").innerText(), /Unchanged/);
    await page.getByRole("button", { name: "Reset to original" }).click();
    assert.equal(
      await page.getByLabel("Style direction").inputValue(),
      "Natural",
    );
    await capture("ai-studio");
    pass(
      "Editable routine save/checklist, dedicated Makeup Match, original-preserving Studio and reset",
    );
    await page.getByRole("button", { name: "AI Advisor", exact: true }).click();
    await page.getByLabel("Your question").fill("A five-minute routine");
    await page
      .getByRole("button", { name: "Check advisor connection" })
      .click();
    assert.match(await page.getByRole("status").innerText(), /not been sent/);
    await page.getByRole("button", { name: "Open profile" }).click();
    await page
      .getByRole("button", { name: "Switch workspace", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    assert(await dialog.isVisible());
    assert.match(
      await dialog.innerText(),
      /No business workspaces are authorized/,
    );
    await page.keyboard.press("Escape");
    assert(
      await page
        .getByRole("button", { name: "Switch workspace", exact: true })
        .evaluate((n) => document.activeElement === n),
    );
    await page
      .getByRole("button", { name: "Privacy & photo deletion" })
      .click();
    await page
      .getByRole("button", { name: "Clear local photo", exact: true })
      .click();
    assert.match(await page.locator("main").innerText(), /No photo selected/);
    assert.deepEqual((await context.storageState()).origins, []);
    pass(
      "Unsent Advisor, unauthorized workspace switcher, focus restoration, photo deletion and no persisted private data",
    );
    await page.goto(origin + "/business");
    const configs = await page
      .locator('select[aria-label="Review workspace tools"] option')
      .allTextContents();
    assert.equal(configs.length, 5);
    for (const role of [
      "merchant",
      "advertiser",
      "professional",
      "creator",
      "affiliate",
    ]) {
      await page.getByLabel("Review workspace tools").selectOption(role);
      const buttons = page
        .getByRole("navigation", { name: "Workspace modules" })
        .getByRole("button");
      const names = await buttons.allTextContents();
      for (let i = 0; i < names.length; i++) {
        await buttons.nth(i).click();
        assert.match(await page.locator("main h1").innerText(), /\S/);
      }
      await buttons.first().click();
      await capture(role + "-workspace");
    }
    await page.getByLabel("Review workspace tools").selectOption("merchant");
    await page
      .getByLabel("Draft title", { exact: true })
      .fill("Local catalog plan");
    await page
      .getByRole("button", { name: "Save session planning draft" })
      .click();
    assert(
      await page
        .getByRole("heading", { name: "Local catalog plan" })
        .isVisible(),
    );
    await page.getByLabel("Review workspace tools").selectOption("advertiser");
    assert.equal(
      await page.getByRole("heading", { name: "Local catalog plan" }).count(),
      0,
    );
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Create Campaign/ })
      .click();
    for (const n of [
      "Eligible products",
      "Placement",
      "Budget",
      "Creative",
      "Review",
      "Launch",
    ])
      await page
        .getByRole("button", { name: "Next: " + n, exact: true })
        .click();
    assert(
      await page
        .getByRole("button", { name: "Launch unavailable" })
        .isDisabled(),
    );
    pass(
      "All business role modules, isolated session draft save/reset and evidence-gated campaign wizard",
    );
    await page.goto(origin + "/admin");
    await page.getByLabel("Review admin role layout").selectOption("Support");
    assert.equal(
      await page
        .getByRole("navigation", { name: "Admin modules" })
        .getByRole("button", { name: /Commerce/ })
        .count(),
      0,
    );
    assert.match(await page.locator("main").innerText(), /Access denied/);
    await capture("admin");
    pass(
      "Public admin inventory reveals no privileged controls or business data",
    );
    for (const width of [320, 390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        "/",
        "/analyze",
        "/report",
        "/color",
        "/guide",
        "/studio",
        "/advisor",
        "/profile",
        "/complete",
        "/business",
        "/admin",
      ]) {
        await page.goto(origin + route);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route + " overflow " + width,
        );
      }
      if (width === 390) {
        await page.goto(origin);
        assert.deepEqual(
          await page.locator(".mobile-nav button").allTextContents(),
          ["Home", "Analyze", "AI Studio", "AI Advisor", "Profile"],
        );
        await capture("mobile-home");
        await page.goto(origin + "/report");
        await capture("mobile-face-report");
      }
    }
    await context.setOffline(true);
    await page.goto(origin + "/goals").catch(() => {});
    await context.setOffline(false);
    await page.goto(origin + "/goals");
    await context.setOffline(true);
    assert(
      await page
        .getByRole("button", { name: "Check analysis availability" })
        .isDisabled(),
    );
    await context.setOffline(false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
      "auto",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    pass(
      "Responsive 320–1920px, five analysis-first mobile destinations, offline guard, reduced motion and no external requests/errors",
    );
    fs.writeFileSync(
      path.join(out, "test-results.json"),
      JSON.stringify(
        {
          run_at: new Date().toISOString(),
          checks,
          screenshots,
          limits: [
            "No native-device/camera validation",
            "No provider, identity, storage, catalog, payment or business activation",
            "Browser tests use actual Next.js application; report fields remain uncomputed",
          ],
        },
        null,
        2,
      ) + "\n",
    );
    console.log(checks.length + " application groups passed");
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
