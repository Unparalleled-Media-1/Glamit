/** Full SMS and legacy login UI against isolated Auth/API doubles, never live SMS evidence. */
const { build } = require("esbuild");
const { chromium } = require(
  "../../docs/design-preview/node_modules/playwright",
);
const http = require("node:http"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const bundle = await build({
    stdin: {
      contents:
        `import React from 'react';import{createRoot}from'react-dom/client';import HostedAccount from './apps/web/components/HostedAccount';import{useAccountSession}from'./apps/web/lib/use-account-session';function Harness(){const{session,setSession}=useAccountSession();const[open,setOpen]=React.useState(true);return <><button onClick={()=>setOpen(!open)}>Toggle account panel</button>{open&&<HostedAccount session={session} setSession={setSession}/>}</>;}createRoot(document.getElementById('root')).render(<Harness/>);`,
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
      "process.env.NEXT_PUBLIC_GLAM_BASE_PATH": '""',
      "process.env.NEXT_PUBLIC_GLAM_STATIC_PREVIEW": '"true"',
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
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      }),
      errors = [],
      bodies = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const id = "a79fd2ad-c836-4b0e-b588-58d803d44a29";
    const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const token = enc({ alg: "ES256", typ: "JWT" }) + "." +
      enc({
        sub: id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1",
        aud: "authenticated",
      }) + ".fixture";
    const user = {
      id,
      aud: "authenticated",
      role: "authenticated",
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      identities: [{ provider: "phone" }],
    };
    let displayName = "Existing name", failure = false;
    await page.route(
      "https://bkkmsbxrxkqaveymcrgi.supabase.co/**",
      async (route) => {
        const r = route.request(), p = new URL(r.url()).pathname;
        if (p === "/auth/v1/settings") {
          return route.fulfill({
            status: 200,
            json: {
              external: {
                phone: true,
                google: false,
                apple: false,
                facebook: false,
              },
            },
          });
        }
        if (p === "/auth/v1/otp") {
          bodies.push(r.postDataJSON());
          return route.fulfill({ status: 200, json: {} });
        }
        if (p === "/auth/v1/verify" || p === "/auth/v1/token") {
          return route.fulfill({
            status: failure ? 403 : 200,
            json: failure
              ? {
                code: "otp_expired",
                error_code: "otp_expired",
                msg: "invalid or expired",
              }
              : {
                access_token: token,
                refresh_token: "ui-fixture-refresh",
                token_type: "bearer",
                expires_in: 3600,
                user,
              },
          });
        }
        if (p === "/auth/v1/user") {
          return route.fulfill({ status: 200, json: user });
        }
        if (p === "/auth/v1/logout") {
          return route.fulfill({ status: 204 });
        }
        assert.equal(r.headers().authorization, "Bearer " + token);
        if (
          p.endsWith("/v1/me/workspaces") || p.endsWith("/v1/me/routines")
        ) return route.fulfill({ status: 200, json: [] });
        if (r.method() === "PATCH") displayName = r.postDataJSON().display_name;
        return route.fulfill({
          status: 200,
          json: { id, display_name: displayName },
        });
      },
    );
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.getByLabel("Mobile number", { exact: true }).fill(
      "083 123 4567",
    );
    await page.getByRole("button", { name: "Continue with SMS", exact: true })
      .click();
    await page.getByLabel("Verification code", { exact: true }).waitFor();
    assert.equal(bodies[0].phone, "+27831234567");
    assert.equal(bodies[0].create_user, true);
    assert.ok(
      await page.getByRole("button", { name: /Resend in/ }).isDisabled(),
    );
    assert.equal(
      await page.getByLabel("Verification code").getAttribute("autocomplete"),
      "one-time-code",
    );
    failure = true;
    await page.getByLabel("Verification code").fill("000000");
    await page.getByRole("button", { name: "Verify code", exact: true })
      .click();
    await page.getByRole("status").filter({ hasText: /invalid or expired/ })
      .waitFor();
    failure = false;
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify code", exact: true })
      .click();
    await page.getByLabel("Display name").fill("Updated name");
    await page.getByRole("button", { name: "Save profile", exact: true })
      .click();
    await page.getByRole("status").filter({ hasText: "Profile saved" })
      .waitFor();
    assert.equal(displayName, "Updated name");
    await page.getByRole("button", { name: "Toggle account panel" }).click();
    await page.getByRole("button", { name: "Toggle account panel" }).click();
    assert.equal(
      await page.getByLabel("Display name").inputValue(),
      "Updated name",
    );
    assert.equal(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
      0,
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByLabel("Mobile number").waitFor();
    await page.getByRole("button", {
      name: "Use an existing email and password",
    }).click();
    assert.equal(
      await page.locator("form").last().getAttribute("method"),
      "post",
    );
    await page.getByLabel("Email", { exact: true }).fill("fixture@example.com");
    await page.getByLabel("Password", { exact: true }).fill(
      "fixture-only-password",
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Display name").waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "Auth UI doubles passed: E.164 SMS request, expiry error, resend cooldown, autofill, verification, account persistence/navigation, memory-only session, logout and optional legacy login.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
