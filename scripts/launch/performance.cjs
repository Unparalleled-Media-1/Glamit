/** Local lab observations only. Never presented as production Core Web Vitals or load certification. */
const { chromium } = require(
  "../../docs/design-preview/node_modules/playwright",
);
const fs = require("node:fs"),
  path = require("node:path"),
  { spawn } = require("node:child_process"),
  net = require("node:net");
(async () => {
  const a = net.createServer();
  await new Promise((r) => a.listen(0, "127.0.0.1", r));
  const port = a.address().port;
  await new Promise((r) => a.close(r));
  const origin = "http://127.0.0.1:" + port,
    root = path.resolve(__dirname, "../.."),
    s = spawn(process.execPath, [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ], { cwd: path.join(root, "apps/web"), stdio: "ignore" });
  let b;
  const report = {
    observed_at: new Date().toISOString(),
    scope:
      "Single-run local Chromium lab, no CPU/network throttling. LCP/CLS observations do not establish production CWV, INP, load capacity or real-device performance.",
    pages: [],
  };
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    b = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    for (
      const route of [
        "/",
        "/analyze",
        "/results",
        "/studio",
        "/shop",
        "/product",
        "/login",
      ]
    ) {
      const c = await b.newContext({ viewport: { width: 390, height: 844 } });
      await c.route(
        "**/*",
        (r) =>
          new URL(r.request().url()).origin === origin
            ? r.continue()
            : r.abort("blockedbyclient"),
      );
      await c.addInitScript(() => {
        window.__auditPerformance = { lcp: null, cls: 0 };
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) {
            window.__auditPerformance.lcp = e.startTime;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) {
            if (!e.hadRecentInput) window.__auditPerformance.cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      const p = await c.newPage();
      await p.goto(origin + route, { waitUntil: "networkidle" });
      const data = await p.evaluate(() => ({
        lcp_ms: window.__auditPerformance.lcp,
        cls: window.__auditPerformance.cls,
        fcp_ms: performance.getEntriesByName("first-contentful-paint")[0]
          ?.startTime ?? null,
        transfer_bytes: performance.getEntriesByType("resource").reduce(
          (n, r) => n + r.transferSize,
          0,
        ),
      }));
      report.pages.push({ route, ...data });
      await c.close();
    }
  } finally {
    if (b) await b.close();
    s.kill();
    fs.writeFileSync(
      path.join(root, "docs/launch/evidence/local-performance.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({ pages: report.pages.length, scope: report.scope }),
    );
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
