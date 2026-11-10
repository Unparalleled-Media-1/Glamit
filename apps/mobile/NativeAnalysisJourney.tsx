import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as Crypto from "expo-crypto";
import type { CoreAccount } from "../../packages/auth/core";
import type { AnalysisJob, AnalysisPassport, AnalysisPermissions, CorrectedReport, CorrectionValues, AnalysisGoal } from "../../packages/product/analysis";
import { photoContentType } from "../../packages/product/analysis";
import { PrivateMediaError } from "../../packages/product/private-media";
import { nativePrivateMedia } from "./private-media";
import design from "../../packages/product/consumer-design.json";

type State = { generation: number; busy: boolean; message: string; error: string;
  permissions: AnalysisPermissions | null; job: AnalysisJob | null; report: CorrectedReport | null;
  passport: AnalysisPassport | null; history: AnalysisJob[]; edits: Record<string, string>;
  status: string; storageCheck: boolean; analysisCheck: boolean; consentUnknown: boolean };
const fresh = (generation: number): State => ({ generation, busy: false, message: "", error: "", permissions: null,
  job: null, report: null, passport: null, history: [], edits: {}, status: "Not checked", storageCheck: false, analysisCheck: false, consentUnknown: false });
const labels = { "face-shape": "Face shape", eyes: "Eyes", brows: "Brows", lips: "Lips", undertone: "Undertone" };

