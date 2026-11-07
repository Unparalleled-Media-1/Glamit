const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function load(name, extras = {}) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(
      path.resolve(__dirname, "../../packages/product/" + name),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    URL,
    fetch: extras.fetch,
    AbortController,
    ...extras,
  });
  return exports;
}
const P = load("platform.ts");
test("personal journey state keeps routines editable without deriving identity or fabricating results", () => {
  let s = P.personalReducer(P.initialPersonal, {
    type: "toggle",
    key: "interests",
    value: P.interests[0],
  });
  assert.equal(s.interests.length, 1);
  s = P.personalReducer(s, {
    type: "toggle",
    key: "interests",
    value: P.interests[0],
  });
  assert.equal(s.interests.length, 0);
  const routine = {
    id: "r",
    title: "My notes",
    steps: [{ id: "s", text: "Use my own tools", done: false }],
  };
  s = P.personalReducer(s, { type: "save-routine", routine });
  s = P.personalReducer(s, {
    type: "save-routine",
    routine: { ...routine, title: "Revised" },
  });
  assert.equal(s.routines.length, 1);
  s = P.personalReducer(s, { type: "step", routine: "r", step: "s" });
  assert.equal(s.routines[0].steps[0].done, true);
  s = P.personalReducer(s, { type: "intensity", value: 1000 });
  assert.equal(s.intensity, 100);
  s = P.personalReducer(s, { type: "reset" });
  assert.equal(s.routines.length, 0);
  assert.equal(s.page, "home");
  assert.equal("report" in s, false);
  assert.equal("roles" in s, false);
});
test("photo technical limits reject oversized or low-resolution files without facial classification", () => {
  assert.match(
    P.photoIssue({ bytes: 11 * 1024 * 1024, width: 1000, height: 1000 }),
    /10 MB/,
  );
  assert.match(P.photoIssue({ bytes: 100, width: 40, height: 600 }), /480/);
  assert.match(
    P.photoIssue({ bytes: 100, width: 10000, height: 10000 }),
    /40 megapixels/,
  );
  assert.equal(P.photoIssue({ bytes: 100000, width: 800, height: 800 }), null);
});
test("API port refuses missing identity, insecure destinations and redirect credential forwarding", async () => {
  const calls = [];
  const { GlamApi, ApiFailure } = load("api.ts", {
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => [] };
    },
  });
  assert.throws(() => new GlamApi("http://example.com", async () => null));
  assert.throws(
    () => new GlamApi("https://user:pass@example.com", async () => null),
  );
  await assert.rejects(
    () => new GlamApi("https://example.com", async () => null).workspaces(),
    (e) => e instanceof ApiFailure && e.status === 401,
  );
  assert.equal(calls.length, 0);
  const api = new GlamApi("https://example.com", async () => "test-only");
  await api.drafts("organization-a", "merchant");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.redirect, "error");
  assert.match(calls[0].url, /organization-a\/workspaces\/merchant/);
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-only");
});

const C = load("catalog.ts");
test("recommendation requirements are explicit and merchant facts cannot bypass review or duplicate checks", () => {
  assert(C.requirementProblem([], "ZA"));
  assert(C.requirementProblem(["braids", "braids"], "ZA"));
  assert.equal(C.requirementProblem(["braids"], "ZA"), null);
  const draft = {
    ...C.emptyMerchantDraft,
    title: "Product",
    sku: "SKU-1",
    price: "10.00",
    stock: "0",
    country: "ZA",
    source: "packaging",
    destination: "https://merchant.invalid/product",
    reviewed: true,
  };
  assert.equal(C.merchantDraftProblem(draft), null);
  assert(C.merchantDraftProblem({ ...draft, reviewed: false }));
  assert(
    C.merchantDraftProblem({ ...draft, destination: "http://unsafe.invalid" }),
  );
  assert(C.merchantDraftProblem(draft, [{ ...draft, id: "existing" }]));
  assert(C.merchantDraftProblem({ ...draft, currency: "invented" }));
});

test("bulk draft import resets review and media authority and rejects duplicate batches atomically", () => {
  const row = {
    ...C.emptyMerchantDraft,
    id: "untrusted-id",
    title: "Product",
    sku: "SKU-2",
    price: "20.00",
    stock: "1",
    country: "ZA",
    source: "packaging",
    destination: "https://merchant.invalid/item",
    reviewed: true,
    photoCount: 8,
  };
  const imported = C.parseMerchantImport(JSON.stringify([row]), []);
  assert.equal(imported.length, 1);
  assert.equal(imported[0].reviewed, false);
  assert.equal(imported[0].photoCount, 0);
  assert.equal("id" in imported[0], false);
  assert.throws(() => C.parseMerchantImport(JSON.stringify([row, row]), []));
  assert.throws(() =>
    C.parseMerchantImport(
      JSON.stringify([{ ...row, destination: "http://unsafe.invalid" }]),
      [],
    ),
  );
});

