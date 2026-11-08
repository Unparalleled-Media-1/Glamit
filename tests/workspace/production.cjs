/** Actual Next SSR/guest routes; outbound providers blocked, no Auth doubles or writes. */
const { spawn } = require("node:child_process"),
  net = require("node:net"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const {
  chromium,
} = require("../../docs/design-preview/node_modules/playwright");
(async () => {
  const out =
    process.env.GLAM_WORKSPACE_ARTIFACTS || "/tmp/glam-workspace-access";
  fs.mkdirSync(out, { recursive: true });
  const allocation = net.createServer();
  await new Promise((r) => allocation.listen(0, "127.0.0.1", r));
  const port = allocation.address().port;
  await new Promise((r) => allocation.close(r));
  const origin = "http://127.0.0.1:" + port;
  let logs = "",
    browser;
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
    { cwd: path.resolve("apps/web"), stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (b) => (logs += b));
  server.stderr.on("data", (b) => (logs += b));
  const controls = [];
  const checks = [],
    errors = [];
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      try {
        response = await fetch(origin + "/business");
        if (response.ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(response?.ok);
    const html = await response.text();
    assert(!html.includes('aria-label="Review workspace tools"'));
    assert(!html.includes('aria-label="Workspace modules"'));
    checks.push("Business SSR never includes dashboard selectors or modules");
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext(),
      page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("https://**/*", (route) =>
      route.abort("blockedbyclient"),
    );
    await context.tracing.start({ screenshots: true, snapshots: true });
    for (const [route, heading] of [
      ["/business", "Your business workspace starts here"],
      ["/business/login", "Sign in to your business workspace"],
      ["/business/register", "Create your GLAM Beauty account"],
      ["/admin", "Staff sign-in required"],
      ["/admin/login", "Sign in to administration"],
      ["/register", "Create your GLAM Beauty account"],
    ]) {
      const r = await page.goto(origin + route);
      assert.equal(r.status(), 200);
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("navigation", { name: "Workspace modules" })
          .count(),
        0,
      );
      assert.equal(
        await page.getByRole("navigation", { name: "Admin modules" }).count(),
        0,
      );
      checks.push(
        route + " renders its actual guest entry without private modules",
      );
    }
    for (const [route, label, target] of [
      ["/business", "Sign in", "/business/login"],
      ["/business", "Register your business account", "/business/register"],
      ["/admin", "Sign in", "/admin/login"],
    ]) {
      await page.goto(origin + route);
      await page.getByRole("link", { name: label, exact: true }).click();
      await page.waitForURL(origin + target);
      controls.push({
        route,
        label,
        target,
        observed_path: new URL(page.url()).pathname,
        status: "PASS",
        api: "NONE; entry navigation only",
        database: "NONE",
      });
    }
    checks.push(
      "Three actual guest entry links navigate to the intended login or registration routes",
    );
    const noAdminRegistration = await context.request.get(
      origin + "/admin/register",
    );
    assert.equal(noAdminRegistration.status(), 404);
    checks.push("No public admin registration route exists");
    await page.goto(origin + "/business?role=super_admin");
    await page
      .getByRole("heading", { name: "Your business workspace starts here" })
      .waitFor();
    assert.equal(await page.getByRole("combobox").count(), 0);
    checks.push("Route query cannot activate an organization or staff role");
    for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    checks.push("Eight required viewport widths have no entry-page overflow");
    for (const [name, width] of [
      ["desktop", 1440],
      ["mobile", 390],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: path.join(out, "actual-guest-" + name + ".png"),
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    await context.tracing.stop({
      path: path.join(out, "actual-guest-trace.zip"),
    });
    fs.writeFileSync(
      path.join(out, "production-results.json"),
      JSON.stringify(
        {
          scope:
            "Actual local Next SSR/anonymous routes, outbound requests blocked; not live provider or deployed auth evidence",
          checks,
          controls,
          errors,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(checks));
  } finally {
    await browser?.close();
    server.kill();
    fs.writeFileSync(path.join(out, "next-server.txt"), logs);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
