/** Build review sheets from actual candidate captures without synthesizing app results. */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("../docs/design-preview/node_modules/playwright");
(async () => {
  const root = path.resolve("docs/application-preview");
  const studies = [
    ["home", "Home"],
    ["analyze", "Face Analysis"],
    ["studio", "AI Studio"],
    ["shop", "Shop"],
    ["product", "Product Detail"],
    ["results", "Personalized Results"],
  ];
  const css = `*{box-sizing:border-box}body{margin:0;background:#f5ebe5;color:#33242c;padding:42px;font:12px Arial,sans-serif}header{display:flex;align-items:center;justify-content:space-between}header strong{font-size:21px}header span{font-size:9px;letter-spacing:2px;color:#946c81}h1{font:400 40px Georgia,serif;letter-spacing:-1px;margin:25px 0 12px}h1 em{color:#a56e8b}p{font-size:11px;color:#8f6c80;line-height:1.8;margin:0 0 25px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px}.desktop .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.cell{min-width:0}.cell img{display:block;width:100%;border:4px solid #2d222a;border-radius:22px;box-shadow:0 12px 30px #4b23331a}.desktop .cell img{border-radius:12px}.cell a{color:inherit;text-decoration:none}.cell h2{font-size:11px;font-weight:500;margin:15px 0}.cell span{font-size:8px;letter-spacing:1px;color:#9a7187}footer{margin-top:25px;padding-top:18px;border-top:1px solid #d9c4ce;font-size:9px;color:#896677;line-height:1.8}`;
  for (const device of ["iphone", "desktop"]) {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLAM AI — Golden Screen Review</title><style>${css}</style></head><body class="${device}"><header><strong>✧ GLAM AI</strong><span>FIVE APPROVED PATTERNS + RESULTS / FUNCTIONAL VALIDATION PENDING</span></header><h1>One journey.<br/><em>Six connected experiences.</em></h1><p>${device === "iphone" ? "Phone" : "Desktop"} captures of the actual responsive application. Native device appearance remains unverified.</p><main class="grid">${studies.map(([route, title], i) => `<article class="cell"><a href="golden/${device}-${route}.png"><img src="golden/${device}-${route}.png" alt="Actual ${title} candidate screen"></a><h2>0${i + 1} / ${title}</h2><span>${route === "shop" || route === "product" ? "EDITORIAL PRODUCT STUDY" : route === "analyze" ? "PHOTO PREPARATION, NOT AN ACTIVE SCAN" : "ACTUAL INTERACTIVE UI"}</span></article>`).join("")}</main><footer>Original editorial imagery. Personal analysis and generation remain unconnected. No product price, merchant, inventory, review, fit or purchase is fabricated.<br/>Separate uncomputed-report state: <a href="golden/${device}-report.png">review report capture</a>. Existing backend, database, auth and 10% item policy remain unchanged.</footer></body></html>`;
    fs.writeFileSync(path.join(root, `golden-${device}-review.html`), html);
  }
  const allowed = new Set([
    "/golden-iphone-review.html",
    "/golden-desktop-review.html",
    ...["iphone", "desktop"].flatMap((d) =>
      studies.map(([r]) => `/golden/${d}-${r}.png`),
    ),
  ]);
  const server = http.createServer((req, res) => {
    if (!allowed.has(req.url)) {
      res.writeHead(404);
      return res.end();
    }
    const file = path.join(root, req.url.slice(1));
    res.writeHead(200, {
      "Content-Type": file.endsWith(".html") ? "text/html" : "image/png",
    });
    fs.createReadStream(file).pipe(res);
  });
  let browser;
  try {
    await new Promise((r, j) => {
      server.once("error", j);
      server.listen(0, "127.0.0.1", r);
    });
    browser = await chromium.launch({
      executablePath: fs.existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined,
      args: ["--no-sandbox"],
    });
    for (const d of ["iphone", "desktop"]) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 1000 },
      });
      await page.goto(
        `http://127.0.0.1:${server.address().port}/golden-${d}-review.html`,
      );
      await page
        .locator("img")
        .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
      await page.screenshot({
        path: path.join(root, `golden-${d}-review.png`),
        fullPage: true,
      });
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