/** Genuine RN controls; results only come from owner-authorized durable API records. */
export default function NativeAnalysisJourney({ account, apiOrigin, photoUri, readPhoto, goals, onLogin, privacyRevision = 0 }: {
  account: CoreAccount | null; apiOrigin: string; photoUri?: string;
  readPhoto?: () => Promise<ArrayBuffer>; goals: AnalysisGoal[]; onLogin?: () => void; privacyRevision?: number;
}) {
  const scope = useRef({ token: account?.token, subject: account?.profile.id, apiOrigin, photoUri, privacyRevision, generation: 0 });
  if (scope.current.token !== account?.token || scope.current.subject !== account?.profile.id || scope.current.apiOrigin !== apiOrigin ||
      scope.current.photoUri !== photoUri || scope.current.privacyRevision !== privacyRevision)
    scope.current = { token: account?.token, subject: account?.profile.id, apiOrigin, photoUri, privacyRevision, generation: scope.current.generation + 1 };
  const generation = scope.current.generation;
  const [stored, setStored] = useState(() => fresh(generation));
  const state = stored.generation === generation ? stored : fresh(generation);
  const mounted = useRef(true), sequence = useRef(0), active = useRef<AbortController | null>(null), busy = useRef(false);
  const client = useMemo(() => { try { return nativePrivateMedia(apiOrigin, () => scope.current.token || null, () => scope.current.subject); } catch { return null; } }, [apiOrigin]);
  const patch = (value: Partial<State>) => setStored(v => ({ ...(v.generation === generation ? v : fresh(generation)), ...value }));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current++; active.current?.abort(); }; }, []);
  useEffect(() => { sequence.current++; active.current?.abort(); active.current = null; busy.current = false; setStored(fresh(generation)); }, [generation]);
  useEffect(() => {
    const expiry = Math.min(...[state.report?.expires_at, state.passport?.analysis?.expires_at].filter(Boolean).map(v => Date.parse(v!)));
    if (!Number.isFinite(expiry)) return;
    const timer = setTimeout(() => {
      sequence.current++; active.current?.abort(); busy.current = false;
      patch({ busy: false, report: null, passport: null, edits: {}, error: "This report has expired. Reload to confirm server state." });
    }, Math.max(0, Math.min(expiry - Date.now(), 2147483647)));
    return () => clearTimeout(timer);
  }, [state.report?.expires_at, state.passport?.analysis?.expires_at, generation]);
  function stop() {
    sequence.current++; active.current?.abort(); active.current = null; busy.current = false;
    patch({ busy: false, report: null, passport: null, edits: {}, message: "Stopped waiting. Reload to confirm server state; remote actions may already have completed." });
  }
  async function run(work: (signal: AbortSignal, valid: () => boolean) => Promise<void>, preempt = false) {
    if (!client || !account || !mounted.current || scope.current.generation !== generation || (busy.current && !preempt)) return;
    active.current?.abort(); const controller = new AbortController(), ticket = ++sequence.current;
    active.current = controller; busy.current = true; patch({ busy: true, error: "", message: "" });
    const valid = () => mounted.current && scope.current.generation === generation && sequence.current === ticket && !controller.signal.aborted;
    try { await work(controller.signal, valid); }
    catch (error) {
      if (valid()) patch({ report: null, passport: null, edits: {}, error: error instanceof PrivateMediaError && ["analysis_correction_revision_conflict", "style_passport_revision_conflict"].includes(error.code)
        ? "The saved version changed. Reload before editing or saving again."
        : "The operation could not be confirmed. Reload server state before trying again. Nothing is automatically retried." });
    } finally { if (valid()) { busy.current = false; active.current = null; patch({ busy: false }); } }
  }
  const reportPatch = (report: CorrectedReport) => ({ report, edits: Object.fromEntries(report.findings.map(f => [f.key, f.user_correction || ""])) });
  const reload = () => run(async (signal, valid) => {
    const permissions = await client!.analysisPermissions(signal); if (!valid()) return;
    patch({ permissions, consentUnknown: false });
    const passport = await client!.analysisPassport(signal); if (!valid()) return;
    patch({ passport, ...(passport.analysis ? reportPatch(passport.analysis) : { report: null, edits: {} }) });
    const history = await client!.analysisJobs(signal); if (valid()) patch({ history, message: "Saved records loaded from your account." });
  });
  const check = () => run(async (signal, valid) => {
    const result = await client!.analysisStatus(signal); if (valid()) patch({ status: result.state });
  });
  const grant = (name: "storage" | "analysis") => run(async (signal, valid) => {
    // Read current epochs first. A returning user must not accidentally regrant and expire old media.
    const p = await client!.analysisPermissions(signal); if (!valid()) return;
    patch({ permissions: p });
    if (!p[name].granted) {
      patch({ consentUnknown: true });
      await client!.consent(p[name].policy.id, "granted", Crypto.randomUUID(), signal);
      if (!valid()) return;
    }
    const permissions = await client!.analysisPermissions(signal); if (valid()) patch({ permissions, consentUnknown: false, message: "Permission confirmed by the server." });
  });
  const withdraw = () => {
    // Clear private UI immediately, but claim withdrawal only after both server acknowledgments.
    patch({ report: null, passport: null, edits: {}, job: null, history: [], storageCheck: false, analysisCheck: false, consentUnknown: true });
    return run(async (signal, valid) => {
      const p = state.permissions || await client!.analysisPermissions(signal); if (!valid()) return;
      patch({ permissions: p, consentUnknown: true });
      for (const name of ["analysis", "storage"] as const) {
        await client!.consent(p[name].policy.id, "withdrawn", Crypto.randomUUID(), signal); if (!valid()) return;
      }
      const permissions = await client!.analysisPermissions(signal);
      if (valid()) patch({ permissions, consentUnknown: false, message: "Storage and analysis permissions withdrawn. Private records are inaccessible; physical deletion is processed separately." });
    }, true);
  };
  const upload = () => run(async (signal, valid) => {
    if (!readPhoto || !photoUri || !goals.length) throw Error("photo_and_goals_required");
    const p = await client!.analysisPermissions(signal); if (!valid()) return;
    patch({ permissions: p });
    if (!p.eligible || !p.storage.granted || !p.analysis.granted) throw Error("permissions_required");
    const status = await client!.analysisStatus(signal); if (!valid()) return;
    patch({ status: status.state });
    if (status.state !== "CONNECTED") throw Error("analysis_unavailable");
    patch({ message: "Reading your selected device copy…" });
    const data = await readPhoto(); if (!valid()) return;
    patch({ message: "Uploading to your private storage…" });
    const media = await client!.uploadPhoto({ data, contentType: photoContentType(data), policyId: p.storage.policy.id }, Crypto.randomUUID(), signal);
    if (!valid()) return;
    if (media.state !== "ready") throw Error("upload_not_ready");
    patch({ message: "Photo stored privately. Requesting analysis…" });
    const job = await client!.submitAnalysis({ media_id: media.id, policy_id: p.analysis.policy.id, consent: true, goals }, Crypto.randomUUID(), signal);
    if (valid()) patch({ job, message: "Analysis queued. Refresh its status; no result is available until the server finishes." });
  });
  const openJob = (job: AnalysisJob) => run(async (signal, valid) => {
    const current = await client!.analysisJob(job.id, signal); if (!valid()) return;
    patch({ job: current, report: null, edits: {}, message: `Analysis status: ${current.state}.` });
    if (current.state === "completed") { const report = await client!.analysisReport(current.id, signal); if (valid()) patch(reportPatch(report)); }
  });
  const saveCorrection = () => run(async (signal, valid) => {
    if (!state.report) return;
    const values: CorrectionValues = {};
    for (const f of state.report.findings) if (state.edits[f.key]?.trim()) values[f.key] = state.edits[f.key].trim();
    const report = await client!.correctAnalysis(state.report.id, state.report.correction_revision, values, Crypto.randomUUID(), signal);
    if (valid()) patch({ ...reportPatch(report), message: "Your correction revision is saved. Save to Style Passport to approve this version there." });
  });
  const savePassport = () => run(async (signal, valid) => {
    if (!state.report) return;
    const current = await client!.analysisPassport(signal); if (!valid()) return;
    const passport = await client!.selectAnalysis(state.report.id, current.revision, state.report.correction_revision, signal);
    if (valid()) patch({ passport, message: `Style Passport saved. Server revision ${passport.revision}.` });
  });
  const button = (title: string, onPress: () => unknown, disabled = false, secondary = false) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && { opacity: 0.55 }]}><Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text></Pressable>;
  if (!account) return <View style={s.card}><Text style={s.title}>Your private Style Passport</Text><Text style={s.text}>Sign in to upload, receive analysis and reopen saved results.</Text>{onLogin && button("Sign in for private analysis", onLogin)}</View>;
  if (!client) return <View style={s.card}><Text style={s.title}>Private analysis is not configured</Text><Text style={s.text}>The secure API address is unavailable. No upload or analysis has been performed.</Text></View>;
  const locked = state.busy;
  const unsaved = state.report?.findings.some(f => (state.edits[f.key] || "").trim() !== (f.user_correction || ""));
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.title}>Your analysis & Style Passport</Text>
    <Text style={s.text}>Cosmetic guidance, with uncertainty. No medical diagnosis or attractiveness scoring.</Text>
    {button("Reload saved analysis and passport", reload, locked)}
    {button("Check analysis service", check, locked, true)}
    <Text style={s.text}>Service: {state.status}</Text>
    {state.permissions && <>
      <Text style={s.text}>{state.permissions.eligible ? "Account eligibility confirmed." : "Account eligibility is required before upload."}</Text>
      {(["storage", "analysis"] as const).map(name => <View key={name} style={s.policy}>
        <Text style={s.subtitle}>{name === "storage" ? "Private photo storage" : "Cosmetic photo analysis"}</Text>
        <Text selectable style={s.text}>{state.permissions![name].policy.content}</Text>
        <Text style={s.text}>Policy version: {state.permissions![name].policy.version}</Text>
        {state.permissions![name].granted ? <Text style={s.text}>Permission confirmed</Text> : <>
          <Switch accessibilityLabel={`I agree to ${name}`} value={name === "storage" ? state.storageCheck : state.analysisCheck} disabled={locked}
            onValueChange={value => patch(name === "storage" ? { storageCheck: value } : { analysisCheck: value })}/>
          {button(`Confirm ${name} permission`, () => grant(name), locked || !(name === "storage" ? state.storageCheck : state.analysisCheck))}
        </>}
      </View>)}
    </>}
    {state.consentUnknown && <Text accessibilityRole="alert" style={s.text}>Permission changes may have reached the server. Reload to confirm, or retry withdrawal.</Text>}
    {button("Withdraw photo and analysis permissions", withdraw, false, true)}
    {!!photoUri && button("Upload privately and request analysis", upload, locked || state.consentUnknown || !state.permissions?.eligible || !state.permissions.storage.granted || !state.permissions.analysis.granted || !goals.length)}
    {!photoUri && <Text style={s.text}>Choose a photo in Analyze to request a new report.</Text>}
    {state.job && <View><Text style={s.text}>Job: {state.job.state}</Text>{button("Refresh analysis status", () => openJob(state.job!), locked)}
      {button("Cancel and remove analysis report", () => run(async (signal, valid) => {
        const job = await client!.cancelAnalysis(state.job!.id, signal);
        if (valid()) patch({ job, report: null, passport: null, edits: {}, message: "Analysis cancelled; report removed. Delete the stored photo separately in Private photos." });
      }), locked, true)}</View>}
    {state.report && <View><Text style={s.subtitle}>Your saved observations</Text><Text style={s.text}>Correction revision {state.report.correction_revision}. User corrections do not increase AI certainty. Leave a correction blank to restore the AI estimate.</Text>
      {state.report.findings.map(f => <View key={f.key} style={s.policy}>
        <Text style={s.subtitle}>{labels[f.key]}</Text><Text style={s.text}>{f.display_value || "No supported estimate"} · {f.source === "user" ? "Your correction" : "AI estimate"}</Text>
        <Text style={s.text}>AI certainty: {f.ai_certainty}. {f.uncertainty}</Text>
        <TextInput accessibilityLabel={`Correct ${labels[f.key]}`} value={state.edits[f.key] || ""} maxLength={240} editable={!locked}
          onChangeText={value => patch({ edits: { ...state.edits, [f.key]: value } })} style={s.input}/>
      </View>)}
      {button("Save corrections", saveCorrection, locked)}{button("Save analysis to Style Passport", savePassport, locked || !!unsaved)}
    </View>}
    {state.passport && <Text style={s.text}>Style Passport: {state.passport.analysis_state} · revision {state.passport.revision}</Text>}
    {state.history.length > 0 && <View><Text style={s.subtitle}>Analysis history</Text>{state.history.map(job => button(`Open analysis ${job.created_at} · ${job.state}`, () => openJob(job), locked, true))}</View>}
    {!!state.message && <Text accessibilityLiveRegion="polite" style={s.text}>{state.message}</Text>}
    {!!state.error && <Text accessibilityRole="alert" style={s.text}>{state.error}</Text>}
    {state.busy && button("Stop waiting for analysis", stop, false, true)}
  </View>;
}
const c = design.palette;
const s = StyleSheet.create({ card: { backgroundColor: c.ivory, padding: 20, borderRadius: 24, gap: 12 },
  title: { fontSize: 24, color: c.ink }, subtitle: { fontSize: 18, color: c.ink }, text: { fontSize: 15, lineHeight: 23, color: c.ink },
  policy: { gap: 8, paddingVertical: 12 }, input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: c.mauve, borderRadius: 12, color: c.ink },
  button: { minHeight: 48, padding: 14, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: c.mauve },
  buttonText: { color: c.ivory, fontSize: 15, fontWeight: "600", textAlign: "center" }, secondary: { backgroundColor: c.ivory, borderWidth: 1, borderColor: c.mauve }, secondaryText: { color: c.ink } });
