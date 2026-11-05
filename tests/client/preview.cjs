const {
  chromium,
} = require("../../docs/design-preview/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
(async () => {
  const root = path.resolve("dist/interactive-preview");
  const base = "/Glamit";
  const errors = [];
  const external = [];
  let browser;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith(base + "/")) {
      res.writeHead(404);
      return res.end();
    }
    let relative = decodeURIComponent(url.pathname.slice(base.length + 1));
    if (!relative || relative.endsWith("/")) relative += "index.html";
    let file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(404);
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    const mime = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".webp": "image/webp",
    };
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
      executablePath: fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1150 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (
        new URL(r.url()).origin !== origin &&
        !r.url().startsWith("blob:") &&
        !r.url().startsWith("data:")
      )
        external.push(r.url());
    });
    await page.goto(origin + base + "/");
    await page.getByRole("heading", { name: "Explore GLAM AI." }).waitFor();
    let app = page.frameLocator("iframe");
    await app
      .getByRole("button", { name: "Analyze My Face", exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator("iframe")
        .evaluate((n) => Math.round(n.getBoundingClientRect().width)),
      390,
    );
    await app
      .getByRole("button", { name: "Analyze My Face", exact: true })
      .click();
    await app
      .getByRole("button", { name: "Choose my photo", exact: true })
      .click();
    assert(await app.getByTestId("photo-input").isDisabled());
    await app.getByRole("checkbox").check();
    await app
      .getByTestId("photo-input")
      .setInputFiles(path.resolve("apps/web/public/images/editorial.webp"));
    await app
      .getByRole("heading", { name: "Photo review", exact: true })
      .waitFor();
    assert.match(await app.locator("main").innerText(), /Not uploaded/);

    await page.getByLabel("Preview journey").selectOption("4");
    app = page.frameLocator("iframe");
    await app
      .getByRole("button", { name: "Makeup Match", exact: true })
      .click();
    await app.getByRole("button", { name: "Berry", exact: true }).click();
    await app
      .getByRole("button", { name: "Berry swatch 4", exact: true })
      .click();
    await app.getByRole("button", { name: /Use direction in my look/ }).click();
    assert.match(
      await app.locator(".look-summary").innerText(),
      /Berry color mood 04/,
    );
    await page.getByRole("button", { name: "Desktop", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("iframe").getBoundingClientRect().width > 1000,
    );
    assert((await page.locator("iframe").boundingBox()).width > 1000);
    await page.getByLabel("Preview journey").selectOption("7");
    app = page.frameLocator("iframe");
    await app
      .getByRole("heading", { name: "Snap & List", exact: true })
      .waitFor();
    await page.getByLabel("Preview journey").selectOption("8");
    app = page.frameLocator("iframe");
    await app
      .getByRole("button", { name: "Switch workspace", exact: true })
      .click();
    assert.match(
      await app.getByRole("dialog").innerText(),
      /No business workspaces are authorized/,
    );
    await page.getByLabel("Preview journey").selectOption("1");
    app = page.frameLocator("iframe");
    await app
      .getByRole("button", { name: "Explore without a photo", exact: true })
      .click();
    await app
      .getByRole("button", { name: "Check analysis availability", exact: true })
      .click();
    assert.match(
      await app.locator("main").innerText(),
      /not connected|not available|not been analyzed/i,
    );
    const capabilities = await (
      await fetch(origin + base + "/app/api/capabilities.json")
    ).json();
    assert.equal(capabilities.analysis, false);
    assert.equal(capabilities.billing, false);
    for (const route of [
      "app/",
      "app/builder/",
      "app/business/",
      "app/admin/",
      "app/studio/",
      "app/shop/",
      "app/product/",
    ])
      assert.equal((await fetch(origin + base + "/" + route)).status, 200);
    await page.getByLabel("Preview journey").selectOption("9");
    app = page.frameLocator("iframe");
    await app.getByRole("button", { name: "Makeup", exact: true }).click();
    assert.equal(await app.locator(".golden-product-card").count(), 2);
    await page.getByLabel("Preview journey").selectOption("10");
    app = page.frameLocator("iframe");
    await app
      .getByRole("heading", { name: "The velvet lip.", exact: true })
      .waitFor();
    assert.match(await app.locator("main").innerText(), /Offer not verified/);
    await page.getByLabel("Preview journey").selectOption("0");
    await page.getByRole("button", { name: "Phone", exact: true }).click();
    await app
      .getByRole("button", { name: "Analyze My Face", exact: true })
      .waitFor();
    await page.screenshot({
      path: "docs/application-preview/interactive-preview-hub.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      "PASS static preview: repository-prefixed assets/routes, phone/desktop viewport, real app journeys, Studio handoff, Merchant Snap & List, denied switching and disconnected capabilities; no external requests or runtime errors",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