test("qualified match renderer labels sources and sponsorship, preserves unknown costs and never opens a destination automatically", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const exports = {};
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../apps/web/components/VerifiedMatches.tsx"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => (name.endsWith("/catalog") ? C : require(name)),
    Date,
  });
  const match = {
    listing_id: "fixture-only",
    revision: 1,
    title: "Test <script> product",
    merchant: "Test merchant",
    category: "hair",
    match_type: "Similar",
    condition: "used",
    source: "reviewed_merchant_assertion",
    currency: "ZAR",
    price_minor: 10000,
    delivered_total_minor: null,
    purchase_url: "https://merchant.invalid/product",
    offer_expires_at: new Date(Date.now() + 3600000).toISOString(),
    service_quote_required: false,
  };
  const markup = renderToStaticMarkup(
    React.createElement(exports.default, { matches: [match], sponsored: true }),
  );
  assert.match(markup, /Sponsored/);
  assert.match(markup, /Full delivered \/ service total unconfirmed/);
  assert.match(markup, /&lt;script&gt;/);
  assert.match(markup, /disabled/);
  assert.doesNotMatch(markup, /href=/);
  const expired = renderToStaticMarkup(
    React.createElement(exports.default, {
      matches: [{ ...match, offer_expires_at: "2000-01-01T00:00:00Z" }],
    }),
  );
  assert.match(expired, /no longer current/);
  assert.doesNotMatch(expired, /Test merchant/);
});

const J = load("journey.ts");
test("editing or clearing one look element preserves unrelated components and saved snapshots", () => {
  let s = J.freshJourney();
  s = J.changePart(s, "Hair", "Braids");
  s = J.changePart(s, "Clothing", "Owned blazer");
  s = J.changePart(s, "Makeup", "Bronze");
  s = J.saveLook(s, "one");
  s = J.changePart(s, "Hair", "");
  assert.equal(s.look.parts.Clothing, "Owned blazer");
  assert.equal(s.look.parts.Makeup, "Bronze");
  assert.equal(s.saved[0].parts.Hair, "Braids");
  s = J.saveLook(s, "one");
  assert.equal(s.saved.length, 1);
  assert.equal(s.saved[0].parts.Hair, "");
});
test("durable approved profile allowlists metadata and rejects corrupt or unapproved persistence", () => {
  let s = J.freshJourney();
  s.remember = true;
  s.name = "Alex";
  s.messages = ["private session conversation"];
  s = J.changePart(s, "Hair", "Natural");
  s = J.saveLook(s, "one");
  s.attachment = "blob:secret";
  s.token = "secret";
  // Serializer must whitelist at source, not rely on the restore function.
  const raw = J.durableJourney(s);
  assert(!raw.includes("conversation"));
  assert(!raw.includes("blob:secret"));
  assert(!raw.includes("token"));
  const restored = J.restoreJourney(raw);
  assert.equal(restored.name, "Alex");
  assert.equal(restored.saved.length, 1);
  assert.equal(restored.messages.length, 0);
  for (const raw of [
    "not JSON",
    "null",
    "[]",
    '{"version":1,"remember":false,"name":"No"}',
  ])
    assert.equal(J.restoreJourney(raw).remember, false);
  const altered = JSON.parse(raw);
  altered.currency = "INVALID";
  altered.roles = ["super_admin"];
  altered.look.parts.Religion = "inferred";
  const safe = J.restoreJourney(JSON.stringify(altered));
  assert.equal(safe.currency, "ZAR");
  assert.equal("roles" in safe, false);
  assert.equal("Religion" in safe.look.parts, false);
});

const H = load("studio-history.ts");
test("Studio undo snapshots are independent, bounded and never include private media", () => {
  const initial = {
    tool: "Makeup Match",
    style: "Natural",
    intensity: 35,
    family: "Rose",
    shade: 2,
    preset: 0,
    marked: false,
  };
  initial.photo = "blob:private-original";
  let history = H.rememberChoice([], initial);
  initial.shade = 4;
  const previous = H.undoChoice(history);
  assert.equal(previous.choice.shade, 2);
  assert.equal(previous.history.length, 0);
  for (let n = 0; n < 25; n++)
    history = H.rememberChoice(history, { ...initial, intensity: n });
  assert.equal(history.length, 20);
  assert.equal(H.undoChoice(history).choice.intensity, 24);
  assert.equal("photo" in H.undoChoice(history).choice, false);
  assert.equal(H.undoChoice([]).choice, null);
});

