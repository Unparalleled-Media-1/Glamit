import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSync } from "esbuild";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glam-merchant-"));
const outfile = path.join(dir, "m.mjs");
buildSync({
  entryPoints: ["apps/web/components/MerchantListings.tsx"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
  jsx: "automatic",
});
const { parseListings, statusOf, priceToMinor, buildFacts, request, uploadRequest, imageProblem } = await import(outfile);

const form = {
  title: " Serum ",
  description: "",
  category: "skincare",
  tags: "Vitamin-C, glow",
  sku: "S1",
  ref: "invoice-1",
  currency: "ZAR",
  price: "129.90",
  stock: "12",
  countries: "za",
  expires: "2030-01-01T10:00",
  url: "https://shop.example/s1",
  condition: "new",
};

test("prices convert to minor units without float drift", () => {
  assert.equal(priceToMinor("129.90"), 12990);
  assert.equal(priceToMinor("0.10"), 10);
  for (const bad of ["", "0", "-1", "1.234", "abc", "1e3"]) assert.equal(priceToMinor(bad), null);
});

test("facts are normalised and invalid input is explained, not sent", () => {
  const facts = buildFacts(form);
  assert.equal(facts.title, "Serum");
  assert.deepEqual(facts.tags, ["vitamin-c", "glow"]);
  assert.deepEqual(facts.countries, ["ZA"]);
  assert.equal(facts.price_minor, 12990);
  assert.equal(facts.stock_quantity, 12);
  assert.match(buildFacts({ ...form, stock: "-1" }), /whole number/);
  assert.match(buildFacts({ ...form, tags: "" }), /tag/);
  assert.match(buildFacts({ ...form, expires: "" }), /expires/);
});

test("revisions keep unedited facts from the base listing", () => {
  const base = { ...buildFacts(form), accepting_requests: true, shipping_minor: 500 };
  const next = buildFacts({ ...form, stock: "3" }, base);
  assert.equal(next.stock_quantity, 3);
  assert.equal(next.accepting_requests, true);
  assert.equal(next.shipping_minor, 500);
});

test("status wording follows the review lifecycle", () => {
  const l = { state: "draft", decision: null, merchant_reviewed: false, published_revision: null, current_revision: 1 };
  assert.match(statusOf(l), /Draft/);
  assert.match(statusOf({ ...l, merchant_reviewed: true }), /Awaiting content review/);
  assert.match(statusOf({ ...l, merchant_reviewed: true, decision: "approved" }), /ready to publish/);
  assert.match(statusOf({ ...l, merchant_reviewed: true, decision: "rejected" }), /Rejected/);
  assert.equal(statusOf({ ...l, state: "published", published_revision: 1, decision: "approved" }), "Live");
  assert.equal(statusOf({ ...l, state: "withdrawn" }), "Withdrawn");
});

test("listing parser rejects malformed rows", () => {
  const row = { id: "a", organization_id: "o", state: "draft", current_revision: 1, published_revision: null, merchant_reviewed: false, decision: null, facts: buildFacts(form) };
  assert.equal(parseListings([row]).length, 1);
  assert.throws(() => parseListings({}));
  assert.throws(() => parseListings([{ ...row, merchant_reviewed: "no" }]));
});

test("writes send a bearer token and idempotency key and never cookies", () => {
  const { url, init } = request("https://api.example.com", "tok", "/v1/x", "POST", { a: 1 }, "k1");
  assert.equal(url, "https://api.example.com/v1/x");
  assert.equal(init.headers.Authorization, "Bearer tok");
  assert.equal(init.headers["Idempotency-Key"], "k1");
  assert.equal(init.credentials, "omit");
});

test("image uploads confirm rights, carry the file type and never use cookies", () => {
  const { url, init } = uploadRequest("https://api.example.com", "tok", "/v1/organizations/o/catalog", "a/b", { type: "image/webp", size: 5 });
  assert.equal(url, "https://api.example.com/v1/organizations/o/catalog/listings/a%2Fb/original-images");
  assert.equal(init.method, "PUT");
  assert.equal(init.headers["X-Rights-Confirmed"], "true");
  assert.equal(init.headers["Content-Type"], "image/webp");
  assert.equal(init.credentials, "omit");
});

test("unsupported or oversized images are refused before upload", () => {
  assert.equal(imageProblem({ type: "image/png", size: 1000 }), "");
  assert.match(imageProblem({ type: "image/gif", size: 1000 }), /JPEG/);
  assert.match(imageProblem({ type: "image/png", size: 11 * 1024 * 1024 }), /10 MB/);
});
