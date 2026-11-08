import test from "node:test";
import assert from "node:assert/strict";
import { publicSupabaseKey } from "../../scripts/public-supabase-config.mjs";
const token = (claims) =>
  "e30." + Buffer.from(JSON.stringify(claims)).toString("base64url") +
  ".fixture";
test("only public keys may be included in the static website", () => {
  const valid = token({ role: "anon", ref: "bkkmsbxrxkqaveymcrgi" });
  assert.equal(publicSupabaseKey(valid), valid);
  assert.equal(
    publicSupabaseKey("sb_publishable_fixture_public_key_1234"),
    "sb_publishable_fixture_public_key_1234",
  );
  for (
    const key of [
      undefined,
      "",
      "sb_secret_fixture_server_key_1234",
      token({ role: "service_role", ref: "bkkmsbxrxkqaveymcrgi" }),
      token({ role: "anon", ref: "wrong-project" }),
    ]
  ) {
    assert.throws(() => publicSupabaseKey(key));
  }
});
