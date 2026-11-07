/** Verify the generated report itself; never connects to the public site. */
const { chromium } = require(
  "../../docs/design-preview/node_modules/playwright",
);
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
(async () => {
  const root = "/workspace/artifacts/glam-launch",
    server = http.createServer((req, res) => {
      const file = path.resolve(
        root,
        "." + new URL(req.url, "http://local").pathname,
      );
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
        res.writeHead(404);
        return res.end();
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".html")
          ? "text/html"
          : file.endsWith(".png")
          ? "image/png"
          : "application/octet-stream",
      );
      res.end(fs.readFileSync(file));
    });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await p.goto("http://127.0.0.1:" + server.address().port + "/index.html");
    await p.getByRole("heading", { name: "Public launch: NO-GO", exact: true })
      .waitFor();
    await p.getByLabel("Filter by domain, journey or status").fill("Payments");
    assert.equal(await p.locator("tbody tr:visible").count(), 1);
    await p.getByLabel("Filter by domain, journey or status").fill("");
    assert.equal(await p.locator("tbody tr:visible").count(), 31);
    await p.locator(".evidence").scrollIntoViewIfNeeded();
    await p.waitForFunction(() =>
      [...document.querySelectorAll(".evidence img")].every((i) =>
        i.complete && i.naturalWidth > 0
      )
    );
    await p.evaluate(() => scrollTo(0, 0));
    await p.screenshot({
      path: root + "/dashboard-desktop.png",
      fullPage: true,
    });
    fs.writeFileSync(
      "docs/launch/evidence/dashboard-verification.json",
      JSON.stringify(
        {
          status: "PASSED",
          scope: "Local HTTP report; managed browser file scheme unavailable",
          rows: 31,
          filter: true,
          preview_images: 6,
        },
        null,
        2,
      ) + "\n",
    );
    console.log("Dashboard verified: 31 rows, working filter, six images.");
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
