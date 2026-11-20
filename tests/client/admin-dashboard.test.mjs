import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSync } from "esbuild";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glam-admin-"));
const bundle = (entry, name) => {
  const outfile = path.join(dir, name + ".mjs");
  buildSync({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    jsx: "automatic",
  });
  return import(outfile);
};
const { parseApiOrigin } = await bundle("apps/web/lib/api-origin.ts", "origin");
const { parseModule } = await bundle(
  "apps/web/components/AdminModuleView.tsx",
  "view",
);
const { staffKeyForLabel, approvedStaffModules } = await bundle(
  "apps/web/lib/workspace-access.ts",
  "access",
);

test("API origin must be a plain https origin", () => {
  assert.equal(
    parseApiOrigin("https://api.example.com"),
    "https://api.example.com",
  );
  assert.equal(
    parseApiOrigin("https://api.example.com/"),
    "https://api.example.com",
  );
  for (const bad of [
    undefined,
    "",
    "http://api.example.com",
    "https://u:p@api.example.com",
    "https://api.example.com/v1",
    "https://api.example.com?x=1",
    "https://api.example.com#x",
    "javascript:alert(1)",
    "not a url",
  ])
    assert.equal(parseApiOrigin(bad), "", String(bad));
});

test("module responses are validated strictly before rendering", () => {
  const ok = {
    module: "users",
    title: "User Management",
    available: true,
    generated_at: "2026-11-20T00:00:00Z",
    read_only: true,
    metrics: [{ label: "Users", value: "3" }],
    tables: [{ title: "T", columns: ["a"], rows: [["1"]] }],
  };
  assert.equal(parseModule(ok).module, "users");
  assert.throws(
    () => parseModule({ ...ok, read_only: false }),
    /INVALID_MODULE_RESPONSE/,
  );
  assert.throws(
    () => parseModule({ ...ok, metrics: [{ label: "x", value: 3 }] }),
    /INVALID/,
  );
  assert.throws(
    () =>
      parseModule({
        ...ok,
        tables: [{ title: "T", columns: ["a"], rows: [[1]] }],
      }),
    /INVALID/,
  );
  assert.throws(() => parseModule(null), /INVALID/);
  assert.throws(() => parseModule({ ...ok, available: "yes" }), /INVALID/);
});

test("every approved staff label maps back to the API module key", () => {
  const keys = [
    "executive",
    "users",
    "ai",
    "content",
    "merchants",
    "professionals",
    "advertising",
    "commerce",
    "subscriptions",
    "creators",
    "regions",
    "trust",
    "privacy",
    "analytics",
    "configuration",
  ];
  const labels = approvedStaffModules(keys);
  assert.equal(labels.length, 15);
  assert.deepEqual(labels.map(staffKeyForLabel), keys);
  assert.equal(staffKeyForLabel("Anything else"), undefined);
});
