/** UI transport doubles only; no actual sign-in, organizations or staff grants are created. */
const { build } = require("esbuild"),
  { chromium } = require("../../docs/design-preview/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict"),
  cp = require("node:child_process");
(async () => {
  const out =
    process.env.GLAM_WORKSPACE_ARTIFACTS || "/tmp/glam-workspace-access";
  fs.mkdirSync(out, { recursive: true });
  const baseline = process.env.GLAM_WORKSPACE_BASELINE === "1";
  const entry = baseline
    ? `import BusinessPortal from './apps/web/components/BusinessPortal';const view=<BusinessPortal/>;`
    : `import AccountRoutes from './apps/web/components/AccountRoutes';const view=<AccountRoutes initialPath={location.pathname}/>;`;
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';${entry}import './apps/web/app/styles.css';import './apps/web/app/golden-tokens.css';import './apps/web/app/golden-screens.css';import './apps/web/app/authentication.css';createRoot(document.getElementById('root')).render(view);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    outdir: "/tmp/glam-workspace-bundle",
    jsx: "automatic",
    external: ["/images/*"],
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '"ui-fixture-public-key"',
      "process.env.NEXT_PUBLIC_GLAM_BASE_PATH": '""',
      "process.env.NEXT_PUBLIC_GLAM_STATIC_PREVIEW": '"false"',
    },
    plugins: baseline
      ? [
          {
            name: "actual-baseline",
            setup(b) {
              b.onLoad({ filter: /BusinessPortal\.tsx$/ }, (args) => ({
                contents: cp.execFileSync(
                  "git",
                  ["show", "ff62f64:apps/web/components/BusinessPortal.tsx"],
                  { encoding: "utf8" },
                ),
                loader: "tsx",
                resolveDir: path.dirname(args.path),
              }));
            },
          },
        ]
      : [],
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
          : '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLAM workspace regression</title><link rel="stylesheet" href="/app.css"></head><body><p style="text-align:center" role="note">Automated UI test · simulated Auth and grants · no live sign-in</p><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  const id = "a79fd2ad-c836-4b0e-b588-58d803d44a29",
    org = "b79fd2ad-c836-4b0e-b588-58d803d44a29";
  const enc = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
  const token =
    enc({ alg: "ES256", typ: "JWT" }) +
    "." +
    enc({
      sub: id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: "authenticated",
    }) +
    ".fixture";
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [{ provider: "phone" }],
  };
  let browser, testPage;
  const checks = [],
    calls = [],
    errors = [];
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      page = await context.newPage();
    testPage = page;
    await context.tracing.start({ screenshots: true, snapshots: true });
    page.setDefaultTimeout(7000);
    page.on("pageerror", (e) => errors.push(e.message));
    let grants = [],
      staffDenied = true,
      expired = false,
      enabled = true,
      organizationFailure = true;
    await context.route("https://**/*", async (route) => {
      const r = route.request(),
        p = new URL(r.url()).pathname;
      assert.equal(
        new URL(r.url()).origin,
        "https://bkkmsbxrxkqaveymcrgi.supabase.co",
      );
      calls.push({
        path: p,
        method: r.method(),
        body: r.postDataJSON(),
        idempotency: r.headers()["idempotency-key"] || null,
      });
      if (p === "/auth/v1/settings")
        return route.fulfill({
          status: 200,
          json: {
            external: {
              phone: enabled,
              google: false,
              apple: false,
              facebook: false,
            },
          },
        });
      if (p === "/auth/v1/otp") return route.fulfill({ status: 200, json: {} });
      if (p === "/auth/v1/verify" || p === "/auth/v1/token")
        return route.fulfill({
          status: 200,
          json: {
            access_token: token,
            refresh_token: "ui-fixture-refresh",
            token_type: "bearer",
            expires_in: 3600,
            user,
          },
        });
      if (p === "/auth/v1/user")
        return route.fulfill({
          status: expired ? 401 : 200,
          json: expired ? { message: "expired" } : user,
        });
      if (p === "/auth/v1/logout") return route.fulfill({ status: 204 });
      assert.equal(r.headers().authorization, "Bearer " + token);
      if (p.endsWith("/v1/me/profile"))
        return route.fulfill({
          status: 200,
          json: { id, display_name: "Test account" },
        });
      if (p.endsWith("/v1/me/routines"))
        return route.fulfill({ status: 200, json: [] });
      if (p.endsWith("/v1/me/workspaces"))
        return route.fulfill({ status: 200, json: grants });
      if (p.endsWith("/v1/admin/context"))
        return route.fulfill({
          status: staffDenied ? 403 : 200,
          json: staffDenied
            ? {}
            : {
                roles: ["support"],
                modules: ["users", "trust", "privacy"],
                operational_actions_enabled: false,
              },
        });
      if (p.endsWith("/v1/organizations")) {
        assert.deepEqual(Object.keys(r.postDataJSON()), ["name"]);
        if (organizationFailure)
          return route.fulfill({ status: 503, json: {} });
        return route.fulfill({
          status: 201,
          json: { id: org, name: r.postDataJSON().name },
        });
      }
      throw Error("Unexpected external operation: " + p);
    });
    async function signIn() {
      await page
        .getByLabel("Mobile number", { exact: true })
        .fill("0821234567");
      await page
        .getByRole("button", { name: "Continue with SMS", exact: true })
        .click();
      await page
        .getByLabel("Verification code", { exact: true })
        .fill("123456");
      await page
        .getByRole("button", { name: "Verify code", exact: true })
        .click();
    }
    await page.goto(origin + "/business");
    await page
      .getByRole("heading", { name: "Your business workspace starts here" })
      .waitFor();
    assert.equal(await page.getByLabel("Review workspace tools").count(), 0);
    assert.equal(
      await page.getByRole("navigation", { name: "Workspace modules" }).count(),
      0,
    );
    checks.push(
      "Guest direct dashboard route exposes entry links, no dashboard or role selector",
    );
    await page
      .getByRole("link", {
        name: "Register your business account",
        exact: true,
      })
      .click();
    assert(new URL(page.url()).pathname === "/business/register");
    await page
      .getByRole("heading", { name: "Create your GLAM Beauty account" })
      .waitFor();
    checks.push(
      "Business registration is reachable and uses the existing Auth form",
    );
    await page.screenshot({
      path: out + "/register-desktop.png",
      fullPage: true,
    });
    await signIn();
    await page
      .getByRole("heading", { name: "No approved workspace yet" })
      .waitFor();
    assert.equal(new URL(page.url()).pathname, "/business");
    checks.push(
      "Verified sign-in returns to business; no unapproved role is granted",
    );
    await page
      .getByLabel("Organization name", { exact: true })
      .fill("Test organization");
    await page
      .getByRole("button", { name: "Register organization", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Registration could not be confirmed" })
      .waitFor();
    organizationFailure = false;
    await page
      .getByRole("button", { name: "Register organization", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Your organization was registered" })
      .waitFor();
    assert.equal(
      calls.filter((c) => c.path.endsWith("/v1/organizations")).length,
      2,
    );
    assert(
      await page
        .getByRole("button", { name: "Organization registered", exact: true })
        .isDisabled(),
    );
    const submissions = calls.filter((c) =>
      c.path.endsWith("/v1/organizations"),
    );
    assert(
      submissions[0].idempotency &&
        submissions[0].idempotency === submissions[1].idempotency,
    );
    checks.push(
      "Failed organization request retries with the same idempotency reference, name only, and stays pending verification",
    );
    grants = [
      {
        organization_id: org,
        name: "Verified organization",
        workspace: "merchant",
        can_write: false,
      },
    ];
    await page
      .getByRole("button", { name: "Refresh access", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Approved workspace" }).waitFor();
    assert.equal(
      await page
        .getByRole("combobox", { name: "Approved workspace" })
        .locator("option")
        .count(),
      1,
    );
    assert.equal(await page.getByLabel("Review workspace tools").count(), 0);
    assert(
      await page
        .getByText("This workspace has read-only access.", { exact: true })
        .isVisible(),
    );
    checks.push(
      "Only server-approved roles appear; read-only workspace tools are disabled",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page
      .getByRole("heading", { name: "Sign in to your business workspace" })
      .waitFor();
    assert.equal(
      await page.getByRole("navigation", { name: "Workspace modules" }).count(),
      0,
    );
    checks.push(
      "Sign-out clears workspace content and returns to business login",
    );
    await page.goto(origin + "/admin");
    await page
      .getByRole("heading", { name: "Staff sign-in required" })
      .waitFor();
    assert.equal(await page.getByLabel("Review admin role layout").count(), 0);
    assert.equal(await page.getByRole("link", { name: /Register/ }).count(), 0);
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await signIn();
    assert.equal(
      calls.filter((c) => c.path === "/auth/v1/otp").at(-1).body.create_user,
      false,
    );
    await page
      .getByText("Staff access could not be verified.", { exact: false })
      .waitFor();
    assert.equal(
      await page.getByRole("navigation", { name: "Admin modules" }).count(),
      0,
    );
    checks.push(
      "Admin has no public registration or role impersonation; failed staff check denies dashboard",
    );
    staffDenied = false;
    await page
      .getByRole("button", { name: "Refresh access", exact: true })
      .click();
    await page.getByRole("navigation", { name: "Admin modules" }).waitFor();
    assert.equal(
      await page
        .getByRole("navigation", { name: "Admin modules" })
        .getByRole("button")
        .count(),
      3,
    );
    assert.equal(
      await page
        .getByRole("navigation", { name: "Admin modules" })
        .getByRole("button", { name: /Commerce/ })
        .count(),
      0,
    );
    checks.push(
      "Verified staff context limits navigation to actual server modules",
    );
    expired = true;
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page
      .getByRole("heading", { name: "Staff sign-in required" })
      .waitFor();
    assert.equal(
      await page.getByRole("navigation", { name: "Admin modules" }).count(),
      0,
    );
    checks.push("Expired/rejected session removes private content");
    enabled = false;
    expired = false;
    await page.goto(origin + "/business/login");
    await page
      .getByText("SMS sign-in isn’t available right now.", { exact: false })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Continue with SMS", exact: true })
        .count(),
      0,
    );
    checks.push(
      "Unconfigured Auth stays unavailable instead of simulating sign-in",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/business");
    await page
      .getByRole("heading", { name: "Your business workspace starts here" })
      .waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: out + "/entry-mobile.png", fullPage: true });
    checks.push("Mobile entry has no horizontal overflow");
    enabled = true;
    grants = [];
    await page.goto(origin + "/login?next=https%3A%2F%2Fevil.invalid");
    await signIn();
    await page.getByRole("heading", { name: /Your next look/ }).waitFor();
    assert.equal(new URL(page.url()).origin, origin);
    assert.equal(new URL(page.url()).pathname, "/");
    checks.push(
      "Untrusted login return target is rejected and cannot leave the app",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      out + "/results.json",
      JSON.stringify(
        {
          scope:
            "Local UI transport doubles only; no actual OTP delivery, staff grant or production write",
          checks,
          calls,
          errors,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(checks));
  } finally {
    if (testPage) {
      await testPage
        .context()
        .tracing.stop({ path: out + "/ui-transport-trace.zip" })
        .catch(() => {});
      fs.writeFileSync(
        out + "/debug.json",
        JSON.stringify(
          {
            errors,
            calls,
            body: await testPage
              .locator("body")
              .innerText()
              .catch(() => ""),
          },
          null,
          2,
        ),
      );
    }
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
