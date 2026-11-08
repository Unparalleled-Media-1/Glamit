/** Local-only audit. External requests are blocked; never executes unallowlisted actions. */
const { chromium } = require(
  "../../docs/design-preview/node_modules/playwright",
);
const { default: AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  net = require("node:net"),
  { spawn } = require("node:child_process");
const ROOT = path.resolve(__dirname, "../.."),
  EVIDENCE = process.env.GLAM_LAUNCH_EVIDENCE || path.join(ROOT, "docs/launch/evidence");
const OUTPUT = process.env.GLAM_LAUNCH_ARTIFACTS ||
  "/workspace/artifacts/glam-launch";
fs.mkdirSync(OUTPUT, { recursive: true });
const reportPath = process.env.GLAM_LAUNCH_REPORT ||
  path.join(EVIDENCE, "clickthrough.json");
const source = JSON.parse(
  fs.readFileSync(path.join(EVIDENCE, "source-inventory.json")),
);
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "iphone-web", width: 390, height: 844 },
  { name: "android-web", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "landscape-web", width: 844, height: 390 },
];
const core = [
  "/",
  "/analyze",
  "/results",
  "/studio",
  "/shop",
  "/product",
  "/login",
  "/profile",
  "/event",
  "/destination",
  "/builder",
  "/business",
  "/admin",
];
const report = {
  observed_at: new Date().toISOString(),
  source_commit: source.source_commit,
  artifact_directory: OUTPUT,
  scope:
    "Local Next production application. Browser viewport emulation is not native evidence. External traffic blocked; no provider doubles or live operations.",
  routes: [],
  requests: [],
  errors: [],
  console: [],
  external_blocked: [],
  interactions: [],
};
function safeError(text) {
  return String(text).replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]").slice(
    0,
    400,
  );
}
async function inventory(page) {
  return page.evaluate(() => {
    const visible = (e) => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" &&
        s.display !== "none";
    };
    const name = (e) =>
      e.getAttribute("aria-label") ||
      (e.getAttribute("aria-labelledby") || "").split(" ").map((id) =>
        document.getElementById(id)?.textContent || ""
      ).join(" ").trim() || [...(e.labels || [])].map((l) =>
        l.textContent
      ).join(" ").trim() || e.textContent?.trim() || e.getAttribute("alt") ||
      e.getAttribute("title") || "";
    const nodes = [
      ...document.querySelectorAll(
        'button,a[href],input,select,textarea,[role="button"],[role="tab"],dialog,summary',
      ),
    ].filter(visible);
    const controls = nodes.map((e, i) => {
      e.dataset.auditId = String(i);
      const r = e.getBoundingClientRect();
      return {
        id: i,
        tag: e.tagName.toLowerCase(),
        role: e.getAttribute("role"),
        type: e.type || null,
        name: name(e).replace(/\s+/g, " ").slice(0, 180),
        disabled: e.disabled === true ||
          e.getAttribute("aria-disabled") === "true",
        href: e.getAttribute("href"),
        width: Math.round(r.width),
        height: Math.round(r.height),
        scope: e.closest("nav")
          ? "navigation"
          : e.closest("main")
          ? "main"
          : "shell",
        options: e.tagName === "SELECT"
          ? [...e.options].map((o) => ({
            value: o.value,
            label: o.textContent,
          }))
          : undefined,
      };
    });
    return {
      heading: document.querySelector("h1")?.textContent || null,
      controls,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      broken_images: [...document.images].filter((i) =>
        !i.complete || i.naturalWidth === 0
      ).map((i) => ({ src: i.getAttribute("src"), alt: i.alt })),
      unnamed: controls.filter((c) => !c.name && c.type !== "hidden").map((c) =>
        c.id
      ),
      small_targets: controls.filter((c) =>
        !c.disabled && ["button", "a"].includes(c.tag) &&
        (c.width < 24 || c.height < 24)
      ).map((c) => ({
        id: c.id,
        name: c.name,
        width: c.width,
        height: c.height,
      })),
      body_excerpt: document.querySelector("main")?.innerText.slice(0, 180) ||
        "",
      dialogs: document.querySelectorAll('dialog[open],[role="dialog"]').length,
    };
  });
}
(async () => {
  const allocation = net.createServer();
  await new Promise((r) => allocation.listen(0, "127.0.0.1", r));
  const port = allocation.address().port;
  await new Promise((r) => allocation.close(r));
  const origin = "http://127.0.0.1:" + port;
  let logs = "", browser;
  const server = spawn(process.execPath, [
    require.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ], {
    cwd: path.join(ROOT, "apps/web"),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => logs += d);
  server.stderr.on("data", (d) => logs += d);
  try {
    const deadline = Date.now() + 30000;
    while (true) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      if (server.exitCode !== null || Date.now() > deadline) {
        throw Error("local_server_unavailable");
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ||
        "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    for (
      const viewport of viewports.filter((v) =>
        !process.env.GLAM_AUDIT_VIEWPORTS ||
        process.env.GLAM_AUDIT_VIEWPORTS.split(",").includes(v.name)
      )
    ) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce",
        recordVideo: process.env.GLAM_AUDIT_VIDEO === "1"
          ? {
            dir: path.join(OUTPUT, "video"),
            size: { width: viewport.width, height: viewport.height },
          }
          : undefined,
      });
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: false,
      });
      const page = await context.newPage();
      let current = "";
      page.on(
        "pageerror",
        (e) =>
          report.errors.push({
            viewport: viewport.name,
            route: current,
            error: safeError(e.message),
          }),
      );
      page.on("console", (m) => {
        if (m.type() === "error") {
          report.console.push({
            viewport: viewport.name,
            route: current,
            error: safeError(m.text()),
          });
        }
      });
      page.on("response", (r) => {
        if (r.status() >= 400) {
          report.requests.push({
            viewport: viewport.name,
            route: current,
            path: new URL(r.url()).pathname,
            status: r.status(),
          });
        }
      });
      await context.route("**/*", (route) => {
        const u = new URL(route.request().url());
        if (u.origin === origin || ["data:", "blob:"].includes(u.protocol)) {
          return route.continue();
        }
        report.external_blocked.push({
          viewport: viewport.name,
          route: current,
          origin: u.origin,
          path: u.pathname,
          method: route.request().method(),
        });
        return route.abort("blockedbyclient");
      });
      const routes = process.env.GLAM_AUDIT_ROUTES
        ? process.env.GLAM_AUDIT_ROUTES.split(",").filter((r) =>
          source.routes.includes(r)
        )
        : ["desktop", "iphone-web"].includes(viewport.name)
        ? source.routes
        : core;
      for (const route of routes) {
        current = route;
        await page.goto(origin + route, { waitUntil: "networkidle" });
        await page.locator("main").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const result = await inventory(page);
        if (process.env.GLAM_AUDIT_AXE === "1") {
          const axe = await new AxeBuilder({ page }).withTags([
            "wcag2a",
            "wcag2aa",
            "wcag21aa",
            "wcag22aa",
          ]).analyze();
          result.accessibility = {
            engine: axe.testEngine.version,
            violations: axe.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                failureSummary: n.failureSummary,
              })),
            })),
            incomplete: axe.incomplete.map((v) => ({
              id: v.id,
              nodes: v.nodes.length,
            })),
          };
        }
        const filename = viewport.name + "-" +
          (route === "/" ? "home" : route.slice(1).replaceAll("/", "-")) +
          ".png";
        await page.screenshot({
          path: path.join(OUTPUT, filename),
          fullPage: true,
        });
        report.routes.push({
          route,
          viewport: viewport.name,
          ...result,
          screenshot: filename,
        });
      }
      await context.tracing.stop({
        path: path.join(OUTPUT, viewport.name + ".zip"),
      });
      await context.close();
      console.log(
        "Inventoried " + viewport.name + ": " + routes.length + " routes",
      );
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
    fs.writeFileSync(path.join(OUTPUT, "server.log"), safeError(logs));
    report.finished_at = new Date().toISOString();
    report.counts = {
      routes: source.routes.length,
      route_viewport_visits: report.routes.length,
      rendered_control_occurrences: report.routes.reduce(
        (n, r) => n + r.controls.length,
        0,
      ),
      console_errors: report.console.length,
      page_errors: report.errors.length,
      http_errors: report.requests.length,
      overflow: report.routes.filter((r) => r.overflow).length,
      broken_images: report.routes.reduce(
        (n, r) => n + r.broken_images.length,
        0,
      ),
      accessibility_violations: report.routes.reduce(
        (n, r) => n + (r.accessibility?.violations.length || 0),
        0,
      ),
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report.counts));
    if (
      process.env.GLAM_AUDIT_STRICT === "1" &&
      (report.counts.console_errors || report.counts.page_errors ||
        report.counts.http_errors || report.counts.overflow ||
        report.counts.broken_images || report.counts.accessibility_violations)
    ) process.exitCode = 1;
  }
})().catch((e) => {
  console.error(safeError(e.message));
  process.exitCode = 1;
});
