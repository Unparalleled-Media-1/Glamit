const {
  chromium,
} = require("../../docs/design-preview/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
(async () => {
  const checks = [],
    errors = [],
    external = [],
    screenshots = [];
  const out = path.resolve(__dirname, "../../docs/application-preview");
  fs.mkdirSync(out, { recursive: true });
  const allocation = net.createServer();
  await new Promise((r) => allocation.listen(0, "127.0.0.1", r));
  const port = allocation.address().port;
  await new Promise((r) => allocation.close(r));
  const origin = "http://127.0.0.1:" + port;
  let log = "";
  const server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: path.resolve(__dirname, "../../apps/web"),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 25000;
      const tick = async () => {
        if (server.exitCode !== null) return reject(Error(log));
        try {
          if ((await fetch(origin)).ok) return resolve();
        } catch {}
        if (Date.now() > deadline) return reject(Error(log));
        setTimeout(tick, 150);
      };
      tick();
    });
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_EXECUTABLE_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (new URL(r.url()).origin !== origin && !r.url().startsWith("blob:"))
        external.push(r.url());
    });
    const pass = (n) => {
      checks.push(n);
      console.log("PASS " + n);
    };
    const capture = async (name) => {
      await page.screenshot({
        path: path.join(out, name + ".png"),
        fullPage: !name.startsWith("mobile-"),
      });
      screenshots.push(name + ".png");
    };
    await page.goto(origin);
    assert.match(await page.locator("h1").innerText(), /Your next look/);
    await capture("web-home");
    await page
      .getByRole("button", { name: "Analyze My Face", exact: true })
      .click();
    await capture("first-face-analysis");
    await page
      .getByRole("button", { name: "Start Face Analysis", exact: true })
      .click();
    const photo = page.getByTestId("photo-input");
    assert(await photo.isDisabled());
    await page.getByRole("checkbox").check();
    assert(await photo.isEnabled());
    await photo.setInputFiles({
      name: "invalid.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
    assert.match(await page.locator("main [role=alert]").innerText(), /JPEG/);
    await photo.setInputFiles(
      path.resolve(__dirname, "../../apps/web/public/images/editorial.webp"),
    );
    await page
      .getByRole("heading", { name: "Photo review", exact: true })
      .waitFor();
    assert.match(await page.locator("main").innerText(), /Not evaluated/);
    assert.match(await page.locator("main").innerText(), /Not uploaded/);
    await capture("photo-quality");
    await page
      .getByRole("button", { name: "Choose my goals", exact: true })
      .click();
    await page.getByRole("checkbox", { name: "Discover my colors" }).check();
    await page
      .getByRole("button", { name: "Check analysis availability" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "No photo has been uploaded or analyzed" })
      .first()
      .waitFor();
    await page.getByRole("button", { name: "View report workspace" }).click();
    assert.equal(
      await page
        .locator(".report-fields")
        .getByText("Not computed", { exact: true })
        .count(),
      7,
    );
    assert(
      await page
        .locator(".report-visual button svg")
        .evaluateAll((nodes) =>
          nodes.every((n) => n.getBoundingClientRect().width <= 24),
        ),
    );
    await capture("face-report");
    pass(
      "Consent-gated photo selection, invalid-file rejection, technical review, goals and honest uncomputed report",
    );
    await page
      .getByRole("button", { name: "Explore Color Analysis", exact: true })
      .click();
    await capture("color-report");
    await page
      .getByRole("button", { name: "Build a chosen-color routine" })
      .click();
    await page
      .getByLabel("Routine title", { exact: true })
      .fill("Five-minute routine");
    await page
      .getByLabel("One step per line", { exact: true })
      .fill("Prepare my own tools\nFollow one technique");
    await page.getByRole("button", { name: "Save session routine" }).click();
    await page
      .getByRole("checkbox", { name: "Prepare my own tools", exact: true })
      .check();
    assert(
      await page
        .getByRole("checkbox", { name: "Prepare my own tools", exact: true })
        .isChecked(),
    );
    await capture("glow-up-guide");
    await page
      .getByRole("button", { name: "Try AI Makeover", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Makeup Match", exact: true })
      .click();
    await page.getByLabel("Style direction").selectOption("Soft bronze");
    assert(
      await page
        .getByRole("slider", { name: "Comparison handle" })
        .isDisabled(),
    );
    assert.match(await page.locator(".canvas-label").innerText(), /Unchanged/);
    await page.getByRole("button", { name: "Reset to original" }).click();
    assert.equal(
      await page.getByLabel("Style direction").inputValue(),
      "Natural",
    );
    await capture("ai-studio");
    pass(
      "Editable routine save/checklist, dedicated Makeup Match, original-preserving Studio and reset",
    );
    await page.getByRole("button", { name: "AI Advisor", exact: true }).click();
    await page
      .getByLabel("Your styling goal or refinement")
      .fill("A five-minute routine");
    await page.getByRole("button", { name: "Add to my brief" }).click();
    assert.match(await page.getByRole("status").innerText(), /No AI reply/);
    await page.getByRole("button", { name: "Open profile" }).click();
    await page
      .getByRole("button", { name: "Switch workspace", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    assert(await dialog.isVisible());
    assert.match(
      await dialog.innerText(),
      /No business workspaces are authorized/,
    );
    await page.keyboard.press("Escape");
    assert(
      await page
        .getByRole("button", { name: "Switch workspace", exact: true })
        .evaluate((n) => document.activeElement === n),
    );
    await page
      .getByRole("button", { name: "Privacy & photo deletion" })
      .click();
    await page
      .getByRole("button", { name: "Clear local photo", exact: true })
      .click();
    assert.match(await page.locator("main").innerText(), /No photo selected/);
    assert.deepEqual((await context.storageState()).origins, []);
    // New visual controls are real selections, not fabricated photo effects.
    await page.goto(origin + "/");
    await page.getByRole("button", { name: "Hair", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Hair", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .getByRole("button", { name: "Explore hair", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Makeup Match", exact: true })
      .click();
    await page.getByRole("button", { name: "Berry", exact: true }).click();
    await page
      .getByRole("button", { name: "Berry swatch 4", exact: true })
      .click();
    assert.match(
      await page.locator(".shade-description").innerText(),
      /Berry \/ 04/,
    );
    assert.match(
      await page.locator(".canvas-label").innerText(),
      /Not your result/,
    );
    assert(
      await page
        .getByRole("button", { name: /Generate — connection required/ })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "Rose after hours", exact: true })
      .click();
    const favorite = page.getByRole("button", {
      name: "Favorite this inspiration for this session",
      exact: true,
    });
    await favorite.click();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Remove session inspiration favorite",
          exact: true,
        })
        .getAttribute("aria-pressed"),
      "true",
    );
    await capture("studio-editorial-preview");
    assert(
      !(
        await page
          .getByLabel("Style direction")
          .locator("option")
          .allTextContents()
      ).includes("Locs"),
    );
    await page
      .getByRole("button", { name: "Use direction in my look", exact: false })
      .click();
    assert.match(
      await page.locator(".look-summary").innerText(),
      /Berry color mood 04/,
    );

    await page.goto(origin + "/color");
    await page
      .getByRole("button", { name: "Cool expression", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cool expression color 3", exact: true })
      .click();
    assert.match(
      await page.locator(".color-explorer-copy").innerText(),
      /#797996/,
    );
    await capture("color-palette-explorer");
    pass(
      "Beauty category routing, Studio reference/shade selection and session favorite, illustrative color explorer, no fabricated transformation",
    );
    pass(
      "Unsent Advisor, unauthorized workspace switcher, focus restoration, photo deletion and no persisted private data",
    );
    // One continuous plan: no request is sent to an AI, merchant or payment service.
    await page.goto(origin + "/event");
    await page
      .getByLabel("Occasion / event", { exact: true })
      .fill("Cape Town wedding");
    await page
      .getByLabel("Theme or dress code (your input)")
      .fill("Emerald, relaxed formal");
    await page.getByLabel("Event date", { exact: true }).fill("2027-05-22");
    await page.getByLabel("Needed by", { exact: true }).fill("2027-05-15");
    await page.getByLabel("Total budget, including delivery").fill("4000");
    await page
      .getByLabel("Your styling goal or refinement")
      .fill("Use my own gold earrings");
    await page
      .getByRole("button", { name: "Add to my brief", exact: true })
      .click();
    assert.match(
      await page.locator(".conversation-messages").innerText(),
      /gold earrings/,
    );
    await page
      .getByRole("button", { name: "Shape my look", exact: true })
      .click();
    await page.getByLabel("Look name", { exact: true }).fill("My wedding look");
    await page
      .getByRole("button", { name: "Sculpted braids", exact: true })
      .click();
    await page.getByRole("tab", { name: /Makeup/ }).click();
    await page
      .getByRole("button", { name: "Soft bronze", exact: true })
      .click();
    await page.getByRole("tab", { name: /Clothing/ }).click();
    await page
      .getByRole("button", { name: "An emerald dress", exact: true })
      .click();
    await page.getByRole("tab", { name: /Hair/ }).click();
    await page
      .getByRole("button", { name: "Sleek low bun", exact: true })
      .click();
    assert.match(
      await page.locator(".look-summary").innerText(),
      /Soft bronze/,
    );
    assert.match(
      await page.locator(".look-summary").innerText(),
      /An emerald dress/,
    );
    await page
      .getByRole("button", { name: "Save this look", exact: false })
      .click();
    await capture("live-look-builder");
    await page
      .getByRole("button", { name: "Get This Look", exact: true })
      .click();
    assert.match(
      await page.locator(".look-breakdown").innerText(),
      /Sleek low bun/,
    );
    await page.getByLabel("Shopping country").fill("ZA");
    await page.getByLabel("Delivery / service city").fill("Johannesburg");
    await page.getByLabel("Currency", { exact: true }).selectOption("ZAR");
    assert.match(
      await page.locator(".cost-summary").innerText(),
      /Not yet known/,
    );
    await capture("get-this-look");
    await page.getByRole("button", { name: "Open profile" }).click();
    await page.getByLabel("What should we call you?").fill("Alex");
    await page
      .getByRole("checkbox", { name: /Remember my approved plan/ })
      .check();
    await page.reload();
    assert.equal(
      await page.getByLabel("What should we call you?").inputValue(),
      "Alex",
    );
    await page.getByRole("button", { name: "Open & edit look" }).click();
    assert.equal(
      await page.getByLabel("Look name", { exact: true }).inputValue(),
      "My wedding look",
    );
    await page.getByRole("tab", { name: /Accessories/ }).click();
    await page
      .getByRole("button", { name: "Gold accents", exact: true })
      .click();
    await page.getByRole("button", { name: /Save this look/ }).click();
    await page.getByRole("button", { name: "Open profile" }).click();
    assert.match(
      await page.locator(".glam-profile").innerText(),
      /Saved looks \(1\)/,
    );
    await page
      .getByRole("button", { name: "Digital Wardrobe", exact: true })
      .click();
    await page
      .getByLabel("Wardrobe item", { exact: true })
      .fill("My black blazer");
    await page.getByRole("button", { name: "Add item", exact: false }).click();
    await page
      .getByRole("button", { name: "Style this piece", exact: false })
      .click();
    assert.match(
      await page.locator(".look-summary").innerText(),
      /My black blazer/,
    );
    assert.match(
      await page.locator(".look-summary").innerText(),
      /Sleek low bun/,
    );
    await page
      .getByRole("button", { name: "Home", exact: true })
      .first()
      .click();
    assert.match(await page.locator("h1").innerText(), /Welcome back, Alex/);
    await capture("returning-user");
    await page
      .getByRole("button", { name: "Ask My Personal Stylist", exact: true })
      .click();
    // Context survived navigation and approved metadata reload; conversation did not persist.
    assert.equal(
      await page.getByLabel("Occasion / event", { exact: true }).inputValue(),
      "Cape Town wedding",
    );
    assert.equal(await page.locator(".user-message").count(), 0);
    await capture("event-stylist");
    await page
      .getByRole("checkbox", { name: /I have permission to preview/ })
      .check();
    await page
      .getByLabel("Add inspiration or invitation", { exact: true })
      .setInputFiles(
        path.resolve(__dirname, "../../apps/web/public/images/editorial.webp"),
      );
    await page.locator(".attached img").waitFor();
    const persisted = await page.evaluate(() =>
      localStorage.getItem("glam.approved-profile.v1"),
    );
    assert(
      !persisted.includes("blob:") &&
        !persisted.includes("messages") &&
        !persisted.includes("editorial.webp"),
    );
    await page.getByRole("button", { name: "Remove attachment" }).click();
    await page.getByRole("button", { name: "Open profile" }).click();
    await page
      .getByRole("checkbox", { name: /Remember my approved plan/ })
      .uncheck();
    assert.deepEqual((await context.storageState()).origins, []);
    await page
      .getByRole("checkbox", { name: /Remember my approved plan/ })
      .check();
    await page
      .getByRole("button", { name: "Delete saved look", exact: true })
      .click();
    await page.reload();
    assert.match(
      await page.locator(".glam-profile").innerText(),
      /Saved looks \(0\)/,
    );
    await page
      .getByRole("button", {
        name: "Delete my GLAM Profile on this device",
        exact: true,
      })
      .click();
    await page.reload();
    assert.deepEqual((await context.storageState()).origins, []);
    pass(
      "Event brief continuity, independent look components, wardrobe reuse, returning profile, approved metadata persistence and deletion; no fabricated AI or offers",
    );
    await page.goto(origin + "/studio");
    assert(
      await page
        .getByRole("button", { name: "Undo choice", exact: true })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "Makeup Match", exact: true })
      .click();
    await page.getByRole("button", { name: "Berry", exact: true }).click();
    await page
      .getByRole("button", { name: "Berry swatch 4", exact: true })
      .click();
    await page.getByLabel("Style direction").selectOption("Soft bronze");
    await page
      .getByRole("button", { name: "Undo choice", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Style direction").inputValue(),
      "Natural",
    );
    assert.match(
      await page.locator(".shade-description").innerText(),
      /Berry \/ 04/,
    );
    assert(
      await page
        .getByRole("slider", { name: "Comparison handle", exact: true })
        .isDisabled(),
    );
    await page.goto(origin + "/builder");
    await page
      .getByRole("button", { name: "Sculpted braids", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Get This Look", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Explore the beauty edit", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Choose shopping destination",
        exact: false,
      })
      .click();
    const destinationDialog = page.getByRole("dialog");
    await destinationDialog
      .getByLabel("Shopping country", { exact: true })
      .fill("South Africa");
    await destinationDialog
      .getByLabel("Shopping city", { exact: true })
      .fill("Durban");
    await destinationDialog
      .getByRole("button", { name: "Use this destination", exact: true })
      .click();
    await page.getByRole("button", { name: /Durban.*ZAR/ }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Shopping city", { exact: true })
      .fill("Cape Town");
    await page.keyboard.press("Escape");
    assert(await page.getByRole("button", { name: /Durban.*ZAR/ }).isVisible());
    await page.getByRole("button", { name: "Makeup", exact: true }).click();
    assert.equal(await page.locator(".golden-product-card").count(), 2);
    await page
      .getByRole("button", { name: "View The velvet lip.", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Rose reference color", exact: true })
      .click();
    assert(
      await page
        .getByRole("button", {
          name: "Purchase requires a verified offer",
          exact: true,
        })
        .isDisabled(),
    );
    assert.match(
      await page.locator(".golden-price-status").innerText(),
      /Offer not verified/,
    );
    await page
      .getByRole("button", { name: "Use as a makeup reference", exact: true })
      .click();
    assert.match(
      await page.locator(".look-summary").innerText(),
      /Sculpted braids/,
    );
    assert.match(
      await page.locator(".look-summary").innerText(),
      /The velvet lip.*Rose/,
    );
    pass(
      "Golden commerce studies: optional destination save/cancel, category/detail selection, no fabricated offer, component-preserving reference handoff and reversible Studio controls",
    );
    await page.goto(origin + "/business");
    const configs = await page
      .locator('select[aria-label="Review workspace tools"] option')
      .allTextContents();
    assert.equal(configs.length, 5);
    for (const role of [
      "merchant",
      "advertiser",
      "professional",
      "creator",
      "affiliate",
    ]) {
      await page.getByLabel("Review workspace tools").selectOption(role);
      const buttons = page
        .getByRole("navigation", { name: "Workspace modules" })
        .getByRole("button");
      const names = await buttons.allTextContents();
      for (let i = 0; i < names.length; i++) {
        await buttons.nth(i).click();
        assert.match(await page.locator("main h1").innerText(), /\S/);
      }
      await buttons.first().click();
      await capture(role + "-workspace");
    }
    await page.getByLabel("Review workspace tools").selectOption("merchant");
    await page
      .getByLabel("Draft title", { exact: true })
      .fill("Local catalog plan");
    await page
      .getByRole("button", { name: "Save session planning draft" })
      .click();
    assert(
      await page
        .getByRole("heading", { name: "Local catalog plan" })
        .isVisible(),
    );
    await page.getByLabel("Review workspace tools").selectOption("advertiser");
    assert.equal(
      await page.getByRole("heading", { name: "Local catalog plan" }).count(),
      0,
    );
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Create Campaign/ })
      .click();
    for (const n of [
      "Eligible products",
      "Placement",
      "Budget",
      "Creative",
      "Review",
      "Launch",
    ])
      await page
        .getByRole("button", { name: "Next: " + n, exact: true })
        .click();
    assert(
      await page
        .getByRole("button", { name: "Launch unavailable" })
        .isDisabled(),
    );
    pass(
      "All business role modules, isolated session draft save/reset and evidence-gated campaign wizard",
    );
    await page.goto(origin + "/admin");
    await page.getByLabel("Review admin role layout").selectOption("Support");
    assert.equal(
      await page
        .getByRole("navigation", { name: "Admin modules" })
        .getByRole("button", { name: /Commerce/ })
        .count(),
      0,
    );
    assert.match(await page.locator("main").innerText(), /Access denied/);
    await capture("admin");
    pass(
      "Public admin inventory reveals no privileged controls or business data",
    );
    for (const route of [
      "/report",
      "/hair",
      "/skin",
      "/body-fit",
      "/color",
      "/guide",
      "/studio",
    ]) {
      await page.goto(origin + route);
      assert(
        await page
          .getByRole("heading", {
            name: "Personalized Recommendations",
            exact: true,
          })
          .isVisible(),
      );
      assert(
        await page
          .getByRole("heading", { name: "Where to Buy / Book", exact: true })
          .isVisible(),
      );
      assert(
        await page.getByText("Sponsored Matches", { exact: true }).isVisible(),
      );
      assert(
        await page
          .getByText("No verified matching listings currently available.", {
            exact: true,
          })
          .isVisible(),
      );
    }
    await page.goto(origin + "/hair");
    await page
      .getByLabel("Style requirements (comma-separated tags)", { exact: true })
      .fill("braids, protective-style");
    await page.getByLabel("Delivery country code", { exact: true }).fill("ZA");
    await page
      .getByRole("button", {
        name: "Save recommendation requirements",
        exact: true,
      })
      .click();
    assert(
      await page
        .getByRole("heading", { name: "Saved session requirements" })
        .isVisible(),
    );
    await capture("hair-contextual-recommendations");
    await page
      .getByRole("button", { name: "Delete saved requirement", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("heading", { name: "Saved session requirements" })
        .count(),
      0,
    );
    pass(
      "Embedded organic/sponsored no-match sections across all report contexts and saved user requirements",
    );
    await page.goto(origin + "/business");
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Snap & List/ })
      .click();
    await page
      .getByTestId("merchant-images")
      .setInputFiles(
        path.resolve(__dirname, "../../apps/web/public/images/products.webp"),
      );
    await page.getByText("Original · Unchanged", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: "Continue to enhancement options",
        exact: true,
      })
      .click();
    assert(
      await page
        .getByRole("button", {
          name: "Run AI preparation — connection required",
          exact: true,
        })
        .isDisabled(),
    );
    await page
      .getByRole("checkbox", { name: "Clean background", exact: true })
      .check();
    await page
      .getByRole("button", {
        name: "Continue with a manual listing draft",
        exact: true,
      })
      .click();
    for (const [label, value] of [
      ["Product title", "Session braiding extensions"],
      ["Source SKU / product identifier", "LOCAL-SKU-1"],
      ["Merchant price", "100.00"],
      ["Confirmed stock quantity", "5"],
      ["Delivery country code", "ZA"],
      ["Source evidence reference", "packaging-reference"],
      ["Merchant HTTPS destination", "https://merchant.invalid/product"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", {
        name: "Save reviewed session listing draft",
        exact: true,
      })
      .click();
    assert.match(
      await page.locator(".snap-list [role=status]").innerText(),
      /nothing|no listing/i,
    );
    await capture("merchant-snap-list-review");
    await page
      .getByRole("button", {
        name: "Save reviewed session listing draft",
        exact: true,
      })
      .click();
    assert.match(
      await page.locator(".snap-list [role=status]").innerText(),
      /already has a session draft/,
    );
    await page
      .getByRole("button", {
        name: "Review publication requirements",
        exact: true,
      })
      .click();
    assert(
      await page
        .getByRole("button", {
          name: "Publish — verified connections required",
          exact: true,
        })
        .isDisabled(),
    );
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Catalog Health/ })
      .click();
    assert.match(
      await page.locator("main").innerText(),
      /your actual session drafts/,
    );
    await page
      .getByRole("navigation", { name: "Workspace modules" })
      .getByRole("button", { name: /Draft Listings/ })
      .click();
    assert(
      await page
        .getByRole("heading", { name: "Session braiding extensions" })
        .isVisible(),
    );
    await page
      .getByRole("button", {
        name: "Delete session listing draft",
        exact: true,
      })
      .click();
    assert(
      await page
        .getByText("No session listing drafts.", { exact: true })
        .isVisible(),
    );
    const importedDraft = {
      id: "untrusted-import-id",
      title: "Imported session draft",
      category: "hair",
      sku: "IMPORTED-1",
      description: "Test-only facts",
      price: "20.00",
      currency: "ZAR",
      stock: "0",
      country: "ZA",
      source: "test-packaging",
      destination: "https://merchant.invalid/product",
      condition: "new",
      reviewed: true,
      photoCount: 8,
    };
    await page.getByTestId("merchant-bulk-import").setInputFiles({
      name: "drafts.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify([importedDraft])),
    });
    await page
      .getByRole("heading", { name: "Imported session draft", exact: true })
      .waitFor();
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download session draft JSON", exact: true })
      .click();
    const downloaded = await downloadEvent;
    const parsed = JSON.parse(fs.readFileSync(await downloaded.path(), "utf8"));
    assert.equal(parsed[0].reviewed, false);
    assert.equal(parsed[0].photoCount, 0);
    assert.notEqual(parsed[0].id, importedDraft.id);
    await page
      .getByRole("button", {
        name: "Delete session listing draft",
        exact: true,
      })
      .click();
    pass(
      "Snap & List originals, unavailable AI, manual factual review, duplicate rejection, session catalog health and publication guard",
    );
    for (const width of [320, 390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
      for (const route of [
        "/",
        "/event",
        "/builder",
        "/wardrobe",
        "/shop",
        "/product",
        "/analyze",
        "/report",
        "/color",
        "/guide",
        "/studio",
        "/advisor",
        "/profile",
        "/complete",
        "/business",
        "/admin",
      ]) {
        await page.goto(origin + route);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route + " overflow " + width,
        );
      }
      if (width <= 390) {
        await page.setViewportSize({ width, height: 640 });
        await page.goto(origin);
        const nav = await page.locator(".mobile-nav").boundingBox();
        for (const label of ["Analyze My Face", "Ask My Personal Stylist"]) {
          const b = await page
            .getByRole("button", { name: label, exact: true })
            .boundingBox();
          assert(b.y + b.height < nav.y, "Entry actions at " + width + "x640");
        }
        await page.setViewportSize({ width, height: 844 });
      }
      if (width === 390) {
        await page.goto(origin);
        assert.deepEqual(
          await page.locator(".mobile-nav button").allTextContents(),
          ["Home", "Analyze", "AI Studio", "AI Advisor", "Profile"],
        );
        await capture("mobile-home");
        for (const node of await page.locator(".palette-teaser h3").all())
          assert(
            await node.evaluate((n) => n.scrollWidth <= n.clientWidth),
            "Palette teaser text must fit inside its card",
          );
        for (const label of ["Analyze My Face", "Ask My Personal Stylist"]) {
          const b = await page
            .getByRole("button", { name: label, exact: true })
            .boundingBox();
          const nav = await page.locator(".mobile-nav").boundingBox();
          assert(
            b.y + b.height < nav.y,
            "Primary action must be above bottom navigation",
          );
        }
        assert.equal(
          await page
            .locator(".mobile-nav")
            .evaluate((n) => getComputedStyle(n).position),
          "fixed",
        );
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        const footer = await page.locator(".site-footer").boundingBox();
        const nav = await page.locator(".mobile-nav").boundingBox();
        assert(
          footer.y + footer.height <= nav.y,
          "Last content must scroll clear of navigation",
        );
        await page.goto(origin + "/studio");
        await capture("mobile-beauty-studio");
        await page.goto(origin + "/analyze");
        await capture("mobile-beauty-analysis");
        await page.goto(origin + "/builder");
        await capture("mobile-look-builder");
        await page.goto(origin + "/event");
        await capture("mobile-event-stylist");
        await page.goto(origin + "/report");
        await capture("mobile-face-report");
      }
    }
    const goldenDir = path.join(out, "golden");
    fs.mkdirSync(goldenDir, { recursive: true });
    const goldenViews = [
      { name: "iphone", width: 390, height: 844 },
      { name: "android", width: 412, height: 915 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1440, height: 1050 },
    ];
    const goldenRoutes = {
      home: "/",
      analyze: "/analyze",
      report: "/report",
      studio: "/studio",
      shop: "/shop",
      product: "/product",
    };
    const goldenFiles = [];
    for (const viewport of goldenViews) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const [screen, route] of Object.entries(goldenRoutes)) {
        await page.goto(origin + route);
        await page.locator("h1").waitFor();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Golden overflow " + viewport.name + " " + screen,
        );
        if (screen === "studio") {
          assert(
            await page
              .getByRole("slider", { name: "Comparison handle", exact: true })
              .isDisabled(),
          );
        }
        if (screen === "product") {
          assert(
            await page
              .getByRole("button", {
                name: "Purchase requires a verified offer",
                exact: true,
              })
              .isDisabled(),
          );
        }
        const file = viewport.name + "-" + screen + ".png";
        await page.screenshot({
          path: path.join(goldenDir, file),
          fullPage: false,
          animations: "disabled",
          caret: "hide",
        });
        goldenFiles.push({ file, viewport, screen });
      }
    }
    fs.writeFileSync(
      path.join(goldenDir, "candidate-manifest.json"),
      JSON.stringify(
        {
          approved: false,
          approval_required:
            "User review of five golden patterns before redesigning remaining screens",
          browser: browser.version(),
          files: goldenFiles,
        },
        null,
        2,
      ) + "\n",
    );
    pass(
      "Five golden patterns plus uncomputed report captured at iPhone, Android-sized phone, tablet and desktop; candidate baselines await visual approval",
    );
    await context.setOffline(true);
    await page.goto(origin + "/goals").catch(() => {});
    await context.setOffline(false);
    await page.goto(origin + "/goals");
    await context.setOffline(true);
    assert(
      await page
        .getByRole("button", { name: "Check analysis availability" })
        .isDisabled(),
    );
    await context.setOffline(false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
      "auto",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    pass(
      "Responsive 320–1920px, five analysis-first mobile destinations, offline guard, reduced motion and no external requests/errors",
    );
    fs.writeFileSync(
      path.join(out, "test-results.json"),
      JSON.stringify(
        {
          run_at: new Date().toISOString(),
          checks,
          screenshots,
          limits: [
            "No native-device/camera validation",
            "No provider, identity, storage, catalog, payment or business activation",
            "Browser tests use actual Next.js application; report fields remain uncomputed",
          ],
        },
        null,
        2,
      ) + "\n",
    );
    console.log(checks.length + " application groups passed");
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
