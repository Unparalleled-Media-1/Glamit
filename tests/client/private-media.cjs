/** WebCrypto and native Crypto-port CONTRACT tests, not installed iOS/Android verification. */
const { buildSync } = require("esbuild");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glam-private-media-"));
const shared = path.join(dir, "shared.cjs"), web = path.join(dir, "web.cjs"), native = path.join(dir, "native.cjs");
buildSync({ entryPoints: ["packages/product/private-media.ts"], bundle: true, platform: "node", outfile: shared });
buildSync({ entryPoints: ["apps/web/lib/private-media.ts"], bundle: true, platform: "node", outfile: web });
const cryptoDouble = path.join(dir, "native-crypto-contract-double.mjs");
fs.writeFileSync(cryptoDouble, 'export const CryptoDigestAlgorithm={SHA256:"SHA-256"}; export async function digest(a,d){return globalThis.crypto.subtle.digest(a,d)}');
const fetchDouble = path.join(dir, "native-fetch-contract-double.mjs");
fs.writeFileSync(fetchDouble, 'export const fetch=(...args)=>{globalThis.nativeMediaFetchCalls=(globalThis.nativeMediaFetchCalls||0)+1;return globalThis.fetch(...args)}');
buildSync({ entryPoints: ["apps/mobile/private-media.ts"], bundle: true, platform: "node", outfile: native,
  alias: { "expo-crypto": cryptoDouble, "expo/fetch": fetchDouble },
});

const { createPrivateMediaClient } = require(shared);
const id = crypto.randomUUID(), policy = crypto.randomUUID(), key = crypto.randomUUID();
const raw = new Uint8Array([1, 2, 3, 4]).buffer; // HTTP contract bytes, not an actual photo.
const metadata = (state = "pending") => ({ id, state, content_type: "image/png",
  width: state === "ready" ? 480 : null, height: state === "ready" ? 600 : null,
  stored_size: state === "ready" ? 400 : null,
  created_at: "2026-11-08T10:00:00Z", expires_at: "2026-11-08T11:00:00Z",
  deleted_at: null, last_error_code: null,
});
const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const sha256 = async data => crypto.createHash("sha256").update(Buffer.from(data)).digest("hex");
const input = () => ({ data: raw.slice(0), contentType: "image/jpeg", policyId: policy });

