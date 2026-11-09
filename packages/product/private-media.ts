/** Shared authenticated Web/React Native transport. Never stores bytes, tokens or public URLs. */
import { createAnalysisOperations } from "./analysis";
import type { components } from "../contracts/api";

export type Media = components["schemas"]["MediaRead"];
export type MediaIntent = components["schemas"]["MediaIntent"];
const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const knownErrors = new Set([
  "analysis_correction_revision_conflict", "style_passport_revision_conflict",
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
  getSubject?: () => string | undefined;
  sha256: (data: ArrayBuffer) => Promise<string>;
  fetch?: typeof globalThis.fetch;
}) {
  const origin = new URL(options.apiOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search ||
      origin.hash || origin.pathname !== "/") throw new PrivateMediaError("invalid_media_origin");
  const transport = options.fetch || globalThis.fetch;
  const session = (expected?: string) => {
    const token = options.getToken();
    if (!token || token.length > 16384 || /[\r\n]/.test(token) || (expected && token !== expected))
      throw new PrivateMediaError("media_session_changed");
    return token;
  };
  const id = (value: string) => {
    if (!UUID.test(value)) throw new PrivateMediaError("invalid_media_identifier");
    return value;
  };
  const active = (token: string, signal?: AbortSignal) => {
    session(token);
    if (signal?.aborted) throw new PrivateMediaError("private_media_request_cancelled");
  };
  async function request(path: string, token: string, init: RequestInit = {}, signal?: AbortSignal, binary = false) {
    active(token, signal);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
    const checkpoint = () => {
      active(token, signal);
      if (timedOut) throw new PrivateMediaError("private_media_request_timed_out", true);
    };
    try {
      const response = await transport(origin.origin + path, {
        ...init, redirect: "error", cache: "no-store", credentials: "omit", signal: controller.signal,
        headers: { ...init.headers, Authorization: "Bearer " + token },
      });
      checkpoint();
      if (response.redirected || (response.url && new URL(response.url).origin !== origin.origin))
        throw new PrivateMediaError("private_media_response_invalid");
      const limit = binary && response.ok ? MAX_BYTES : 65536;
      const size = Number(response.headers.get("content-length") || 0);
      if (!Number.isSafeInteger(size) || size < 0 || size > limit)
        throw new PrivateMediaError("private_media_response_too_large");
      if (binary && response.ok && response.headers.get("content-type")?.split(";")[0] !== "image/png")
        throw new PrivateMediaError("private_media_response_invalid");
      // Expo fetch and browsers expose bounded streaming. The fallback supports older
      // transports, with the same post-read size/session/cancellation checks.
      let bytes: Uint8Array | undefined;
      const reader = response.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let length = 0, complete = false;
        const cancelReader = () => { void reader.cancel().catch(() => {}); };
        controller.signal.addEventListener("abort", cancelReader, { once: true });
        try {
          while (true) {
            const chunk = await reader.read();
            checkpoint();
            if (chunk.done) { complete = true; break; }
            length += chunk.value.byteLength;
            if (length > limit) throw new PrivateMediaError("private_media_response_too_large");
            chunks.push(chunk.value);
          }
          bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        } finally {
          controller.signal.removeEventListener("abort", cancelReader);
          if (!complete) cancelReader();
          reader.releaseLock();
        }
      }
      if (binary && response.ok) {
        const data = bytes ? bytes.buffer : await response.arrayBuffer();
        checkpoint();
        if (data.byteLength > limit) throw new PrivateMediaError("private_media_response_too_large");
        return data;
      }
      const raw = bytes ? new TextDecoder().decode(bytes) : await response.text();
      checkpoint();
      if (raw.length > limit || new TextEncoder().encode(raw).byteLength > limit)
        throw new PrivateMediaError("private_media_response_too_large");
      let value: unknown;
      try { value = JSON.parse(raw); }
      catch { throw new PrivateMediaError("private_media_response_invalid"); }
      if (response.ok) return value;
      // Never surface a provider body, photo bytes, token or exception text in the UI.
      let code = "private_media_request_failed";
      if (value && typeof value === "object") {
        const error = value as Record<string, unknown>;
        const candidate = typeof error.message === "string" ? error.message : error.code;
        if (typeof candidate === "string" && knownErrors.has(candidate)) code = candidate;
      }
      const retryable = response.status === 429 || (response.status >= 500 &&
        ["private_media_request_failed", "storage_unavailable", "storage_write_not_confirmed",
          "storage_delete_not_confirmed"].includes(code));
      throw new PrivateMediaError(code, retryable, response.status);
    } catch (error) {
      checkpoint();
      if (error instanceof PrivateMediaError) throw error;
      throw new PrivateMediaError("private_media_transport_unavailable", true);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  async function json<T>(path: string, token: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    return await request(path, token, init, signal) as T;
  }
  return {
    ...createAnalysisOperations((path, init, signal) => json(path, session(), init, signal), () => options.getSubject?.()),
    status: async (signal?: AbortSignal) => {
      const value = await json<Record<string, unknown>>("/v1/media/status", session(), {}, signal);
      if (!value || value.scope !== "private_media_storage" ||
          !["NOT CONFIGURED", "DEGRADED", "CONNECTED"].includes(value.state as string)) {
        throw new PrivateMediaError("private_media_response_invalid");
      }
      return {
        state: value.state as "NOT CONFIGURED" | "DEGRADED" | "CONNECTED",
        code: typeof value.code === "string" && knownErrors.has(value.code) ? value.code : undefined,
      };
    },
    policy: async (signal?: AbortSignal): Promise<components["schemas"]["PolicyRead"]> => {
      const value = await json<components["schemas"]["PolicyRead"]>("/v1/media/policy", session(), {}, signal);
      if (!value || !UUID.test(value.id) || value.purpose !== "private_photo_storage" ||
          typeof value.version !== "string" || !value.version.trim() || value.version.length > 200 ||
          typeof value.content !== "string" || !value.content.trim() || value.content.length > 60000)
        throw new PrivateMediaError("private_media_response_invalid");
      return { id: value.id, purpose: value.purpose, version: value.version, content: value.content };
    },
    consent: async (policyId: string, action: "granted" | "withdrawn", requestKey: string, signal?: AbortSignal): Promise<components["schemas"]["ConsentResult"]> => {
      if (!["granted", "withdrawn"].includes(action)) throw new PrivateMediaError("invalid_media_consent");
      const value = await json<components["schemas"]["ConsentResult"]>(`/v1/policies/${id(policyId)}/consent`, session(), {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": id(requestKey) },
        body: JSON.stringify({ action }),
      }, signal);
      if (!value || !UUID.test(value.id) || value.action !== action) throw new PrivateMediaError("private_media_response_invalid");
      return { id: value.id, action: value.action };
    },
    list: async (signal?: AbortSignal) => {
      const values = await json<unknown>("/v1/media", session(), {}, signal);
      if (!Array.isArray(values) || values.length > 100) {
        throw new PrivateMediaError("private_media_response_invalid");
      }
      return values.map(media);
    },
    metadata: async (mediaId: string, signal?: AbortSignal) => media(await json(`/v1/media/${id(mediaId)}`, session(), {}, signal)),
    remove: async (mediaId: string, signal?: AbortSignal) => media(await json(`/v1/media/${id(mediaId)}`, session(), { method: "DELETE" }, signal)),
    async download(mediaId: string, signal?: AbortSignal) {
      return await request(`/v1/media/${id(mediaId)}/content`, session(), {}, signal, true) as ArrayBuffer;
    },
    async uploadPhoto(input: {
      data: ArrayBuffer; contentType: MediaIntent["content_type"]; policyId: string;
    }, requestKey: string, signal?: AbortSignal) {
      const token = session();
      active(token, signal);
      id(requestKey); id(input.policyId);
      if (!input.data.byteLength || input.data.byteLength > MAX_BYTES) {
        throw new PrivateMediaError("private_photo_size_invalid");
      }
      const data = input.data.slice(0);
      const contentType = input.contentType, policyId = input.policyId;
      const hash = await options.sha256(data);
      active(token, signal);
      if (!/^[a-f0-9]{64}$/.test(hash)) throw new PrivateMediaError("private_photo_digest_invalid");
      const body: MediaIntent = {
        content_type: contentType, policy_id: policyId,
        size_bytes: data.byteLength, sha256: hash,
      };
      const intent = media(await json("/v1/media", token, {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: JSON.stringify(body),
      }, signal));
      if (intent.state === "ready") return intent;
      if (intent.state !== "pending") throw new PrivateMediaError("private_photo_not_uploadable");
      return media(await json(`/v1/media/${id(intent.id)}/content`, token, {
        method: "PUT", headers: { "Content-Type": contentType }, body: data,
      }, signal));
    },
  };
}
