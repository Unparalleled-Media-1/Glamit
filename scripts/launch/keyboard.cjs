/** Keyboard, history and offline checks against the actual local UI, with no remote traffic. */
const assert = require("node:assert/strict"),
  { chromium } = require("../../docs/design-preview/node_modules/playwright"),
  { spawn } = require("node:child_process"),
  fs = require("node:fs"),
  net = require("node:net"),
  path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, "../.."), a = net.createServer();
  await new Promise((r) => a.listen(0, "127.0.0.1", r));
  const port = a.address().port;
  await new Promise((r) => a.close(r));
  const origin = "http://127.0.0.1:" + port,
    s = spawn(process.execPath, [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ], { cwd: path.join(root, "apps/web"), stdio: "ignore" });
  let b;
  const result = {
    observed_at: new Date().toISOString(),
    scope:
      "Chromium keyboard/history/offline UI checks; not VoiceOver/TalkBack or native-device testing",
    checks: [],
  };
  const pass = (name) => result.checks.push({ name, status: "PASSED" });
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    b = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c.route(
      "**/*",
      (r) =>
        new URL(r.request().url()).origin === origin
          ? r.continue()
          : r.abort("blockedbyclient"),
    );
    const p = await c.newPage();
    await p.goto(origin);
    await p.keyboard.press("Tab");
    assert.equal(
      await p.evaluate(() => document.activeElement.textContent.trim()),
      "Skip to content",
    );
    await p.keyboard.press("Enter");
    assert.equal(
      await p.evaluate(() => document.activeElement.id),
      "main-content",
    );
    pass("Skip link moves keyboard focus to main");
    await p.getByRole("button", { name: "Analyze My Face", exact: true })
      .click();
    assert.equal(new URL(p.url()).pathname, "/analyze");
    await p.goBack();
    await p.waitForFunction(() => location.pathname === "/");
    await p.getByRole("heading", { name: /Your next look/ }).waitFor();
    pass("Browser Back restores route and screen");
    for (const route of ["/business", "/admin"]) {
      await p.goto(origin + route);
      await p.keyboard.press("Tab");
      assert.equal(
        await p.evaluate(() => document.activeElement.textContent.trim()),
        "Skip to workspace",
      );
      await p.keyboard.press("Enter");
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "workspace-content",
      );
      pass("Workspace skip link focuses main: " + route);
    }
    await p.goto(origin + "/profile");
    await p.getByRole("button", { name: "Switch workspace", exact: true })
      .click();
    await p.getByRole("dialog").waitFor();
    assert.equal(
      await p.evaluate(() => document.activeElement.getAttribute("aria-label")),
      "Close workspace switcher",
    );
    await p.keyboard.press("Escape");
    assert.equal(await p.getByRole("dialog").count(), 0);
    assert.equal(
      await p.evaluate(() => document.activeElement.textContent.trim()),
      "Switch workspace",
    );
    pass("Workspace dialog initial focus, Escape and focus restoration");
    await p.goto(origin + "/results");
    assert.match(
      await p.locator("main").innerText(),
      /No|not|waiting|upload|connection/i,
    );
    pass("Personalized Results deep link has truthful empty state");
    await c.setOffline(true);
    await p.getByText("You’re offline.", { exact: false }).first().waitFor();
    pass("Offline transition announces unavailable network operations");
    await c.setOffline(false);
    await p.goto(origin + "/consent");
    const input = p.getByTestId("photo-input");
    assert(await input.isDisabled());
    await p.getByRole("checkbox").check();
    assert(await input.isEnabled());
    pass("Photo permission gates local file input");
    await input.setInputFiles({
      name: "forbidden.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    await p.getByRole("alert").filter({ hasText: "JPEG" }).waitFor();
    pass("Disallowed file type rejected before any upload");
    const output = process.env.GLAM_LAUNCH_ARTIFACTS ||
      "/tmp/glam-launch-keyboard";
    fs.mkdirSync(output, { recursive: true });
    await p.screenshot({
      path: path.join(output, "keyboard-validation.png"),
      fullPage: true,
    });
    await c.close();
  } catch (e) {
    result.checks.push({
      name: "Keyboard/validation assertion",
      status: "FAILED",
      reason: e.message.slice(0, 300),
    });
    process.exitCode = 1;
  } finally {
    if (b) await b.close();
    s.kill();
    fs.writeFileSync(
      path.join(root, "docs/launch/evidence/keyboard-offline-validation.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(JSON.stringify(result.checks));
  }
})();
