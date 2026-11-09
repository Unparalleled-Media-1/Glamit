/** Shared transport acceptance with explicit HTTP doubles; not device evidence. */
const { buildSync } = require("esbuild");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glam-media-lifecycle-"));
const output = path.join(dir, "client.cjs");
buildSync({ entryPoints: ["packages/product/private-media.ts"], bundle: true, platform: "node", outfile: output });
const { createPrivateMediaClient } = require(output);
const id = "10000000-0000-4000-8000-000000000001";
const policy = { id, purpose: "private_photo_storage", version: "test-only", content: "Test policy" };
const response = value => new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
const make = (fetch, extra = {}) => createPrivateMediaClient({ apiOrigin: "https://api.glam.beauty", getToken: () => "session", sha256: async () => "a".repeat(64), fetch, ...extra });
const cancelled = error => error.code === "private_media_request_cancelled" && !error.retryable;

(async () => {
  let calls = 0;
  const stopped = new AbortController(); stopped.abort();
  await assert.rejects(make(async () => { calls++; return response([]); }).list(stopped.signal), cancelled);
  assert.equal(calls, 0, "Pre-cancelled operations must never send a request");

  let releaseHash;
  const hashing = new Promise(resolve => { releaseHash = resolve; });
  const stopHash = new AbortController();
  const hashClient = make(async () => { calls++; return response([]); }, { sha256: async () => { await hashing; return "a".repeat(64); } });
  const upload = hashClient.uploadPhoto({ data: new Uint8Array([1]).buffer, contentType: "image/png", policyId: id }, id, stopHash.signal);
  stopHash.abort(); releaseHash();
  await assert.rejects(upload, cancelled);
  assert.equal(calls, 0, "Cancellation during hashing must prevent the upload intent");

  const stopIntent = new AbortController();
  let intentCalls = 0;
  const intentClient = make(async (_url, init) => {
    intentCalls++;
    assert.equal(init.method, "POST");
    stopIntent.abort();
    return response({ id, state: "pending" });
  });
  await assert.rejects(intentClient.uploadPhoto({ data: new Uint8Array([1]).buffer, contentType: "image/png", policyId: id }, id, stopIntent.signal), cancelled);
  assert.equal(intentCalls, 1, "Never upload bytes after an intent completes under cancelled consent/screen scope");

  for (const bad of [
    { ...policy, purpose: "ai_styling_advice" }, { ...policy, content: " " },
    { ...policy, id: "not-a-policy-id" }, { ...policy, version: "" },
  ]) await assert.rejects(make(async () => response(bad)).policy(), /private_media_response_invalid/);
  assert.deepEqual(await make(async () => response({ ...policy, server_secret: "discard" })).policy(), policy);
  for (const bad of [{ id, action: "withdrawn" }, { id: "bad", action: "granted" }])
    await assert.rejects(make(async () => response(bad)).consent(id, "granted", id), /private_media_response_invalid/);

  for (const bad of [
    { redirected: true }, { url: "https://unexpected.invalid/content" },
  ]) {
    const client = make(async () => {
      const result = response([]);
      for (const [key, value] of Object.entries(bad)) Object.defineProperty(result, key, { value });
      return result;
    });
    await assert.rejects(client.list(), /private_media_response_invalid/);
  }
  let transportSignal;
  const controller = new AbortController();
  const aborting = make(async (_url, init) => {
    transportSignal = init.signal;
    assert.equal(init.credentials, "omit"); assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error");
    return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(Error("sensitive transport detail")), { once: true }));
  }).list(controller.signal);
  controller.abort();
  await assert.rejects(aborting, cancelled);
  assert(transportSignal.aborted);

  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  let expire, cleared = 0;
  globalThis.setTimeout = (callback, delay) => { assert.equal(delay, 30000); expire = callback; return 1; };
  globalThis.clearTimeout = () => { cleared++; };
  try {
    const pending = make(async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(Error("timeout")), { once: true }))).list();
    expire();
    await assert.rejects(pending, e => e.code === "private_media_request_timed_out" && e.retryable);
    assert.equal(cleared, 1);
    let bodyCancelled = false;
    const stalled = new ReadableStream({ cancel() { bodyCancelled = true; } });
    const reading = make(async () => new Response(stalled)).list();
    await Promise.resolve();
    expire();
    await assert.rejects(reading, e => e.code === "private_media_request_timed_out" && e.retryable);
    assert(bodyCancelled, "Deadline must cancel a stalled response reader, not just fetch headers");
    assert.equal(cleared, 2);
  } finally { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; }

  let token = "session";
  const bodyFence = make(async () => ({ ok: true, headers: new Headers(), text: async () => { token = null; return "[]"; } }), { getToken: () => token });
  await assert.rejects(bodyFence.list(), /media_session_changed/);
  const bodyStop = new AbortController();
  await assert.rejects(make(async () => ({ ok: true, headers: new Headers(), text: async () => { bodyStop.abort(); return "[]"; } })).list(bodyStop.signal), cancelled);
  await assert.rejects(make(async () => response("x".repeat(65537))).list(), /private_media_response_too_large/);
  await assert.rejects(make(async () => ({ ok: true, headers: new Headers(), text: async () => JSON.stringify("é".repeat(40000)) })).list(), /private_media_response_too_large/);

  let readerCancelled = false;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(65537)); }, cancel() { readerCancelled = true; } });
  await assert.rejects(make(async () => new Response(stream)).list(), /private_media_response_too_large/);
  assert(readerCancelled, "Stop reading an oversized private response");
  for (const tokenValue of ["", "bad\r\nheader", "x".repeat(16385)])
    await assert.rejects(make(async () => { throw Error("Must not call"); }, { getToken: () => tokenValue }).list(), /media_session_changed/);
  console.log("PASS private-media cancellation, timeout, response bounds, policy/consent validation and session-safe native transport contract (HTTP doubles, not devices)");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
