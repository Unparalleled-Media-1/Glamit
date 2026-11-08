/** Component-only planning-layout regression; these are never public production dashboard routes. */
const { build } = require("esbuild"),
  { chromium } = require("../../docs/design-preview/node_modules/playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const out =
    process.env.GLAM_WORKSPACE_ARTIFACTS || "/tmp/glam-workspace-review";
  fs.mkdirSync(out, { recursive: true });
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import BusinessPortal from './apps/web/components/BusinessPortal';import './apps/web/app/styles.css';import './apps/web/app/golden-tokens.css';import './apps/web/app/golden-screens.css';createRoot(document.getElementById('root')).render(<BusinessPortal admin={location.pathname==='/admin'}/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    outdir: "/tmp/glam-workspace-review-bundle",
    jsx: "automatic",
    external: ["/images/*"],
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_GLAM_BASE_PATH": '""',
    },
  });
  const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text,
    css = bundle.outputFiles.find((f) => f.path.endsWith(".css")).text;
  const server = http.createServer((q, r) => {
    const brandFile = new URL(q.url, "http://local").pathname;
    if (["/brand/wordmark.png", "/brand/favicon.png", "/brand/app-icon.png"].includes(brandFile)) {
      r.setHeader("Content-Type", "image/png");
      return r.end(fs.readFileSync(path.join("apps/web/public", brandFile)));
    }
    r.setHeader(
      "Content-Type",
      q.url === "/app.js"
        ? "application/javascript"
        : q.url === "/app.css"
          ? "text/css"
          : "text/html",
    );
    r.end(
      q.url === "/app.js"
        ? js
        : q.url === "/app.css"
          ? css
          : '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><p>Component layout review only · no authenticated dashboard or data</p><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;
  const checks = [];
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext(),
      page = await context.newPage();
    await context.route("https://**/*", (r) => r.abort("blockedbyclient"));
    page.on("dialog", (d) => d.dismiss());
    const pass = (s) => checks.push(s),
      capture = async (name) =>
        page.screenshot({
          path: path.join(out, "review-" + name + ".png"),
          fullPage: true,
        });
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
    for (const role of [
      "Super Admin",
      "Support",
      "Finance",
      "AI Operations",
      "Content Moderation",
      "Trust & Safety",
      "Compliance",
      "Regional Operations",
      "Read-Only Analyst",
    ]) {
      await page.getByLabel("Review admin role layout").selectOption(role);
      const modules = page
        .getByRole("navigation", { name: "Admin modules" })
        .getByRole("button");
      for (let i = 0; i < (await modules.count()); i++) {
        await modules.nth(i).click();
        assert.match(await page.locator("main h1").innerText(), /\S/);
      }
      if (role === "Read-Only Analyst") assert.equal(await modules.count(), 1);
    }
    pass(
      "All nine admin review layouts retain scoped modules; analyst is Analytics only",
    );
    await page.goto(origin + "/business");
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Snap & List/ })
      .click();
    await page
      .getByTestId("merchant-images")
      .setInputFiles(
        path.resolve(__dirname, "../../apps/web/public/images/products.webp"),
      );
    await page.getByText("Original · Unchanged", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: "Continue to enhancement options",
        exact: true,
      })
      .click();
    assert(
      await page
        .getByRole("button", {
          name: "Run AI preparation — connection required",
          exact: true,
        })
        .isDisabled(),
    );
    await page
      .getByRole("checkbox", { name: "Clean background", exact: true })
      .check();
    await page
      .getByRole("button", {
        name: "Continue with a manual listing draft",
        exact: true,
      })
      .click();
    for (const [label, value] of [
      ["Product title", "Session braiding extensions"],
      ["Source SKU / product identifier", "LOCAL-SKU-1"],
      ["Merchant price", "100.00"],
      ["Confirmed stock quantity", "5"],
      ["Delivery country code", "ZA"],
      ["Source evidence reference", "packaging-reference"],
      ["Merchant HTTPS destination", "https://merchant.invalid/product"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", {
        name: "Save reviewed session listing draft",
        exact: true,
      })
      .click();
    assert.match(
      await page.locator(".snap-list [role=status]").innerText(),
      /nothing|no listing/i,
    );
    await capture("merchant-snap-list-review");
    await page
      .getByRole("button", {
        name: "Save reviewed session listing draft",
        exact: true,
      })
      .click();
    assert.match(
      await page.locator(".snap-list [role=status]").innerText(),
      /already has a session draft/,
    );
    await page
      .getByRole("button", {
        name: "Review publication requirements",
        exact: true,
      })
      .click();
    assert(
      await page
        .getByRole("button", {
          name: "Publish — verified connections required",
          exact: true,
        })
        .isDisabled(),
    );
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Catalog Health/ })
      .click();
    assert.match(
      await page.locator("main").innerText(),
      /your actual session drafts/,
    );
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Draft Listings/ })
      .click();
    assert(
      await page
        .getByRole("heading", { name: "Session braiding extensions" })
        .isVisible(),
    );
    await page
      .getByRole("button", {
        name: "Delete session listing draft",
        exact: true,
      })
      .click();
    assert(
      await page
        .getByText("No session listing drafts.", { exact: true })
        .isVisible(),
    );
    const importedDraft = {
      id: "untrusted-import-id",
      title: "Imported session draft",
      category: "hair",
      sku: "IMPORTED-1",
      description: "Test-only facts",
      price: "20.00",
      currency: "ZAR",
      stock: "0",
      country: "ZA",
      source: "test-packaging",
      destination: "https://merchant.invalid/product",
      condition: "new",
      reviewed: true,
      photoCount: 8,
    };
    await page.getByTestId("merchant-bulk-import").setInputFiles({
      name: "drafts.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify([importedDraft])),
    });
    await page
      .getByRole("heading", { name: "Imported session draft", exact: true })
      .waitFor();
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download session draft JSON", exact: true })
      .click();
    const downloaded = await downloadEvent;
    const parsed = JSON.parse(fs.readFileSync(await downloaded.path(), "utf8"));
    assert.equal(parsed[0].reviewed, false);
    assert.equal(parsed[0].photoCount, 0);
    assert.notEqual(parsed[0].id, importedDraft.id);
    await page
      .getByRole("button", {
        name: "Delete session listing draft",
        exact: true,
      })
      .click();
    pass(
      "Snap & List originals, unavailable AI, manual factual review, duplicate rejection, session catalog health and publication guard",
    );

    fs.writeFileSync(
      path.join(out, "layout-review-results.json"),
      JSON.stringify(
        {
          scope:
            "Component-only public review harness; no real role, production route or backend acceptance",
          checks,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(checks));
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
