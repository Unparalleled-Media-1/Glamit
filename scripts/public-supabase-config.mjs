/** Build-time guard: browser configuration must never contain a privileged server key. */
export function publicSupabaseKey(value) {
  if (typeof value !== "string" || !value) {
    throw Error("Supabase public build key is required.");
  }
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value)) return value;
  try {
    const parts = value.split(".");
    if (parts.length !== 3) throw 0;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (claims.role === "anon" && claims.ref === "bkkmsbxrxkqaveymcrgi") {
      return value;
    }
  } catch { /* Credential values never enter errors or logs. */ }
  throw Error(
    "Only the original project's public anon or publishable key may enter the browser build.",
  );
}
