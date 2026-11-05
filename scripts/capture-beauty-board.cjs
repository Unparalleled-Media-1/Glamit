/** Capture a review sheet from actual application screenshots over loopback HTTP. */
const { chromium } = require("../docs/design-preview/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
(async () => {
  const root = path.resolve("docs/application-preview");
  const files = new Map(
    [
      "/visual-review.html",
      "/mobile-home.png",
      "/mobile-beauty-analysis.png",
      "/mobile-beauty-studio.png",
    ].map((n) => [n, path.join(root, n.slice(1))]),
  );
  const server = http.createServer((req, res) => {
    const file = files.get(req.url);
    if (!file) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {
      "Content-Type": file.endsWith(".png")
        ? "image/png"
        : "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    browser = await chromium.launch({
      executablePath: fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1100 },
      deviceScaleFactor: 1,
    });
    await page.goto(
      `http://127.0.0.1:${server.address().port}/visual-review.html`,
    );
    await page
      .locator("img")
      .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
    await page.screenshot({
      path: path.join(root, "visual-review.png"),
      fullPage: true,
    });
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
