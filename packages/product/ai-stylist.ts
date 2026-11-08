/** Authenticated shared text-styling transport. No provider keys, photos or automatic retries. */
import type { components } from "../contracts/api";
export type StylingAdvice = components["schemas"]["AdviceRead"];
export type StylingPolicy = components["schemas"]["PolicyRead"];
export type StylingStatus = components["schemas"]["OpenAIStatus"];
export type StylingSession = {
    subject: string;
    token: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bounded = (v: unknown, n: number): v is string => typeof v === "string" && !!v.trim() && v.length <= n;
const errors = new Set([
    "openai_advisor_not_enabled", "reviewed_advisor_request_limit_required", "openai_not_configured",
    "qualified_openai_model_required", "approved_styling_advice_policy_required",
    "current_styling_advice_consent_required", "qualified_styling_advice_eligibility_required",
    "styling_attempt_already_consumed", "styling_request_limit_reached", "styling_provider_unavailable",
    "styling_response_unavailable", "styling_scope_changed", "styling_runtime_permissions_required",
]);
export class StylistError extends Error {
    constructor(public code: string, public retryable = false, public status?: number) { super(code); }
}
export function createStylistClient(options: {
    apiOrigin: string;
    getSession: () => StylingSession | null;
    fetch?: typeof globalThis.fetch;
}) {
    const origin = new URL(options.apiOrigin);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/")
        throw new StylistError("invalid_styling_origin");
    const fetcher = options.fetch || globalThis.fetch;
    function session(expected?: StylingSession) {
        const s = options.getSession();
        if (!s || !bounded(s.subject, 200) || !bounded(s.token, 16384) || /[\r\n]/.test(s.token) ||
            (expected && (s.subject !== expected.subject || s.token !== expected.token)))
            throw new StylistError("styling_session_changed", false, 401);
        return { subject: s.subject, token: s.token };
    }
    async function request(path: string, init: RequestInit, expected: StylingSession, signal?: AbortSignal) {
        session(expected);
        if (signal?.aborted)
            throw new StylistError("styling_request_cancelled");
        const controller = new AbortController(), abort = () => controller.abort();
        signal?.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
            let response: Response;
            try {
                response = await fetcher(origin.origin + path, {
                    ...init, headers: { Authorization: "Bearer " + expected.token, "Content-Type": "application/json", ...init.headers },
                    cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal,
                });
            }
            catch {
                session(expected);
                throw new StylistError(signal?.aborted ? "styling_request_cancelled" : "styling_connection_unavailable", !signal?.aborted);
            }
            session(expected);
            if (response.redirected || (response.url && new URL(response.url).origin !== origin.origin))
                throw new StylistError("styling_response_invalid");
            const length = Number(response.headers.get("content-length") || 0);
            if (!Number.isFinite(length) || length > 65536)
                throw new StylistError("styling_response_invalid");
            let value: unknown;
            try {
                const raw = await response.text();
                if (raw.length > 65536)
                    throw Error();
                value = JSON.parse(raw);
            }
            catch {
                throw new StylistError("styling_response_invalid");
            }
            session(expected);
            if (!response.ok) {
                const code = (value as {
                    message?: unknown;
                })?.message;
                throw new StylistError(response.status === 401 ? "styling_session_changed" : typeof code === "string" && errors.has(code) ? code : response.status === 422 ? "invalid_styling_brief" : "styling_request_failed", [429, 503].includes(response.status), response.status);
            }
            if (!value || typeof value !== "object" || Array.isArray(value))
                throw new StylistError("styling_response_invalid");
            return value as Record<string, unknown>;
        }
        finally {
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
        }
    }
    function identifier(value: string) { if (!uuid.test(value))
        throw new StylistError("invalid_styling_identifier"); return value; }
    return {
        async status(signal?: AbortSignal): Promise<StylingStatus> {
            const s = session(), v = await request("/v1/ai/openai/status", {}, s, signal);
            if (v.service !== "openai" || v.scope !== "openai_authenticated_api" ||
                !["NOT CONFIGURED", "CONNECTED", "DEGRADED"].includes(v.state as string) ||
                [v.configured, v.model_configured, v.advice_enabled].some(b => typeof b !== "boolean") ||
                v.response_persistence !== "transient" || !bounded(v.reason, 500))
                throw new StylistError("styling_response_invalid");
            return { service: "openai", scope: "openai_authenticated_api", state: v.state as StylingStatus["state"], configured: v.configured as boolean, model_configured: v.model_configured as boolean, advice_enabled: v.advice_enabled as boolean, response_persistence: "transient", reason: v.reason };
        },
        async policy(signal?: AbortSignal): Promise<StylingPolicy> {
            const s = session(), v = await request("/v1/ai/stylist/policy", {}, s, signal);
            if (typeof v.id !== "string" || !uuid.test(v.id) || v.purpose !== "ai_styling_advice" || !bounded(v.version, 200) || !bounded(v.content, 50000))
                throw new StylistError("styling_response_invalid");
            return { id: v.id, purpose: v.purpose, version: v.version, content: v.content };
        },
        async consent(policy: string, action: "granted" | "withdrawn", key: string, signal?: AbortSignal) {
            const s = session();
            identifier(policy);
            identifier(key);
            const v = await request("/v1/policies/" + policy + "/consent", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ action }) }, s, signal);
            if (typeof v.id !== "string" || !uuid.test(v.id) || v.action !== action)
                throw new StylistError("styling_response_invalid");
        },
        async ask(messages: readonly string[], policy: string, key: string, signal?: AbortSignal): Promise<StylingAdvice> {
            const s = session(), snapshot = [...messages];
            identifier(policy);
            identifier(key);
            if (!snapshot.length || snapshot.length > 10 || snapshot.some(v => !bounded(v, 2000)) || snapshot.reduce((n, v) => n + v.length, 0) > 8000)
                throw new StylistError("invalid_styling_brief");
            const v = await request("/v1/ai/stylist/advice", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ messages: snapshot, policy_id: policy, consent: true }) }, s, signal);
            const a = v.advice as StylingAdvice["advice"] | undefined;
            if (v.id !== key || v.subject !== s.subject || v.provider !== "openai" || !bounded(v.model, 160) ||
                typeof v.completed_at !== "string" || !Number.isFinite(Date.parse(v.completed_at)) || Date.parse(v.completed_at) > Date.now() + 60000 ||
                !a || !bounded(a.message, 4000) || !bounded(a.uncertainty, 1000) || !Array.isArray(a.directions) || a.directions.length > 12 ||
                a.directions.some(d => !d || !bounded(d.id, 160) || !bounded(d.title, 160) || !bounded(d.rationale, 1000) || !bounded(d.style, 160) || !["Hair Try-On", "Hair Color", "Makeup Match", "Glow-Up Preview", "Look Remix"].includes(d.tool)) ||
                new Set(a.directions.map(d => d.id)).size !== a.directions.length)
                throw new StylistError("styling_response_invalid");
            return { id: key, subject: s.subject, provider: "openai", model: v.model, completed_at: v.completed_at, advice: { message: a.message, uncertainty: a.uncertainty, directions: a.directions.map(d => ({ id: d.id, title: d.title, rationale: d.rationale, style: d.style, tool: d.tool })) } };
        },
    };
}
