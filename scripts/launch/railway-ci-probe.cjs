/** Anonymous deployed evidence only. Never signs in, submits forms or calls payment APIs. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function approvedOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "glamit-web-production.up.railway.app" ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw Error("APPROVED_RAILWAY_ORIGIN_REQUIRED");
  return url.origin;
}
function revisionFromHealth(checks) {
  const revisions = checks
    .filter(
      (c) =>
        c.http_status === 200 &&
        c.content_type?.includes("application/json") &&
        ["web", "api"].includes(c.service),
    )
    .map((c) => c.commit)
    .filter((c) => /^[a-f0-9]{40}$/i.test(c || ""));
  return revisions.length && new Set(revisions).size === 1
    ? revisions[0]
    : null;
}
async function main() {
  const {
    chromium,
  } = require("../../docs/design-preview/node_modules/playwright");
  const origin = approvedOrigin(
    process.env.GLAM_DEPLOYED_ORIGIN ||
      "https://glamit-web-production.up.railway.app",
  );
  const out = process.env.GLAM_LAUNCH_ARTIFACTS || "/tmp/glam-railway-ci-probe";
  fs.mkdirSync(out, { recursive: true });
  const inventory = JSON.parse(
    fs.readFileSync(
      "docs/launch/evidence/railway-rescue/source-inventory.json",
    ),
  );
  const summary = JSON.parse(
    fs.readFileSync("docs/launch/evidence/launch-summary.json"),
  );
  inventory.routes = [
    ...new Set([
      ...inventory.routes,
      "/register",
      "/business/login",
      "/business/register",
      "/admin/login",
    ]),
  ];
  const report = {
    observed_at: new Date().toISOString(),
    origin,
    scope:
      "Actual deployed anonymous read-only HTTP/browser checks; not authenticated journeys or provider acceptance",
    runner_commit: process.env.GITHUB_SHA || null,
    run_url: process.env.GITHUB_RUN_ID
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    deployed_commit: null,
    railway_logs_available: false,
    status: "BLOCKED",
    health: [],
    routes: [],
    assets: [],
    workspace_entry: [],
    errors: [],
    mutations_blocked: 0,
    critical_journeys: summary.workflows.map((w) => ({
      id: w.id,
      name: w.name,
      status: "BLOCKED",
      expected: "Complete the actual qualified deployed journey",
      actual: "Anonymous route probing does not execute this journey",
      defect: "D111",
      evidence: "report.json",
      deployed_commit: null,
    })),
  };
  let browser, context;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    await context.route("**/*", (route) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
        report.mutations_blocked++;
        return route.abort("blockedbyclient");
      }
      return route.continue();
    });
    for (const endpoint of [
      "/api/health/live",
      "/api/health/ready",
      "/health/live",
      "/health/ready",
    ]) {
      try {
        const response = await context.request.get(origin + endpoint, {
          timeout: 15000,
          maxRedirects: 0,
        });
        const content_type = response.headers()["content-type"] || "";
        const body = content_type.includes("application/json")
          ? await response.json().catch(() => ({}))
          : {};
        report.health.push({
          endpoint,
          http_status: response.status(),
          content_type,
          status: body.status || null,
          service: body.service || null,
          commit: body.commit || null,
          scope: body.scope || null,
        });
      } catch {
        report.health.push({ endpoint, error: "HTTPS_REQUEST_FAILED" });
      }
    }
    report.deployed_commit = revisionFromHealth(report.health);
    const page = await context.newPage();
    page.on("pageerror", () =>
      report.errors.push({
        type: "UNCAUGHT_PAGE_ERROR",
        route: new URL(page.url()).pathname,
      }),
    );
    page.on("response", (r) => {
      if (r.status() >= 400)
        report.errors.push({
          type: "HTTP_ERROR",
          status: r.status(),
          url: new URL(r.url()).origin + new URL(r.url()).pathname,
        });
    });
    let reached = false;
    try {
      const response = await page.goto(origin, {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      report.initial_http_status = response?.status() || null;
      reached = Boolean(response?.ok());
      report.status = reached
        ? "ANONYMOUS_ROUTE_PROBE_ONLY"
        : "FAILED_INITIAL_HTTP";
      await page.screenshot({ path: path.join(out, "initial-desktop.png") });
      const icons = await page
        .locator('link[rel~="icon"],link[rel="apple-touch-icon"]')
        .evaluateAll((nodes) =>
          nodes.map((n) => ({ rel: n.rel, url: n.href })),
        );
      const branding = await page
        .locator('header img, nav img, img[alt*="GLAM" i]')
        .evaluateAll((nodes) => nodes.map((n) => ({ alt: n.alt, url: n.src })));
      report.branding = {
        icons,
        images: branding,
        reference_artwork_available: false,
      };
      for (const asset of [...icons, ...branding]) {
        const url = new URL(asset.url);
        if (url.origin !== origin) continue;
        const res = await context.request.get(url.href, {
          timeout: 15000,
          maxRedirects: 0,
        });
        const bytes = await res.body();
        report.assets.push({
          url: url.origin + url.pathname,
          http_status: res.status(),
          content_type: res.headers()["content-type"],
          sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        });
      }
    } catch {
      report.status = "BLOCKED_NETWORK_OR_INITIAL_NAVIGATION";
    }
    if (reached)
      for (const viewport of [
        { name: "desktop", width: 1440, height: 1000 },
        { name: "mobile-web", width: 390, height: 844 },
      ]) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        for (const [index, route] of inventory.routes.entries()) {
          const item = {
            route,
            viewport: viewport.name,
            expected: "HTTPS page loads without HTTP failure",
            observed_at: new Date().toISOString(),
            deployed_commit: report.deployed_commit,
          };
          try {
            const response = await page.goto(origin + route, {
              waitUntil: "domcontentloaded",
              timeout: 15000,
            });
            await page.waitForTimeout(250);
            item.http_status = response?.status() || null;
            item.status = response?.ok() ? "HTTP_ROUTE_ONLY" : "FAILED_HTTP";
            item.title = await page.title();
            if (
              viewport.name === "desktop" &&
              ["/business", "/admin"].includes(route)
            )
              report.workspace_entry.push({
                route,
                scope: "Actual anonymous deployed DOM only",
                public_role_picker_count: await page
                  .locator(
                    'select[aria-label="Review workspace tools"],select[aria-label="Review admin role layout"]',
                  )
                  .count(),
                tool_navigation_count: await page
                  .locator(
                    'nav[aria-label="Workspace modules"],nav[aria-label="Admin modules"]',
                  )
                  .count(),
                sign_in_entries: await page
                  .getByRole("link", { name: /sign in/i })
                  .count(),
                registration_entries: await page
                  .getByRole("link", {
                    name: /register.*account|create.*account/i,
                  })
                  .count(),
              });
            item.overflow = await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            );
            item.screenshot = `${viewport.name}-${String(index).padStart(2, "0")}.png`;
            await page.screenshot({ path: path.join(out, item.screenshot) });
          } catch {
            item.status = "BLOCKED";
            item.error = "NAVIGATION_UNAVAILABLE";
          }
          report.routes.push(item);
        }
      }
    else
      report.routes = inventory.routes.map((route) => ({
        route,
        status: "BLOCKED",
        reason: report.status,
      }));
  } catch {
    report.status = "BLOCKED_BROWSER_OR_PROBE";
  } finally {
    if (context)
      await context.tracing
        .stop({ path: path.join(out, "trace.zip") })
        .catch(() => {});
    await browser?.close();
    report.critical_journeys.forEach(
      (w) => (w.deployed_commit = report.deployed_commit),
    );
    report.counts = {
      http_routes_checked: report.routes.filter((r) => r.http_status != null)
        .length,
      http_routes_success: report.routes.filter(
        (r) => r.status === "HTTP_ROUTE_ONLY",
      ).length,
      blocked_routes: report.routes.filter((r) => r.status === "BLOCKED")
        .length,
      critical_passed: 0,
      critical_blocked: report.critical_journeys.length,
    };
    report.decision = "NO-GO";
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        status: report.status,
        deployed_commit: report.deployed_commit,
        counts: report.counts,
        decision: report.decision,
      }),
    );
    if (process.env.GITHUB_ACTIONS === "true") {
      const receipt = {
        observed_at: report.observed_at,
        origin,
        run_url: report.run_url,
        status: report.status,
        deployed_commit: report.deployed_commit,
        health: report.health,
        counts: report.counts,
        workspace_entry: report.workspace_entry,
        branding: report.branding,
        assets: report.assets,
        errors: report.errors.slice(0, 20),
        mutations_blocked: report.mutations_blocked,
        decision: report.decision,
      };
      const escaped = JSON.stringify(receipt)
        .replaceAll("%", "%25")
        .replaceAll("\r", "%0D")
        .replaceAll("\n", "%0A");
      console.log(
        "::notice title=Railway read-only evidence receipt::" + escaped,
      );
    }
  }
}
module.exports = { approvedOrigin, revisionFromHealth };
if (require.main === module)
  main().catch(() => {
    console.error("DEPLOYED_PROBE_CONFIGURATION_FAILED");
    process.exitCode = 1;
  });
