/** Shared authenticated Web/React Native transport. Never stores bytes, tokens or public URLs. */
import type { components } from "../contracts/api";

export type Media = components["schemas"]["MediaRead"];
export type MediaIntent = components["schemas"]["MediaIntent"];
const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const knownErrors = new Set([
  "private_media_not_configured", "private_storage_not_configured",
  "reviewed_media_retention_configuration_required", "private_media_migration_required",
  "private_media_runtime_permissions_required", "private_bucket_not_qualified",
  "private_media_privacy_guards_required", "private_storage_catalog_required",
  "approved_photo_storage_policy_required",
  "current_photo_storage_consent_required", "qualified_photo_eligibility_required",
  "media_expired_or_consent_epoch_changed", "media_deletion_requested",
  "media_idempotency_conflict", "private_photo_content_mismatch",
  "private_photo_mime_mismatch", "private_photo_too_large",
  "unsupported_or_invalid_private_photo", "storage_unavailable", "storage_auth_rejected",
  "storage_write_not_confirmed", "storage_delete_not_confirmed", "private_media_capacity_reached",
]);

function media(value: unknown): Media {
  if (!value || typeof value !== "object") throw new PrivateMediaError("private_media_response_invalid");
  const v = value as Record<string, unknown>;
  const positive = (n: unknown) => n === null || (Number.isSafeInteger(n) && (n as number) > 0);
  const date = (d: unknown) => typeof d === "string" && Number.isFinite(Date.parse(d));
  if (typeof v.id !== "string" || !UUID.test(v.id) || v.content_type !== "image/png" ||
      !["pending", "ready", "deletion_pending", "deleted"].includes(v.state as string) ||
      !positive(v.width) || !positive(v.height) || !positive(v.stored_size) ||
      (typeof v.stored_size === "number" && v.stored_size > MAX_BYTES) ||
      !date(v.created_at) || !date(v.expires_at) ||
      !(v.deleted_at === null || date(v.deleted_at)) ||
      !(v.last_error_code === null || (typeof v.last_error_code === "string" &&
        /^[a-z_]{1,100}$/.test(v.last_error_code))) ||
      (v.state === "ready" && [v.width, v.height, v.stored_size].includes(null)) ||
      (v.state === "deleted" && (v.deleted_at === null ||
        [v.width, v.height, v.stored_size].some(n => n !== null)))) {
    throw new PrivateMediaError("private_media_response_invalid");
  }
  // Project only the public contract; never propagate extra server fields into device state.
  return {
    id: v.id, state: v.state as Media["state"], content_type: "image/png",
    width: v.width as number | null, height: v.height as number | null,
    stored_size: v.stored_size as number | null, created_at: v.created_at as string,
    expires_at: v.expires_at as string, deleted_at: v.deleted_at as string | null,
    last_error_code: v.last_error_code as string | null,
  };
}

export class PrivateMediaError extends Error {
  constructor(public code: string, public retryable = false, public status?: number) {
    super(code);
  }
}