const Companion = load("companion.ts");
function analysisFixture() {
  return {
    id: "test-analysis",
    subject: "test-user",
    photoRevision: 2,
    completedAt: new Date().toISOString(),
    provider: "TEST DOUBLE",
    model: "test",
    findings: Companion.featureKeys.map((key) => ({
      key,
      estimate: null,
      certainty: "unavailable",
      uncertainty: "Test: no observation.",
    })),
    directions: [],
  };
}
test("analysis accepts only owner/photo-bound complete findings with explicit uncertainty", () => {
  const r = analysisFixture();
  assert(Companion.validAnalysis(r, "test-user", 2));
  assert(!Companion.validAnalysis(r, "other-user", 2));
  assert(!Companion.validAnalysis(r, "test-user", 3));
  r.findings[0].certainty = "certain";
  assert(!Companion.validAnalysis(r, "test-user", 2));
  r.findings[0].certainty = "tentative";
  assert(!Companion.validAnalysis(r, "test-user", 2));
  r.findings[0].estimate = "Test estimate";
  assert(Companion.validAnalysis(r, "test-user", 2));
  r.findings[0].key = "religion";
  assert(!Companion.validAnalysis(r, "test-user", 2));
});
test("preview requires the exact corrections, direction, identity, photo and approved image origin", () => {
  const a = analysisFixture(),
    c = {
      subject: "test-user",
      imageOrigins: ["https://private.example"],
      checkoutOrigins: [],
    };
  const p = {
    id: "test-preview",
    subject: "test-user",
    photoRevision: 2,
    analysisId: a.id,
    correctionRevision: 1,
    directionId: "d",
    imageUrl: "https://private.example/a.png",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    provider: "TEST DOUBLE",
  };
  assert(Companion.validPreview(p, c, a, 1, "d"));
  assert(!Companion.validPreview(p, c, a, 2, "d"));
  assert(!Companion.validPreview(p, c, a, 1, "other"));
  assert(!Companion.validPreview({ ...p, subject: "other" }, c, a, 1, "d"));
  assert(
    !Companion.validPreview(
      { ...p, imageUrl: "https://evil.example/a.png" },
      c,
      a,
      1,
      "d",
    ),
  );
  assert(
    !Companion.validPreview({ ...p, expiresAt: "2000-01-01" }, c, a, 1, "d"),
  );
  assert(
    !Companion.allowedUrl(
      "https://name:secret@private.example/a",
      c.imageOrigins,
    ),
  );
});
test("travel dates reject invalid calendar days and unknown or mismatched weather never becomes a forecast", () => {
  const p = {
    destination: "Cape Town",
    country: "ZA",
    start: "2026-12-01",
    end: "2026-12-02",
    activities: "",
    preferences: "",
    sourcing: "before-departure",
  };
  assert.equal(Companion.travelProblem(p), null);
  assert(Companion.travelProblem({ ...p, start: "2026-02-30" }));
  assert(Companion.travelProblem({ ...p, end: "2026-11-01" }));
  const w = {
    destination: p.destination,
    country: "ZA",
    start: p.start,
    end: p.end,
    timezone: "Africa/Johannesburg",
    provider: "TEST DOUBLE",
    retrievedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    days: [p.start, p.end].map((date) => ({
      date,
      status: "unavailable",
      lowC: null,
      highC: null,
      rainChance: null,
      note: "No weather evidence.",
    })),
  };
  assert(Companion.validWeather(w, p));
  assert(!Companion.validWeather({ ...w, timezone: "bad/timezone" }, p));
  assert(!Companion.validWeather({ ...w, destination: "Miami" }, p));
  w.days[0].highC = 30;
  assert(!Companion.validWeather(w, p));
});
test("checkout never calculates commission and requires a server quote covering every selected variant", () => {
  const c = {
    subject: "test-user",
    imageOrigins: [],
    checkoutOrigins: ["https://checkout.example"],
  };
  const offer = {
    listing_id: "listing",
    category: "cosmetics",
    source: "reviewed_merchant_assertion",
    price_minor: 1000,
    currency: "ZAR",
    delivered_total_minor: 1200,
    variant_id: "medium",
    merchant: "Test merchant",
    country: "ZA",
    quantity_available: 1,
    service_quote_required: false,
    checked_at: new Date().toISOString(),
    offer_expires_at: new Date(Date.now() + 60000).toISOString(),
  };
  assert(Companion.eligibleOffer(offer, "ZA"));
  assert(!Companion.eligibleOffer(offer, "US"));
  assert(
    !Companion.eligibleOffer({ ...offer, service_quote_required: true }, "ZA"),
  );
  const items = [{ offer, quantity: 1 }],
    q = {
      id: "quote",
      subject: "test-user",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      currency: "ZAR",
      totalMinor: 1000,
      delivery: "Test server delivery facts",
      returns: "Test merchant policy",
      lines: [
        {
          listingId: "listing",
          variantId: "medium",
          quantity: 1,
          merchant: "Test merchant",
          totalMinor: 1000,
        },
      ],
      hostedUrl: "https://checkout.example/session",
    };
  assert(Companion.validQuote(q, c, items, "ZAR"));
  assert(!Companion.validQuote({ ...q, lines: [] }, c, items, "ZAR"));
  assert(!Companion.validQuote({ ...q, subject: "other" }, c, items, "ZAR"));
  assert(
    !Companion.validQuote(
      { ...q, hostedUrl: "https://evil.example" },
      c,
      items,
      "ZAR",
    ),
  );
  assert(
    !Companion.validReceipt(
      {
        id: "order",
        subject: "other",
        quoteId: q.id,
        state: "paid",
        currency: "ZAR",
        totalMinor: 1000,
        merchantOrders: [{ id: "o", merchant: "Test", state: "pending" }],
      },
      q,
      "test-user",
    ),
  );
});
