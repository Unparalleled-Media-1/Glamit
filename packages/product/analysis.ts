/** Runtime validation for private analysis operations over the existing bounded media transport. */
import type { components } from "../contracts/api";
type Schemas = components["schemas"];
export type CorrectedReport = Schemas["CorrectedReportRead"];
export type AnalysisPassport = Schemas["PassportRead"];
export type AnalysisPermissions = Schemas["AnalysisPermissions"];
export type AnalysisJob = Schemas["AnalysisJobRead"];
export type CorrectionValues = Schemas["CorrectionRequest"]["corrections"];
export type AnalysisGoal = Schemas["JobRequest"]["goals"][number];
const keys = ["face-shape", "eyes", "brows", "lips", "undertone"];
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const date = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
const version = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) < 2147483647;
const string = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && v.length <= max;
function invalid(): never { throw new Error("analysis_response_invalid"); }
function record(v: unknown): Record<string, any> { if (!v || typeof v !== "object" || Array.isArray(v)) invalid(); return v as Record<string, any>; }
function id(v: unknown) { if (!uuid(v)) invalid(); return v; }
function corrections(value: unknown): CorrectionValues {
  const v = record(value), result: CorrectionValues = {};
  for (const [key, value] of Object.entries(v)) {
    if (!keys.includes(key) || !string(value, 240)) invalid();
    result[key as keyof CorrectionValues] = value;
  }
  return result;
}
export function readReport(value: unknown, subject: string): CorrectedReport {
  const v = record(value);
  if (v.subject !== subject || !uuid(subject) || v.provider !== "openai" || !string(v.model, 200) ||
      !date(v.completed_at) || !date(v.expires_at) || Date.parse(v.expires_at) <= Date.now() || !version(v.correction_revision) ||
      !Array.isArray(v.findings) || v.findings.length !== 5 || !Array.isArray(v.directions) || v.directions.length > 12) invalid();
  const edits = corrections(v.corrections), seen = new Set<string>();
  const findings = v.findings.map((raw: unknown) => {
    const f = record(raw);
    if (!keys.includes(f.key) || seen.has(f.key) || !["supported", "tentative", "unavailable"].includes(f.ai_certainty) ||
        !(f.ai_estimate === null || string(f.ai_estimate, 240)) ||
        ((f.ai_certainty === "unavailable") !== (f.ai_estimate === null)) || !string(f.uncertainty, 1000) ||
        f.user_correction !== (edits[f.key as keyof CorrectionValues] ?? null) ||
        f.display_value !== (f.user_correction ?? f.ai_estimate) || f.source !== (f.user_correction ? "user" : "ai")) invalid();
    seen.add(f.key);
    return { key: f.key, ai_estimate: f.ai_estimate, ai_certainty: f.ai_certainty,
      uncertainty: f.uncertainty, user_correction: f.user_correction, display_value: f.display_value, source: f.source };
  });
  const directions = v.directions.map((raw: unknown) => {
    const d = record(raw);
    if (!["id", "title", "style"].every(k => string(d[k], 160)) || !string(d.rationale, 1000) ||
        !["Hair Try-On", "Hair Color", "Makeup Match", "Glow-Up Preview", "Look Remix"].includes(d.tool)) invalid();
    return { id: d.id, title: d.title, style: d.style, rationale: d.rationale, tool: d.tool };
  });
  return { id: id(v.id), media_id: id(v.media_id), subject, provider: "openai", model: v.model,
    completed_at: v.completed_at, expires_at: v.expires_at, correction_revision: v.correction_revision,
    corrections: edits, findings, directions };
}
function readPassport(value: unknown, subject: string): AnalysisPassport {
  const v = record(value);
  if (!uuid(subject) || v.profile_id !== subject || !version(v.revision) || v.revision < 1 ||
      !["empty", "ready", "expired"].includes(v.analysis_state) || ((v.analysis_state === "ready") !== (v.analysis !== null))) invalid();
  return { id: id(v.id), profile_id: subject, revision: v.revision, analysis_state: v.analysis_state,
    analysis: v.analysis === null ? null : readReport(v.analysis, subject) };
}
function readJob(value: unknown): AnalysisJob {
  const v = record(value);
  if (!["queued", "running", "completed", "failed", "cancelled", "expired"].includes(v.state) ||
      !date(v.created_at) || !date(v.expires_at) || !(v.finished_at === null || date(v.finished_at)) ||
      !(v.error_code === null || (typeof v.error_code === "string" && /^[a-z_]{1,100}$/.test(v.error_code)))) invalid();
  return { id: id(v.id), media_id: id(v.media_id), state: v.state, created_at: v.created_at,
    expires_at: v.expires_at, finished_at: v.finished_at, error_code: v.error_code };
}
export function photoContentType(data: ArrayBuffer): "image/jpeg" | "image/png" | "image/webp" {
  const b = new Uint8Array(data);
  if (b.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)) return "image/png";
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP") return "image/webp";
  throw new Error("unsupported_photo_content");
}
export function createAnalysisOperations(request: (path: string, init?: RequestInit, signal?: AbortSignal) => Promise<unknown>, getSubject: () => string | undefined) {
  const subject = () => { const v = getSubject(); if (!uuid(v)) invalid(); return v; };
  const send = (body: unknown, method = "POST", key?: string): RequestInit => ({ method,
    headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": id(key) } : {}) }, body: JSON.stringify(body) });
  return {
    async analysisStatus(signal?: AbortSignal): Promise<Schemas["AnalysisJourneyStatus"]> {
      const v = record(await request("/v1/analysis/status", {}, signal));
      if (v.scope !== "cosmetic_analysis_and_passport" || !["CONNECTED", "DEGRADED", "NOT CONFIGURED"].includes(v.state)) invalid();
      return { state: v.state, scope: v.scope, code: typeof v.code === "string" && /^[a-z_]{1,100}$/.test(v.code) ? v.code : "analysis_unavailable" };
    },
    async analysisPermissions(signal?: AbortSignal): Promise<AnalysisPermissions> {
      const v = record(await request("/v1/analysis/permissions", {}, signal));
      for (const [name, purpose] of [["storage", "private_photo_storage"], ["analysis", "cosmetic_photo_analysis"]]) {
        const p = record(v[name]), d = record(p.policy);
        if (typeof p.granted !== "boolean" || !uuid(d.id) || d.purpose !== purpose || !string(d.version, 200) || !string(d.content, 30000)) invalid();
      }
      if (typeof v.eligible !== "boolean") invalid();
      return { eligible: v.eligible, storage: { granted: v.storage.granted, policy: { id: v.storage.policy.id, purpose: v.storage.policy.purpose, version: v.storage.policy.version, content: v.storage.policy.content } },
        analysis: { granted: v.analysis.granted, policy: { id: v.analysis.policy.id, purpose: v.analysis.policy.purpose, version: v.analysis.policy.version, content: v.analysis.policy.content } } };
    },
    async submitAnalysis(body: Schemas["JobRequest"], key: string, signal?: AbortSignal) {
      return readJob(await request("/v1/analysis/jobs", send(body, "POST", key), signal));
    },
    async analysisJobs(signal?: AbortSignal) {
      const v = await request("/v1/analysis/jobs", {}, signal); if (!Array.isArray(v) || v.length > 100) invalid(); return v.map(readJob);
    },
    async analysisJob(job: string, signal?: AbortSignal) { return readJob(await request(`/v1/analysis/jobs/${id(job)}`, {}, signal)); },
    async cancelAnalysis(job: string, signal?: AbortSignal) { return readJob(await request(`/v1/analysis/jobs/${id(job)}`, { method: "DELETE" }, signal)); },
    async analysisReport(job: string, signal?: AbortSignal) { const owner = subject(); return readReport(await request(`/v1/analysis/jobs/${id(job)}/corrected-report`, {}, signal), owner); },
    async correctAnalysis(job: string, expected_revision: number, values: CorrectionValues, key: string, signal?: AbortSignal) {
      const owner = subject(); if (!version(expected_revision)) invalid();
      return readReport(await request(`/v1/analysis/jobs/${id(job)}/corrections`, send({ expected_revision, corrections: corrections(values) }, "POST", key), signal), owner);
    },
    async analysisPassport(signal?: AbortSignal) { const owner = subject(); return readPassport(await request("/v1/me/analysis-passport", {}, signal), owner); },
    async selectAnalysis(job: string, expected_passport_revision: number, expected_correction_revision: number, signal?: AbortSignal) {
      const owner = subject(); if (!version(expected_passport_revision) || expected_passport_revision < 1 || !version(expected_correction_revision)) invalid();
      return readPassport(await request("/v1/me/analysis-passport", send({ job_id: id(job), expected_passport_revision, expected_correction_revision }, "PUT"), signal), owner);
    },
  };
}
