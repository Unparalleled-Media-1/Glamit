import { createHandler } from "../../supabase/functions/glam-api/handler.ts";
const URL = "https://bkkmsbxrxkqaveymcrgi.supabase.co";
const UID = "11111111-1111-4111-8111-111111111111";
function assert(value: unknown, message = "Assertion failed") {
  if (!value) throw new Error(message);
}
function b64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value)).replace(/=/g, "").replace(
    /\+/g,
    "-",
  ).replace(/\//g, "_");
}
const enc = new TextEncoder();
async function fixture(overrides: Record<string, unknown> = {}) {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = {
    ...await crypto.subtle.exportKey("jwk", pair.publicKey),
    kid: "fixture",
    alg: "ES256",
  };
  async function sign(change: Record<string, unknown> = {}, kid = "fixture") {
    const now = Math.floor(Date.now() / 1000);
    const header = b64(enc.encode(JSON.stringify({ alg: "ES256", kid })));
    const body = b64(
      enc.encode(
        JSON.stringify({
          sub: UID,
          iss: URL + "/auth/v1",
          aud: "authenticated",
          role: "authenticated",
          iat: now,
          exp: now + 300,
          ...overrides,
          ...change,
        }),
      ),
    );
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        pair.privateKey,
        enc.encode(header + "." + body),
      ),
    );
    return header + "." + body + "." + b64(signature);
  }
  return { jwk, sign };
}
function mock(
  jwk: unknown,
  options: { userId?: string; blocked?: boolean; databaseError?: boolean } = {},
) {
  const calls: {
    url: string;
    headers: Headers;
    body: Record<string, unknown>;
  }[] = [];
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    let body = {};
    try {
      body = JSON.parse(String(init?.body || "{}"));
    } catch { /* empty */ }
    calls.push({ url, headers: new Headers(init?.headers), body });
    if (url.endsWith("/.well-known/jwks.json")) {
      return Response.json({ keys: [jwk] });
    }
    if (url.endsWith("/auth/v1/user")) {
      return Response.json({ id: options.userId || UID });
    }
    if (url.endsWith("/rpc/glam_api_gate")) {
      return Response.json({ allowed: !options.blocked });
    }
    if (options.databaseError) {
      return Response.json({
        code: "23505",
        message: "private fixture details must not leak",
        details: "fixture-secret",
      }, { status: 409 });
    }
    if (url.endsWith("/rpc/glam_backend_status")) {
      return Response.json({ status: "ready", scope: "hosted_core_api" });
    }
    return Response.json({ id: UID, display_name: "Saved profile" });
  };
  return { calls, request };
}
const config = {
  url: URL,
  publicKey: "public-fixture-key",
  origins: ["https://approved.example"],
  build: "test",
};
Deno.test("no bearer, unsigned tokens, service role, wrong issuer and expired tokens are refused before SQL", async () => {
  const f = await fixture(), m = mock(f.jwk);
  const handle = createHandler(config, m.request);
  for (
    const token of [
      undefined,
      "unsigned.payload.token",
      await f.sign({ role: "service_role" }),
      await f.sign({ iss: "https://attacker.example/auth/v1" }),
      await f.sign({ exp: 1 }),
    ]
  ) {
    const r = await handle(
      new Request("https://edge.example/glam-api/v1/me", {
        headers: token ? { Authorization: "Bearer " + token } : {},
      }),
    );
    assert(r.status === 401);
    assert(!m.calls.some((c) => c.url.includes("/rest/")));
  }
});
Deno.test("valid signature and active account required; database receives user JWT only", async () => {
  const f = await fixture(),
    m = mock(f.jwk),
    token = await f.sign(),
    handle = createHandler(config, m.request);
  const r = await handle(
    new Request("https://edge.example/functions/v1/glam-api/v1/me/profile", {
      headers: { Authorization: "Bearer " + token },
    }),
  );
  assert(r.status === 200);
  assert((await r.json()).id === UID);
  const sql = m.calls.filter((c) => c.url.includes("/rest/"));
  assert(sql.length === 2);
  assert(
    sql.every((c) => c.headers.get("Authorization") === "Bearer " + token),
  );
  assert(sql.every((c) => c.headers.get("apikey") === "public-fixture-key"));
  assert(sql[1].body.p_path === "/v1/me/profile");
  assert(r.headers.get("Cache-Control") === "no-store");
  const mismatch = mock(f.jwk, { userId: "another-user" });
  assert(
    (await createHandler(config, mismatch.request)(
      new Request("https://edge.example/glam-api/v1/me", {
        headers: { Authorization: "Bearer " + token },
      }),
    )).status === 401,
  );
});
Deno.test("tampered signature never reaches data operations", async () => {
  const f = await fixture(), m = mock(f.jwk), token = await f.sign();
  const parts = token.split(".");
  parts[1] = b64(
    enc.encode(
      JSON.stringify({
        sub: UID,
        iss: URL + "/auth/v1",
        aud: "authenticated",
        role: "authenticated",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 999,
      }),
    ),
  );
  const r = await createHandler(config, m.request)(
    new Request("https://edge.example/glam-api/v1/me", {
      headers: { Authorization: "Bearer " + parts.join(".") },
    }),
  );
  assert(r.status === 401);
  assert(!m.calls.some((c) => c.url.includes("/rest/")));
});
Deno.test("unknown signing-key IDs cannot force refresh on each request", async () => {
  const f = await fixture(),
    m = mock(f.jwk),
    handle = createHandler(config, m.request);
  for (let i = 0; i < 3; i++) {
    const token = await f.sign({}, "unknown-" + i);
    assert(
      (await handle(
        new Request("https://edge.example/glam-api/v1/me", {
          headers: { Authorization: "Bearer " + token },
        }),
      )).status === 401,
    );
  }
  assert(m.calls.filter((c) => c.url.includes("jwks")).length === 1);
});
Deno.test("database meter refusal and disallowed origins fail closed", async () => {
  const f = await fixture(),
    m = mock(f.jwk, { blocked: true }),
    handle = createHandler(config, m.request),
    token = await f.sign();
  const r = await handle(
    new Request("https://edge.example/glam-api/v1/me", {
      headers: { Authorization: "Bearer " + token },
    }),
  );
  assert(r.status === 429 && r.headers.get("Retry-After") === "60");
  assert(!m.calls.some((c) => c.url.endsWith("/glam_api_v1")));
  assert(
    (await handle(
      new Request("https://edge.example/glam-api/health/live", {
        headers: { Origin: "https://unapproved.example" },
      }),
    )).status === 403,
  );
});
Deno.test("request limits, JSON validation and error responses do not expose provider details", async () => {
  const f = await fixture(),
    m = mock(f.jwk, { databaseError: true }),
    token = await f.sign(),
    handle = createHandler(config, m.request);
  const r = await handle(
    new Request("https://edge.example/glam-api/v1/organizations", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "Idempotency-Key": "fixture",
      },
      body: JSON.stringify({ name: "Owned" }),
    }),
  );
  assert(r.status === 409);
  assert(!(await r.text()).includes("fixture-secret"));
  const large = await handle(
    new Request("https://edge.example/glam-api/v1/organizations", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "x".repeat(40000) }),
    }),
  );
  assert(large.status === 413);
});
