/** Packaged frontend smoke test. Does not connect to or modify the GoDaddy website. */
const { chromium } = require(
  "../../docs/design-preview/node_modules/playwright",
);
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const assert = require("node:assert/strict");
(async () => {
  const root = path.resolve("dist/godaddy-web");
  assert.ok(fs.existsSync(path.join(root, ".htaccess")));
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://local").pathname,
    );
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file)) file = path.join(root, "index.html");
    const ext = path.extname(file);
    res.setHeader(
      "Content-Type",
      ({
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".webp": "image/webp",
      })[ext] || "application/octet-stream",
    );
    res.end(fs.readFileSync(file));
  });
  let browser;
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      }),
      errors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://**/*", (route) => {
      if (
        route.request().url() ===
          "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1/settings"
      ) {
        return route.fulfill({
          status: 200,
          json: {
            external: {
              phone: false,
              google: false,
              apple: false,
              facebook: false,
            },
          },
        });
      }
      external.push(new URL(route.request().url()).origin);
      return route.abort();
    });
    const origin = "http://127.0.0.1:" + server.address().port;
    for (
      const route of [
        "/",
        "/login/",
        "/auth/callback/",
        "/profile/",
        "/analyze/",
        "/studio/",
        "/business/",
        "/admin/",
      ]
    ) {
      await page.goto(origin + route);
      await page.locator("h1").first().waitFor();
      assert.ok(await page.locator("body").innerText());
      assert.equal(
        await page.getByText("INTERACTIVE DESIGN REVIEW", { exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.scrollWidth > innerWidth
        ),
        false,
        route + " horizontal overflow",
      );
    }
    await page.goto(origin + "/login/");
    await page.getByRole("heading", { name: "Sign in to GLAM Beauty", exact: true })
      .waitFor();
    await page.getByText("SMS sign-in isn’t available right now.", {
      exact: false,
    }).waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Continue with SMS", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page.getByRole("button", {
        name: "Continue with Google",
        exact: true,
      }).count(),
      0,
    );
    const evidence = process.env.GLAM_AUTH_EVIDENCE_DIR ||
      "/tmp/glam-auth-artifacts";
    fs.mkdirSync(evidence, { recursive: true });
    await page.screenshot({
      path: path.join(evidence, "glam-auth-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: path.join(evidence, "glam-auth-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("link", {
      name: "Explore GLAM Beauty as a guest",
      exact: true,
    }).click();
    await page.getByRole("heading", { name: /Your next look/ }).waitFor();
    await page.goto(origin + "/profile/");
    await page.getByText("SMS sign-in isn’t available right now.", {
      exact: false,
    }).waitFor();
    await page.getByRole("button", {
      name: "Use an existing email and password",
    }).click();
    await page.getByLabel("Email", { exact: true }).waitFor();
    await page.getByText(
      "Sign-in available · AI and shopping connections pending",
      { exact: true },
    ).waitFor();
    assert.equal(
      await page.getByLabel("Password", { exact: true }).getAttribute("type"),
      "password",
    );
    await page.getByRole("button", { name: "Sign in", exact: true })
      .scrollIntoViewIfNeeded();
    const rect = await page.getByRole("button", {
      name: "Sign in",
      exact: true,
    }).boundingBox();
    const nav = await page.getByRole("navigation", {
      name: "Personal navigation",
      exact: true,
    }).boundingBox();
    assert.ok(
      rect && nav && rect.y + rect.height <= nav.y,
      "Sign-in control must be above fixed mobile navigation",
    );
    if (process.env.GLAM_CAPTURE_PACKAGE_SCREENSHOT) {
      await page.screenshot({
        path: "/workspace/artifacts/glam-godaddy-profile-mobile.png",
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      "GoDaddy package: 8 route loads, mobile scrolling, account fields and no unexpected external requests passed.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
