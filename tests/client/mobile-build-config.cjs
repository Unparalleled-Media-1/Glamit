/** Production Expo configuration must fail closed before a paid remote build. */
const { buildSync } = require("esbuild"),
  assert = require("node:assert/strict");
const root = process.cwd(),
  output = "/tmp/glam-mobile-config-check.cjs";
buildSync({
  entryPoints: ["apps/mobile/app.config.ts"],
  bundle: true,
  platform: "node",
  outfile: output,
  define: { __dirname: JSON.stringify(root + "/apps/mobile") },
});
const config = require(output).default;
const keys = [
  "GLAM_BUILD_ENV",
  "EAS_PROJECT_ID",
  "EXPO_OWNER",
  "GLAM_IOS_BUNDLE_IDENTIFIER",
  "GLAM_ANDROID_PACKAGE",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];
const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
try {
  for (const k of keys) delete process.env[k];
  const dev = config({
    config: { name: "GLAM Beauty", slug: "glam-ai", scheme: "glamai" },
  });
  assert.equal(dev.extra.supabaseProject, "bkkmsbxrxkqaveymcrgi");
  assert.equal(dev.scheme, "glamai");
  assert.equal(dev.ios.bundleIdentifier, undefined);
  process.env.GLAM_BUILD_ENV = "production";
  assert.throws(() => config({ config: {} }), /public key is required/);
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
    "sb_publishable_fixture_public_key_1234";
  assert.throws(
    () => config({ config: {} }),
    /Registered iOS\/Android identifiers/,
  );
  Object.assign(process.env, {
    EAS_PROJECT_ID: "11111111-1111-4111-8111-111111111111",
    EXPO_OWNER: "fixture-owner",
    GLAM_IOS_BUNDLE_IDENTIFIER: "beauty.glam.fixture",
    GLAM_ANDROID_PACKAGE: "beauty.glam.fixture",
  });
  const ready = config({ config: {} });
  assert.equal(ready.icon, "./assets/brand/app-icon.png");
  assert.equal(ready.splash.image, "./assets/brand/wordmark.png");
  assert.equal(ready.web.favicon, "./assets/brand/favicon.png");
  // Exercise the actual CI preflight dependencies against the resolved app config.
  // A stale artwork filename otherwise rejects every store candidate before EAS starts.
  const workflow = require("node:fs").readFileSync(
    ".github/workflows/native-store-build.yml", "utf8",
  );
  const requiredFiles = [...workflow.matchAll(/test -f (\S+)/g)].map(m => m[1]);
  for (const file of requiredFiles) {
    assert(require("node:fs").existsSync(file), `Native CI requires missing file: ${file}`);
  }
  for (const file of [ready.icon, ready.splash.image]) {
    const relative = require("node:path").posix.join("apps/mobile", file);
    assert(requiredFiles.includes(relative), `Native CI must check configured artwork: ${relative}`);
  }
  const fs = require("node:fs"),
    exists = fs.existsSync;
  try {
    fs.existsSync = (p) =>
      String(p).includes("/assets/brand/") ? false : exists(p);
    assert.throws(
      () => config({ config: {} }),
      /Original approved app icon and splash/,
    );
  } finally {
    fs.existsSync = exists;
  }
  console.log(
    "Mobile production build gates passed; no EAS project, signing or native build was created.",
  );
} finally {
  for (const k of keys)
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
}
