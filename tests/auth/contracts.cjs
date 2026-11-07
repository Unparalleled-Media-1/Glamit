/** Auth protocol/vault doubles. No SMS, OAuth provider or native device verification claimed. */
const { buildSync } = require("esbuild"),
  Module = require("node:module"),
  assert = require("node:assert/strict");
const crypto = require("node:crypto").webcrypto;
function bundle(entry, plugins) {
  return require("esbuild").build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    plugins,
    logLevel: "silent",
  }).then((r) => {
    const m = new Module(entry, module);
    m.filename = entry;
    m.paths = module.paths;
    m._compile(r.outputFiles[0].text, entry);
    return m.exports;
  });
}
(async () => {
  const auth = await bundle("packages/auth/core.ts");
  for (
    const [value, country, expected] of [
      ["083 123 4567", "ZA", "+27831234567"],
      ["٠٨٣١٢٣٤٥٦٧", "ZA", "+27831234567"],
      ["2025550123", "US", "+12025550123"],
      ["07400 123456", "GB", "+447400123456"],
      ["+33612345678", "ZA", "+33612345678"],
    ]
  ) assert.equal(auth.phoneE164(value, country), expected);
  for (
    const value of ["abc", "123", "+123", "0831234567 ext 99", "8".repeat(81)]
  ) assert.throws(() => auth.phoneE164(value, "ZA"));
  for (
    const value of [
      "//evil.invalid",
      "https://evil.invalid",
      "/auth/callback",
      "/a/../b",
      "/%2f%2fevil",
    ]
  ) assert.equal(auth.safeDestination(value), "/");
  assert.equal(auth.safeDestination("/studio"), "/studio");
  assert.match(auth.authMessage({ status: 429 }), /Too many attempts/);
  assert.match(auth.authMessage({ code: "otp_expired" }), /invalid or expired/);
  const store = new Map(), calls = [];
  let presence = false, enrolled = true;
  global.__authVault = {
    available: () => true,
    enrolled: () => enrolled,
    get: async (k, o) => {
      calls.push({ kind: "get", key: k, options: o });
      if (k === "glam.auth.refresh.v1" && !presence) throw Error("cancelled");
      return store.get(k) || null;
    },
    set: async (k, v, o) => {
      calls.push({ kind: "set", key: k, options: o });
      store.set(k, v);
    },
    del: async (k) => store.delete(k),
    crypto,
  };
  const plugins = [{
    name: "native-platform-doubles",
    setup(b) {
      b.onResolve({
        filter: /^expo-(secure-store|crypto|local-authentication)$/,
      }, (a) => ({ path: a.path, namespace: "test-native" }));
      b.onLoad({ filter: /.*/, namespace: "test-native" }, (a) => ({
        loader: "js",
        contents: a.path === "expo-secure-store"
          ? `export const WHEN_UNLOCKED_THIS_DEVICE_ONLY=1;export const isAvailableAsync=async()=>true,canUseBiometricAuthentication=()=>true,getItemAsync=global.__authVault.get,setItemAsync=global.__authVault.set,deleteItemAsync=global.__authVault.del;`
          : a.path === "expo-local-authentication"
          ? `export const hasHardwareAsync=async()=>true,isEnrolledAsync=async()=>global.__authVault.enrolled();`
          : `export const CryptoDigestAlgorithm={SHA256:'SHA-256'};export const getRandomValues=v=>global.__authVault.crypto.getRandomValues(v),randomUUID=()=>global.__authVault.crypto.randomUUID(),digest=(algorithm,data)=>global.__authVault.crypto.subtle.digest(algorithm,data);`,
      }));
    },
  }];
  const vault = await bundle("apps/mobile/auth/secure-session.ts", plugins);
  enrolled = false;
  await assert.rejects(vault.rememberBiometricSession("fixture-refresh"));
  assert.equal(store.size, 0);
  enrolled = true;
  await assert.rejects(vault.rememberBiometricSession("fixture-refresh"));
  assert.equal(store.size, 0);
  presence = true;
  await vault.rememberBiometricSession("fixture-refresh");
  assert.equal(await vault.biometricEnabled(), true);
  presence = false;
  await assert.rejects(vault.unlockBiometricSession());
  presence = true;
  assert.equal(await vault.unlockBiometricSession(), "fixture-refresh");
  await vault.rotateBiometricSession("fixture-rotated");
  assert.equal(await vault.unlockBiometricSession(), "fixture-rotated");
  assert.ok(
    calls.filter((c) => c.key === "glam.auth.refresh.v1").every((c) =>
      c.options?.requireAuthentication === true
    ),
  );
  await vault.forgetBiometricSession();
  assert.equal(store.size, 0);
  const original = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    value: undefined,
    configurable: true,
  });
  const client = vault.createNativeAuth("public-fixture");
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "glamai://auth/callback",
      skipBrowserRedirect: true,
    },
  });
  assert.equal(error, null);
  assert.equal(
    new URL(data.url).searchParams.get("code_challenge_method").toLowerCase(),
    "s256",
  );
  assert.ok(store.has("glam-auth-v1-code-verifier"));
  assert.equal(store.has("glam-auth-v1"), false);
  Object.defineProperty(globalThis, "crypto", {
    value: original,
    configurable: true,
  });
  console.log(
    "Auth contract doubles passed: international E.164, safe destinations, generic errors, biometric-protected secrets/cancellation, rotation/deletion and native S256 PKCE.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
