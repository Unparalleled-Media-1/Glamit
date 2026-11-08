/** Finite allowlist of local UI actions; every action starts from a fresh page/context. */
const fs = require("node:fs"),
  path = require("node:path"),
  net = require("node:net"),
  { spawn } = require("node:child_process");
const {
  chromium,
} = require("../../docs/design-preview/node_modules/playwright");
const policy = require("../../tests/launch/safe-actions.json"),
  inventory = JSON.parse(
    fs.readFileSync(
      path.join(
        process.env.GLAM_LAUNCH_EVIDENCE ||
          path.join(__dirname, "../../docs/launch/evidence"),
        "clickthrough.json",
      ),
      "utf8",
    ),
  );
const root = path.resolve(__dirname, "../.."),
  out = process.env.GLAM_LAUNCH_ARTIFACTS || "/workspace/artifacts/glam-launch";
const report = {
  observed_at: new Date().toISOString(),
  scope:
    "UI state transitions only, no provider success claims. External/mutating network blocked. Fixed versioned allowlist; unknown controls skipped.",
  artifact_directory: out,
  results: [],
  unexpected_errors: [],
};
const fingerprint = (page) =>
  page.evaluate(() =>
    JSON.stringify({
      path: location.pathname,
      main: document.querySelector("main")?.innerText,
      history_length: history.length,
      form_values: [...document.querySelectorAll("input,select,textarea")].map(
        (e) => [e.id, e.value, e.checked],
      ),
      dialogs: [...document.querySelectorAll("dialog[open]")].map(
        (d) => d.innerText,
      ),
      selected: [
        ...document.querySelectorAll(
          "[aria-pressed],[aria-selected],[aria-current],details",
        ),
      ].map((e) => [
        e.textContent,
        e.getAttribute("aria-pressed"),
        e.getAttribute("aria-selected"),
        e.getAttribute("aria-current"),
        e.open,
      ]),
    }),
  );
