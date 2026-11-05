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
