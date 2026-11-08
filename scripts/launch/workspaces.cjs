/** Safe review-layout traversal only; no real business role or privilege is activated. */
const { chromium } = require(
  "../../docs/design-preview/node_modules/playwright",
);
const { spawn } = require("node:child_process"),
  net = require("node:net"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, "../.."), a = net.createServer();
  await new Promise((r) => a.listen(0, "127.0.0.1", r));
  const port = a.address().port;
  await new Promise((r) => a.close(r));
  const origin = "http://127.0.0.1:" + port,
    server = spawn(process.execPath, [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ], { cwd: path.join(root, "apps/web"), stdio: "ignore" });
  let browser;
  const result = {
    observed_at: new Date().toISOString(),
    scope:
      "Public role/module inventory, not authenticated merchant/admin workflows",
    modules: [],
    errors: [],
  };
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const c = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      p = await c.newPage();
    await c.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: false,
    });
    await c.route(
      "**/*",
      (r) =>
        new URL(r.request().url()).origin === origin &&
          r.request().method() === "GET"
          ? r.continue()
          : r.abort("blockedbyclient"),
    );
    p.on("pageerror", (e) => result.errors.push(e.message));
    for (
      const [route, label, nav] of [[
        "/business",
        "Review workspace tools",
        "Workspace modules",
      ], ["/admin", "Review admin role layout", "Admin modules"]]
    ) {
      await p.goto(origin + route);
      const choices = await p.getByLabel(label, { exact: true }).locator(
        "option",
      ).evaluateAll((es) =>
        es.map((e) => ({ value: e.value, label: e.textContent }))
      );
      for (const choice of choices) {
        await p.getByLabel(label, { exact: true }).selectOption(choice.value);
        const count = await p.getByRole("navigation", { name: nav }).getByRole(
          "button",
        ).count();
        for (let index = 0; index < count; index++) {
          const button = p.getByRole("navigation", { name: nav }).getByRole(
            "button",
          ).nth(index);
          const name = (await button.innerText()).replace(/^\d+\s*/, "");
          await button.click();
          const heading = await p.locator("h1").innerText();
          const inputs = await p.locator(
            "main input, main textarea, main select, main button",
          ).evaluateAll((es) =>
            es.map((e) => ({
              tag: e.tagName.toLowerCase(),
              name: e.getAttribute("aria-label") || e.labels?.[0]?.innerText ||
                e.innerText || "",
              disabled: e.disabled === true,
            }))
          );
          result.modules.push({
            route,
            role: choice.value,
            module: name,
            heading,
            status: heading === name ? "PASSED_UI_LAYOUT" : "FAILED",
            controls: inputs,
          });
        }
        await p.screenshot({
          path: path.join(
            "/workspace/artifacts/glam-launch",
            route.slice(1) + "-" + choice.value.replaceAll(" ", "-") + ".png",
          ),
          fullPage: true,
        });
      }
    }
    await c.tracing.stop({
      path: path.join(process.env.GLAM_LAUNCH_ARTIFACTS || "/workspace/artifacts/glam-launch", "workspace-layouts.zip"),
    });
    await c.close();
  } finally {
    if (browser) await browser.close();
    server.kill();
    fs.writeFileSync(
      path.join(process.env.GLAM_LAUNCH_EVIDENCE || path.join(root, "docs/launch/evidence"), "workspace-layouts.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        modules: result.modules.length,
        failed: result.modules.filter((m) => m.status === "FAILED").length,
        errors: result.errors.length,
      }),
    );
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
