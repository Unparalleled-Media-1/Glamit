/** Real Next production headers plus synthetic-media UI regression. */
const { spawn, spawnSync } = require("node:child_process"),
  net = require("node:net"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const allocation = net.createServer();
  await new Promise((r) => allocation.listen(0, "127.0.0.1", r));
  const port = allocation.address().port;
  await new Promise((r) => allocation.close(r));
  const origin = "http://127.0.0.1:" + port;
  let logs = "";
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
    { cwd: path.resolve("apps/web"), stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (b) => (logs += b));
  server.stderr.on("data", (b) => (logs += b));
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      try {
        response = await fetch(origin + "/consent");
        if (response.ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(response?.ok, "Next server must start");
    const policy = response.headers.get("permissions-policy");
    assert(
      policy.includes("camera=(self)") && policy.includes("microphone=()"),
    );
    const result = spawnSync(process.execPath, ["tests/photo/flow.cjs"], {
      env: { ...process.env, GLAM_PHOTO_ORIGIN: origin },
      stdio: "inherit",
    });
    assert.equal(result.status, 0);
    console.log(
      "Real Next header permits same-origin consented camera, denies microphone, and photo UI regression passes.",
    );
  } finally {
    server.kill();
    if (process.env.GLAM_PHOTO_ARTIFACTS) {
      fs.mkdirSync(process.env.GLAM_PHOTO_ARTIFACTS, { recursive: true });
      fs.writeFileSync(
        path.join(process.env.GLAM_PHOTO_ARTIFACTS, "next-server.txt"),
        logs,
      );
    }
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
