/** UI regression uses explicit doubles; real provider evidence is live-regression.json. */
const { build } = require("esbuild");
const { chromium } = require(
  "../../docs/design-preview/node_modules/playwright",
);
const http = require("node:http");
const assert = require("node:assert/strict");
(async () => {
  const bundle = await build({
    stdin: {
      contents:
        `import React from 'react'; import {createRoot} from 'react-dom/client'; import HostedAccount from './apps/web/components/HostedAccount'; createRoot(document.getElementById('root')).render(<HostedAccount/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"ui-fixture-public-key"',
      "process.env.NODE_ENV": '"test"',
    },
  });
  const server = http.createServer((req, res) => {
    res.setHeader(
      "Content-Type",
      req.url === "/app.js" ? "application/javascript" : "text/html",
    );
    res.end(
      req.url === "/app.js"
        ? bundle.outputFiles[0].text
        : '<div id="root"></div><script src="/app.js"></script>',
    );
  });
  let browser;
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ||
        (require("node:fs").existsSync("/usr/bin/chromium")
          ? "/usr/bin/chromium"
          : undefined),
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let displayName = "Existing name", fail = false;
    await page.route(
      "https://bkkmsbxrxkqaveymcrgi.supabase.co/**",
      async (route) => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (path === "/auth/v1/token") {
          return route.fulfill({
            status: fail ? 400 : 200,
            json: fail
              ? { error: "not confirmed" }
              : { access_token: "ui-test-session" },
          });
        }
        if (path === "/auth/v1/logout") return route.fulfill({ status: 204 });
        if (path.endsWith("/v1/me/routines")) {
          return route.fulfill({ status: 200, json: [] });
        }
        assert.equal(req.headers().authorization, "Bearer ui-test-session");
        if (req.method() === "PATCH") {
          displayName = req.postDataJSON().display_name;
        }
        return route.fulfill({
          status: 200,
          json: { id: "ui-fixture", display_name: displayName },
        });
      },
    );
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.getByLabel("Email", { exact: true }).fill("fixture@example.com");
    await page.getByLabel("Password", { exact: true }).fill(
      "fixture-only-password",
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Display name").fill("Updated name");
    await page.getByRole("button", { name: "Save profile" }).click();
    await page.getByRole("status").filter({ hasText: "Profile saved" })
      .waitFor();
    assert.equal(displayName, "Updated name");
    assert.equal(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
      0,
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    fail = true;
    await page.getByLabel("Email", { exact: true }).fill("fixture@example.com");
    await page.getByLabel("Password", { exact: true }).fill(
      "fixture-only-password",
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("status").filter({
      hasText: "Sign-in was not confirmed",
    }).waitFor();
    assert.equal(
      await page.getByLabel("Password", { exact: true }).inputValue(),
      "",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Hosted account UI doubles: sign-in, saved profile, memory-only tokens, sign-out and error recovery passed.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