(async () => {
  const saved = globalThis.fetch;
  try {
    for (const [label, factory] of [
      ["Web actual WebCrypto", require(web).webPrivateMedia],
      ["iOS source / explicit native Crypto port double", require(native).nativePrivateMedia],
      ["Android source / explicit native Crypto port double", require(native).nativePrivateMedia],
    ]) {
      const calls = [];
      const nativeCallsBefore = globalThis.nativeMediaFetchCalls || 0;
      globalThis.fetch = async (url, init) => {
        calls.push({ url, init });
        return response(metadata(init.method === "POST" ? "pending" : "ready"));
      };
      const client = factory("https://api.glam.beauty", () => "test-user-session");
      const result = await client.uploadPhoto(input(), key);
      if (label.startsWith("Web")) assert.equal(globalThis.nativeMediaFetchCalls || 0, nativeCallsBefore);
      else assert.equal(globalThis.nativeMediaFetchCalls, nativeCallsBefore + 2, "Native adapter must use the Expo fetch port");
      assert.equal(result.state, "ready");
      assert.equal(calls.length, 2);
      assert.equal(calls[0].url, "https://api.glam.beauty/v1/media");
      assert.equal(calls[1].url, `https://api.glam.beauty/v1/media/${id}/content`);
      assert.equal(calls[0].init.headers["Idempotency-Key"], key);
      assert.equal(calls[0].init.headers.Authorization, "Bearer test-user-session");
      assert.equal(calls[1].init.redirect, "error");
      assert.equal(JSON.parse(calls[0].init.body).sha256, await sha256(raw));
      assert.deepEqual(Buffer.from(calls[1].init.body), Buffer.from(raw));
      assert.equal(result.status, undefined, "Metadata must not contain client methods or extras");
      globalThis.fetch = async (url, init) => {
        if (url.endsWith("/status")) return response({ state: "NOT CONFIGURED", scope: "private_media_storage" });
        if (url.endsWith("/policy")) return response({ id: policy, purpose: "private_photo_storage", version: "test-only", content: "Fixture policy only" });
        assert.equal(url, `https://api.glam.beauty/v1/policies/${policy}/consent`);
        assert.equal(init.headers["Idempotency-Key"], key);
        assert.deepEqual(JSON.parse(init.body), { action: "granted" });
        return response({ id: crypto.randomUUID(), action: "granted" }, 201);
      };
      const policyClient = factory("https://api.glam.beauty", () => "test-user-session");
      assert.equal((await policyClient.status()).state, "NOT CONFIGURED");
      assert.equal((await policyClient.policy()).id, policy);
      await policyClient.consent(policy, "granted", key);
      console.log("PASS " + label + " shared HTTP/hashing contract (not native runtime)");
    }
  } finally { globalThis.fetch = saved; }

  let token = "session-a", calls = 0;
  const changed = createPrivateMediaClient({ apiOrigin: "https://api.glam.beauty", getToken: () => token,
    sha256, fetch: async () => { calls++; token = "session-b"; return response(metadata()); } });
  await assert.rejects(changed.uploadPhoto(input(), key), /media_session_changed/);
  assert.equal(calls, 1, "No old-user photo upload may follow an account/session change");

  const failed = createPrivateMediaClient({ apiOrigin: "https://api.glam.beauty", getToken: () => "session",
    sha256, fetch: async () => response({ message: "sensitive provider detail" }, 503) });
  await assert.rejects(failed.list(), e => e.retryable && !e.message.includes("sensitive"));
  const unconfigured = createPrivateMediaClient({ apiOrigin: "https://api.glam.beauty", getToken: () => "session",
    sha256, fetch: async () => response({ code: "HTTP_503", message: "private_media_migration_required" }, 503) });
  await assert.rejects(unconfigured.list(), e => !e.retryable && e.code === "private_media_migration_required");
  const malformed = createPrivateMediaClient({ apiOrigin: "https://api.glam.beauty", getToken: () => "session",
    sha256, fetch: async () => response({ ...metadata("ready"), width: null }) });
  await assert.rejects(malformed.metadata(id), /response_invalid/);

  let release;
  const fence = new Promise(r => { release = r; });
  const captured = [];
  const immutable = createPrivateMediaClient({ apiOrigin: "https://api.glam.beauty", getToken: () => "session",
    sha256: async data => { await fence; return sha256(data); }, fetch: async (_u, init) => {
      captured.push(init); return response(metadata(init.method === "POST" ? "pending" : "ready"));
    } });
  const changing = input();
  const pending = immutable.uploadPhoto(changing, key);
  new Uint8Array(changing.data).fill(9);
  changing.contentType = "image/webp";
  release();
  await pending;
  assert.equal(JSON.parse(captured[0].body).sha256, await sha256(raw));
  assert.equal(captured[1].headers["Content-Type"], "image/jpeg");
  assert.deepEqual(Buffer.from(captured[1].body), Buffer.from(raw));

  let binaryToken = "session";
  const binary = createPrivateMediaClient({ apiOrigin: "https://api.glam.beauty", getToken: () => binaryToken,
    sha256, fetch: async () => ({ ok: true, headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => { binaryToken = null; return raw; } }) });
  await assert.rejects(binary.download(id), /media_session_changed/);
  assert.throws(() => createPrivateMediaClient({ apiOrigin: "http://untrusted.invalid", getToken: () => "session", sha256 }), /invalid_media_origin/);
  console.log("PASS session fencing, byte snapshots, response validation and redacted error recovery");
})().catch(error => { console.error(error); process.exitCode = 1; });