(async () => {
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
    { cwd: path.join(root, "apps/web"), stdio: "ignore" },
  );
  let browser;
  try {
    for (let i = 0; i < 150; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const previous =
      process.env.GLAM_INTERACTIONS_RECHECK === "1"
        ? JSON.parse(
            fs.readFileSync(
              process.env.GLAM_INTERACTIONS_PREVIOUS ||
                path.join(
                  root,
                  "docs/launch/evidence/interactions-initial.json",
                ),
              "utf8",
            ),
          )
        : null;
    for (const viewport of ["desktop", "iphone-web"]) {
      const targets = inventory.routes.filter((p) => p.viewport === viewport);
      const context = await browser.newContext({
        viewport:
          viewport === "desktop"
            ? { width: 1440, height: 1000 }
            : { width: 390, height: 844 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: false,
      });
      page.on("pageerror", (e) =>
        report.unexpected_errors.push({
          viewport,
          message: e.message.slice(0, 300),
        }),
      );
      page.on("dialog", (d) => d.dismiss());
      await context.route("**/*", (r) => {
        const req = r.request(),
          u = new URL(req.url());
        return (u.origin === origin && req.method() === "GET") ||
          ["data:", "blob:"].includes(u.protocol)
          ? r.continue()
          : r.abort("blockedbyclient");
      });
      let count = 0;
      for (const route of targets) {
        for (const c of route.controls) {
          if (
            previous &&
            !previous.results.some(
              (p) =>
                p.viewport === viewport &&
                p.route === route.route &&
                p.control_id === c.id &&
                ["FAILED", "NO_OBSERVED_CHANGE"].includes(p.status),
            )
          )
            continue;
          const record = {
            route: route.route,
            viewport,
            control_id: c.id,
            name: c.name,
            tag: c.tag,
          };
          if (c.disabled) {
            report.results.push({
              ...record,
              status: "BLOCKED",
              reason: "Disabled in this state; no provider success inferred",
            });
            continue;
          }
          const localLink =
            c.tag === "a" &&
            c.href &&
            (c.href.startsWith("#") ||
              inventory.routes.some(
                (p) => p.route === c.href.replace(/\/$/, ""),
              ) ||
              c.href === "/");
          const approved =
            (c.tag === "button" && policy.buttons.includes(c.name)) ||
            localLink ||
            c.tag === "summary";
          if (!approved) {
            report.results.push({
              ...record,
              status: "SKIPPED",
              reason:
                "Outside click allowlist; inputs exercised by named journey tests where available",
            });
            continue;
          }
          try {
            await page.goto(origin + route.route, { waitUntil: "load" });
            await page.locator("main").first().waitFor();
            await page.waitForTimeout(200);
            await page.evaluate(() => {
              localStorage.clear();
              sessionStorage.clear();
            });
            await page.evaluate(() => {
              const visible = (e) => {
                const r = e.getBoundingClientRect(),
                  s = getComputedStyle(e);
                return (
                  r.width > 0 &&
                  r.height > 0 &&
                  s.visibility !== "hidden" &&
                  s.display !== "none"
                );
              };
              [
                ...document.querySelectorAll(
                  'button,a[href],input,select,textarea,[role="button"],[role="tab"],dialog,summary',
                ),
              ]
                .filter(visible)
                .forEach((e, i) => (e.dataset.auditId = String(i)));
            });
            const selector = page.locator(`[data-audit-id="${c.id}"]`);
            if (
              (await selector.evaluate((e) => e.tagName.toLowerCase())) !==
              c.tag
            )
              throw Error("Inventory changed; requires rediscovery");
            const before = await fingerprint(page);
            const selected = await selector.evaluate(
              (e) =>
                e.getAttribute("aria-pressed") === "true" ||
                e.getAttribute("aria-selected") === "true" ||
                e.getAttribute("aria-current") === "page",
            );
            const sameLink =
              localLink &&
              !c.href.startsWith("#") &&
              new URL(c.href, origin).pathname === new URL(page.url()).pathname;
            let keyboardTarget = false;
            if (c.name.startsWith("Skip to ") && c.href?.startsWith("#")) {
              await selector.focus();
              await selector.press("Enter");
              keyboardTarget = await page.evaluate(
                (id) => document.activeElement.id === id,
                c.href.slice(1),
              );
              if (!keyboardTarget) {
                throw Error("Skip link did not focus its target");
              }
            } else await selector.click({ timeout: 2500 });
            await page.waitForTimeout(60);
            const after = await fingerprint(page);
            const changed = before !== after || keyboardTarget;
            const status = changed
              ? "PASSED"
              : selected || sameLink
                ? "PASSED_IDEMPOTENT"
                : "NO_OBSERVED_CHANGE";
            const result = {
              ...record,
              status,
              path: new URL(page.url()).pathname,
            };
            if (status === "NO_OBSERVED_CHANGE") {
              const file = `interaction-${viewport}-${++count}.png`;
              await page.screenshot({
                path: path.join(out, file),
                fullPage: true,
              });
              result.screenshot = file;
            }
            report.results.push(result);
          } catch (e) {
            report.results.push({
              ...record,
              status: "FAILED",
              reason: e.message.split("\n")[0].slice(0, 220),
            });
          }
        }
      }
      await context.tracing.stop({
        path: path.join(out, "interactions-" + viewport + ".zip"),
      });
      await context.close();
      console.log("Local interaction pass completed: " + viewport);
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
    report.counts = {};
    for (const r of report.results) {
      report.counts[r.status] = (report.counts[r.status] || 0) + 1;
    }
    fs.writeFileSync(
      path.join(
        process.env.GLAM_LAUNCH_EVIDENCE ||
          path.join(root, "docs/launch/evidence"),
        process.env.GLAM_INTERACTIONS_RECHECK === "1"
          ? "interactions-recheck.json"
          : "interactions.json",
      ),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report.counts));
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