export function createPrivateMediaClient(options: {
  apiOrigin: string;
  getToken: () => string | null;
  sha256: (data: ArrayBuffer) => Promise<string>;
  fetch?: typeof globalThis.fetch;
}) {
  const origin = new URL(options.apiOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search ||
      origin.hash || origin.pathname !== "/") throw new PrivateMediaError("invalid_media_origin");
  const transport = options.fetch || globalThis.fetch;
  const session = (expected?: string) => {
    const token = options.getToken();
    if (!token || (expected && token !== expected)) throw new PrivateMediaError("media_session_changed");
    return token;
  };
  const id = (value: string) => {
    if (!UUID.test(value)) throw new PrivateMediaError("invalid_media_identifier");
    return value;
  };
  async function request(path: string, token: string, init: RequestInit = {}) {
    session(token);
    let response: Response;
    try {
      response = await transport(origin.origin + path, {
        ...init, redirect: "error", cache: "no-store",
        headers: { ...init.headers, Authorization: "Bearer " + token },
      });
    } catch {
      throw new PrivateMediaError("private_media_transport_unavailable", true);
    }
    session(token);
    if (!response.ok) {
      // Never surface a provider body, photo bytes, token or exception text in the UI.
      let code = "private_media_request_failed";
      try {
        const error = await response.json();
        session(token);
        const candidate = typeof error.message === "string" ? error.message : error.code;
        if (knownErrors.has(candidate)) code = candidate;
      } catch (error) {
        if (error instanceof PrivateMediaError) throw error;
      }
      const retryable = response.status === 429 || (response.status >= 500 &&
        ["private_media_request_failed", "storage_unavailable", "storage_write_not_confirmed",
          "storage_delete_not_confirmed"].includes(code));
      throw new PrivateMediaError(code, retryable, response.status);
    }
    return response;
  }
  async function json<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
    const response = await request(path, token, init);
    try {
      const result = await response.json();
      session(token);
      return result as T;
    } catch (error) {
      if (error instanceof PrivateMediaError) throw error;
      throw new PrivateMediaError("private_media_response_invalid");
    }
  }
  return {
    status: async () => {
      const value = await json<Record<string, unknown>>("/v1/media/status", session());
      if (!value || value.scope !== "private_media_storage" ||
          !["NOT CONFIGURED", "DEGRADED", "CONNECTED"].includes(value.state as string)) {
        throw new PrivateMediaError("private_media_response_invalid");
      }
      return {
        state: value.state as "NOT CONFIGURED" | "DEGRADED" | "CONNECTED",
        code: typeof value.code === "string" && knownErrors.has(value.code) ? value.code : undefined,
      };
    },
    policy: () => json<components["schemas"]["PolicyRead"]>("/v1/media/policy", session()),
    consent: (policyId: string, action: "granted" | "withdrawn", requestKey: string) =>
      json<components["schemas"]["ConsentResult"]>(`/v1/policies/${id(policyId)}/consent`, session(), {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": id(requestKey) },
        body: JSON.stringify({ action }),
      }),
    list: async () => {
      const values = await json<unknown>("/v1/media", session());
      if (!Array.isArray(values) || values.length > 100) {
        throw new PrivateMediaError("private_media_response_invalid");
      }
      return values.map(media);
    },
    metadata: async (mediaId: string) => media(await json(`/v1/media/${id(mediaId)}`, session())),
    remove: async (mediaId: string) => media(await json(`/v1/media/${id(mediaId)}`, session(), { method: "DELETE" })),
    async download(mediaId: string) {
      const token = session();
      const response = await request(`/v1/media/${id(mediaId)}/content`, token);
      if (response.headers.get("content-type")?.split(";")[0] !== "image/png") {
        throw new PrivateMediaError("private_media_response_invalid");
      }
      const value = await response.arrayBuffer();
      session(token);
      if (value.byteLength > MAX_BYTES) throw new PrivateMediaError("private_media_response_too_large");
      return value;
    },
    async uploadPhoto(input: {
      data: ArrayBuffer; contentType: MediaIntent["content_type"]; policyId: string;
    }, requestKey: string) {
      const token = session();
      id(requestKey); id(input.policyId);
      if (!input.data.byteLength || input.data.byteLength > MAX_BYTES) {
        throw new PrivateMediaError("private_photo_size_invalid");
      }
      const data = input.data.slice(0);
      const contentType = input.contentType, policyId = input.policyId;
      const hash = await options.sha256(data);
      session(token);
      if (!/^[a-f0-9]{64}$/.test(hash)) throw new PrivateMediaError("private_photo_digest_invalid");
      const body: MediaIntent = {
        content_type: contentType, policy_id: policyId,
        size_bytes: data.byteLength, sha256: hash,
      };
      const intent = media(await json("/v1/media", token, {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: JSON.stringify(body),
      }));
      if (intent.state === "ready") return intent;
      if (intent.state !== "pending") throw new PrivateMediaError("private_photo_not_uploadable");
      return media(await json(`/v1/media/${id(intent.id)}/content`, token, {
        method: "PUT", headers: { "Content-Type": contentType }, body: data,
      }));
    },
  };
}
