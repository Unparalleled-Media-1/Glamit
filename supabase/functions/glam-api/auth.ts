export type AuthClaims = {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  role: string;
  aal?: string;
  auth_time?: number;
  amr?: Array<{ method: string; timestamp: number }>;
};
export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
const decoder = new TextDecoder();
function bytes(value: string) {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    throw new ApiError(401, "INVALID_ACCESS_TOKEN");
  }
}
function object(value: string): Record<string, unknown> {
  try {
    const o = JSON.parse(decoder.decode(bytes(value)));
    if (!o || typeof o !== "object" || Array.isArray(o)) throw 0;
    return o;
  } catch {
    throw new ApiError(401, "INVALID_ACCESS_TOKEN");
  }
}
export function authVerifier(
  url: string,
  publicKey: string,
  request: typeof fetch = fetch,
) {
  let cached:
    | { keys: JsonWebKey[]; until: number; fetchedAt: number }
    | undefined;
  async function keys(force = false) {
    if (!force && cached && cached.until > Date.now()) return cached.keys;
    if (force && cached && Date.now() - cached.fetchedAt < 30000) {
      return cached.keys;
    }
    let response: Response;
    try {
      response = await request(url + "/auth/v1/.well-known/jwks.json", {
        headers: { apikey: publicKey },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ApiError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
    }
    if (!response.ok) throw new ApiError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
    const value = await response.json();
    if (!Array.isArray(value.keys) || value.keys.length > 20) {
      throw new ApiError(503, "INVALID_SIGNING_KEYS");
    }
    cached = {
      keys: value.keys,
      until: Date.now() + 300000,
      fetchedAt: Date.now(),
    };
    return cached.keys;
  }
  return async (
    header: string | null,
  ): Promise<{ token: string; claims: AuthClaims }> => {
    const token = header?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
    if (!token || token.length > 16384) {
      throw new ApiError(401, "AUTHENTICATION_REQUIRED");
    }
    const parts = token.split(".");
    if (parts.length !== 3) throw new ApiError(401, "INVALID_ACCESS_TOKEN");
    const h = object(parts[0]), c = object(parts[1]);
    if (
      !["ES256", "RS256"].includes(String(h.alg)) ||
      typeof h.kid !== "string" || h.kid.length > 200
    ) {
      throw new ApiError(401, "INVALID_ACCESS_TOKEN");
    }
    const now = Date.now() / 1000;
    if (
      c.iss !== url + "/auth/v1" || c.role !== "authenticated" ||
      !(c.aud === "authenticated" ||
        (Array.isArray(c.aud) && c.aud.includes("authenticated"))) ||
      typeof c.sub !== "string" || !/^[0-9a-f-]{36}$/i.test(c.sub) ||
      typeof c.exp !== "number" || !Number.isFinite(c.exp) || c.exp <= now ||
      typeof c.iat !== "number" || !Number.isFinite(c.iat) || c.iat > now + 30
    ) {
      throw new ApiError(401, "INVALID_ACCESS_TOKEN");
    }
    let jwk = (await keys()).find((k) =>
      (k as JsonWebKey & { kid?: string }).kid === h.kid
    );
    if (!jwk) {
      jwk = (await keys(true)).find((k) =>
        (k as JsonWebKey & { kid?: string }).kid === h.kid
      );
    }
    if (
      !jwk || (jwk.alg && jwk.alg !== h.alg) ||
      (h.alg === "ES256" && jwk.kty !== "EC") ||
      (h.alg === "RS256" && jwk.kty !== "RSA")
    ) throw new ApiError(401, "INVALID_ACCESS_TOKEN");
    try {
      const algorithm = h.alg === "ES256"
        ? { name: "ECDSA", namedCurve: "P-256" }
        : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
      const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, [
        "verify",
      ]);
      const verified = await crypto.subtle.verify(
        h.alg === "ES256"
          ? { name: "ECDSA", hash: "SHA-256" }
          : "RSASSA-PKCS1-v1_5",
        key,
        bytes(parts[2]),
        new TextEncoder().encode(parts[0] + "." + parts[1]),
      );
      if (!verified) throw 0;
    } catch {
      throw new ApiError(401, "INVALID_ACCESS_TOKEN");
    }
    // A valid signature alone does not establish that an account is still active.
    let user: Response;
    try {
      user = await request(url + "/auth/v1/user", {
        headers: { apikey: publicKey, Authorization: "Bearer " + token },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ApiError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
    }
    if (user.status === 401 || user.status === 403) {
      throw new ApiError(401, "INVALID_ACCESS_TOKEN");
    }
    if (!user.ok) throw new ApiError(503, "IDENTITY_PROVIDER_UNAVAILABLE");
    const u = await user.json();
    if (u.id !== c.sub) throw new ApiError(401, "IDENTITY_SUBJECT_MISMATCH");
    return { token, claims: c as AuthClaims };
  };
}
