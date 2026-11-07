import { ApiError, authVerifier } from "./auth.ts";
export type Config = {
  url: string;
  publicKey: string;
  origins: string[];
  build: string;
};
export function createHandler(config: Config, request: typeof fetch = fetch) {
  if (
    config.url !== "https://bkkmsbxrxkqaveymcrgi.supabase.co" ||
    !config.publicKey
  ) {
    throw new Error("QUALIFIED_PROJECT_CONFIGURATION_REQUIRED");
  }
  const authenticate = authVerifier(config.url, config.publicKey, request);
  async function rpc(name: string, token: string, body: unknown) {
    let response: Response;
    try {
      response = await request(config.url + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers: {
          apikey: config.publicKey,
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new ApiError(503, "DATABASE_UNAVAILABLE");
    }
    if (!response.ok) {
      let problem: { message?: string; code?: string } = {};
      try {
        problem = await response.json();
      } catch { /* no provider bodies enter logs */ }
      const status = ["23505", "40001", "40P01"].includes(problem.code || "")
        ? 409
        : ["23514", "23502", "22P02", "22003"].includes(problem.code || "")
        ? 422
        : response.status;
      throw new ApiError(
        status,
        /^[A-Z_]{3,100}$/.test(problem.message || "")
          ? problem.message!
          : "DATABASE_OPERATION_FAILED",
      );
    }
    return response.json();
  }
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const origin = req.headers.get("Origin");
    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-ID": requestId,
      "X-GLAM-Build": config.build,
      "Access-Control-Allow-Headers":
        "authorization,apikey,content-type,idempotency-key,x-request-id",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      Vary: "Origin",
    });
    const reply = (status: number, value: unknown) =>
      new Response(JSON.stringify(value), { status, headers });
    try {
      if (origin && !config.origins.includes(origin)) {
        throw new ApiError(403, "ORIGIN_NOT_ALLOWED");
      }
      if (origin) headers.set("Access-Control-Allow-Origin", origin);
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }
      const url = new URL(req.url);
      const path =
        url.pathname.replace(/^\/functions\/v1\/glam-api/, "").replace(
          /^\/glam-api/,
          "",
        ) || "/";
      if (req.method === "GET" && path === "/health/live") {
        return reply(200, {
          status: "alive",
          service: "glam-api",
          build: config.build,
        });
      }
      const { token } = await authenticate(req.headers.get("Authorization"));
      const meter = await rpc("glam_api_gate", token, {});
      if (meter.allowed !== true) throw new ApiError(429, "RATE_LIMITED");
      if (req.method === "GET" && path === "/health/ready") {
        return reply(200, await rpc("glam_backend_status", token, {}));
      }
      const length = req.headers.get("Content-Length");
      if (length && Number(length) > 32768) {
        throw new ApiError(413, "REQUEST_TOO_LARGE");
      }
      let body = {};
      if (!["GET", "DELETE"].includes(req.method)) {
        if (!req.headers.get("Content-Type")?.startsWith("application/json")) {
          throw new ApiError(415, "JSON_REQUIRED");
        }
        const reader = req.body?.getReader();
        let bytes = 0;
        const chunks: Uint8Array[] = [];
        if (reader) {
          while (true) {
            const piece = await reader.read();
            if (piece.done) break;
            bytes += piece.value.byteLength;
            if (bytes > 32768) {
              await reader.cancel();
              throw new ApiError(413, "REQUEST_TOO_LARGE");
            }
            chunks.push(piece.value);
          }
        }
        const data = new Uint8Array(bytes);
        let at = 0;
        for (const piece of chunks) {
          data.set(piece, at);
          at += piece.length;
        }
        try {
          body = JSON.parse(new TextDecoder().decode(data));
        } catch {
          throw new ApiError(422, "INVALID_JSON");
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new ApiError(422, "JSON_OBJECT_REQUIRED");
        }
      }
      const result = await rpc("glam_api_v1", token, {
        p_method: req.method,
        p_path: path,
        p_body: body,
        p_key: req.headers.get("Idempotency-Key"),
      });
      return req.method === "DELETE"
        ? new Response(null, { status: 204, headers })
        : reply(req.method === "POST" ? 201 : 200, result);
    } catch (error) {
      const failure = error instanceof ApiError
        ? error
        : new ApiError(503, "BACKEND_UNAVAILABLE");
      if (failure.status === 401) headers.set("WWW-Authenticate", "Bearer");
      if (failure.status === 429) headers.set("Retry-After", "60");
      return reply(failure.status, {
        code: failure.code,
        message: failure.code,
        request_id: requestId,
        retryable: [429, 503].includes(failure.status),
      });
    }
  };
}
