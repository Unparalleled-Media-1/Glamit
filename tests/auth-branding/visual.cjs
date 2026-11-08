/** Brand/layout/SDK handoff test with intercepted Auth transport. No live authentication. */
const { build } = require("esbuild"),
  { chromium } = require("../../docs/design-preview/node_modules/playwright"),
  { default: AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
(async () => {
  const output = process.env.GLAM_AUTH_BRAND_ARTIFACTS ||
    "/tmp/glam-auth-branding";
  fs.mkdirSync(output, { recursive: true });
  const bundle = await build({
    stdin: {
      contents:
        `import React from 'react';import{createRoot}from'react-dom/client';import WebLogin from './apps/web/components/WebLogin';import './apps/web/app/styles.css';import './apps/web/app/golden-tokens.css';import './apps/web/app/golden-screens.css';import './apps/web/app/authentication.css';createRoot(document.getElementById('root')).render(<WebLogin/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    external: ["/images/*"],
    outdir: "/tmp/glam-auth-brand-bundle",
    jsx: "automatic",
    platform: "browser",
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"ui-fixture-public-key"',
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_GLAM_BASE_PATH": '""',
    },
  });
  const js = bundle.outputFiles.find((p) => p.path.endsWith(".js")).text,
    css = bundle.outputFiles.find((p) => p.path.endsWith(".css")).text;
  const server = http.createServer((req, res) => {
    if (new URL(req.url, "http://local").pathname === "/brand/wordmark.png") {
      res.setHeader("Content-Type", "image/png");
      return res.end(fs.readFileSync("apps/web/public/brand/wordmark.png"));
    }
    res.setHeader(
      "Content-Type",
      req.url === "/app.js"
        ? "application/javascript"
        : req.url === "/app.css"
        ? "text/css"
        : "text/html",
    );
    res.end(
      req.url === "/app.js"
        ? js
        : req.url === "/app.css"
        ? css
        : '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLAM Beauty authentication UI test</title><link rel="stylesheet" href="/app.css"></head><body><div style="padding:6px;text-align:center;background:#181719;color:#fff;font:11px Arial" role="note">UI preview · configured providers simulated · no live sign-in</div><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;
  const checks = [], errors = [], calls = [];
  let configured = true;
  let partial = null;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ||
        "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1050 },
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("https://**/*", (route) => {
      const u = new URL(route.request().url());
      assert.equal(u.origin, "https://bkkmsbxrxkqaveymcrgi.supabase.co");
      if (u.pathname === "/auth/v1/settings") {
        return route.fulfill({
          status: 200,
          json: {
            external: partial || {
              phone: configured,
              google: configured,
              apple: configured,
              facebook: configured,
            },
          },
        });
      }
      if (u.pathname === "/auth/v1/otp") {
        calls.push({ type: "sms", body: route.request().postDataJSON() });
        return route.fulfill({
          status: 200,
          json: { message_id: "ui-fixture-only" },
        });
      }
      if (u.pathname === "/auth/v1/authorize") {
        calls.push({
          type: "oauth",
          provider: u.searchParams.get("provider"),
          pkce: u.searchParams.get("code_challenge_method"),
          redirect: u.searchParams.get("redirect_to"),
        });
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body:
            "<p>OAuth redirect intercepted by the UI test. No provider login performed.</p>",
        });
      }
      throw Error("Unexpected external request: " + u.pathname);
    });
    for (
      const [name, width, height] of [["desktop", 1440, 1050], [
        "compact-mobile",
        320,
        740,
      ], [
        "mobile",
        390,
        844,
      ]]
    ) {
      await page.setViewportSize({ width, height });
      await page.goto(origin);
      await page.getByRole("button", { name: "Continue with SMS", exact: true })
        .waitFor();
      const buttons = page.locator(".auth-surface .button").first().or(
        page.locator(".auth-provider"),
      );
      const boxes = await buttons.evaluateAll((es) =>
        es.map((e) => ({
          width: Math.round(e.getBoundingClientRect().width),
          height: Math.round(e.getBoundingClientRect().height),
        }))
      );
      assert.equal(boxes.length, 4);
      assert.equal(new Set(boxes.map((b) => b.width)).size, 1);
      assert.equal(
        new Set(boxes.map((b) => b.height)).size,
        1,
        JSON.stringify({ viewport: name, boxes }),
      );
      assert(boxes.every((b) => b.height >= 48));
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.scrollWidth > innerWidth
        ),
        false,
      );
      for (const provider of ["Google", "Apple", "Facebook"]) {
        assert.equal(
          await page.getByRole("button", {
            name: "Continue with " + provider,
            exact: true,
          }).locator("svg").count(),
          1,
        );
      }
      const guest = await page.getByRole("link", {
        name: "Explore GLAM Beauty as a guest",
        exact: true,
      }).boundingBox();
      assert.equal(Math.round(guest.width), boxes[0].width);
      assert.equal(Math.round(guest.height), boxes[0].height);
      for (
        const [provider, color] of [["google", "rgb(255, 255, 255)"], [
          "apple",
          "rgb(0, 0, 0)",
        ], ["facebook", "rgb(8, 102, 255)"]]
      ) {
        assert.equal(
          await page.locator(".auth-provider--" + provider).evaluate((e) =>
            getComputedStyle(e).backgroundColor
          ),
          color,
        );
      }
      assert.equal(
        await page.getByRole("button", {
          name: "Continue with SMS",
          exact: true,
        }).evaluate((e) => getComputedStyle(e).backgroundColor),
        "rgb(183, 109, 140)",
      );
      const phone = page.getByLabel("Mobile number", { exact: true });
      await phone.focus();
      assert.equal(
        await phone.evaluate((e) => getComputedStyle(e).outlineColor),
        "rgb(183, 109, 140)",
      );
      await page.getByRole("heading", {
        name: "Sign in to GLAM Beauty",
        exact: true,
      }).click();
      const audit = await new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21aa",
        "wcag22aa",
      ]).analyze();
      assert.deepEqual(
        audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
      );
      await page.screenshot({
        path: path.join(output, "auth-branding-preview-" + name + ".png"),
        fullPage: true,
      });
      checks.push({
        name: name + " configured-method UI preview",
        status: "PASSED",
        buttons: boxes,
      });
    }
    await page.getByLabel("Country calling code", { exact: true }).selectOption(
      "US",
    );
    await page.getByLabel("Mobile number", { exact: true }).fill("2025550123");
    await page.getByRole("button", { name: "Continue with SMS", exact: true })
      .click();
    await page.getByLabel("Verification code", { exact: true }).waitFor();
    assert.equal(
      calls.find((x) => x.type === "sms").body.phone,
      "+12025550123",
    );
    assert.equal(
      await page.getByLabel("Verification code", { exact: true }).getAttribute(
        "autocomplete",
      ),
      "one-time-code",
    );
    await page.getByLabel("Verification code", { exact: true }).fill("123456");
    await page.screenshot({
      path: path.join(output, "auth-branding-otp-mobile.png"),
      fullPage: true,
    });
    checks.push({
      name: "OTP entry retains rose action, autofill and E.164 SDK handoff",
      status: "PASSED",
    });
    for (const provider of ["google", "apple", "facebook"]) {
      await page.goto(origin);
      await page.getByRole("button", {
        name: "Continue with " + provider[0].toUpperCase() + provider.slice(1),
        exact: true,
      }).click();
      await page.waitForURL(
        "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1/authorize?**",
      );
      const request = calls.find((x) =>
        x.type === "oauth" && x.provider === provider
      );
      assert(request);
      assert.equal(request.pkce, "s256");
      assert.equal(request.redirect, origin + "/auth/callback");
      checks.push({
        name: provider + " SDK PKCE redirect (intercepted)",
        status: "PASSED",
      });
    }
    configured = false;
    await page.goto(origin);
    await page.getByText("SMS sign-in isn’t available right now.", {
      exact: false,
    }).waitFor();
    for (
      const name of [
        "Continue with SMS",
        "Continue with Google",
        "Continue with Apple",
        "Continue with Facebook",
      ]
    ) {
      assert.equal(
        await page.getByRole("button", { name, exact: true }).count(),
        0,
      );
    }
    assert.equal(
      await page.getByText("Or continue with", { exact: true }).count(),
      0,
    );
    await page.screenshot({
      path: path.join(output, "auth-branding-unconfigured-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.screenshot({
      path: path.join(output, "auth-branding-unconfigured-desktop.png"),
      fullPage: true,
    });
    checks.push({
      name: "All unconfigured methods hidden; no orphaned social separator",
      status: "PASSED",
    });
    partial = { phone: true, google: true, apple: false, facebook: false };
    await page.goto(origin);
    await page.getByRole("button", {
      name: "Continue with Google",
      exact: true,
    }).waitFor();
    assert.equal(await page.locator(".auth-provider").count(), 1);
    assert.equal(
      await page.getByRole("button", {
        name: "Continue with Apple",
        exact: true,
      }).count(),
      0,
    );
    assert.equal(
      await page.getByRole("button", {
        name: "Continue with Facebook",
        exact: true,
      }).count(),
      0,
    );
    checks.push({
      name: "Partial configuration exposes only available methods",
      status: "PASSED",
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          scope:
            "Isolated UI/SDK transport doubles only; no real SMS or OAuth login",
          checks,
          page_errors: errors,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "Auth branding: equal controls, desktop/mobile WCAG, OTP and three S256 provider handoffs passed; unavailable methods hidden.",
    );
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
