import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Switch, TextInput, View } from "react-native";
import { NativeButton as Button, NativeCard as Card, NativePage as Page, NativeRow as Row, NativeText as Copy } from "../reskin/ui";
import { navigateDesign as go, backDesign as back } from "../reskin/navigation";
import { useNativeTheme } from "../reskin/theme";
import type { AnalyzeSession } from "./use-analyze-session";

export function PhotoReview({ flow }: { flow: AnalyzeSession }) {
  const photo = flow.photo;
  return <Page title="Photo check" onBack={back}>{photo ? <>
    <Image source={{ uri: photo.uri }} accessibilityLabel="Your unchanged private device photo" style={{ width: "100%", height: 380, borderRadius: 22 }} resizeMode="contain" />
    <Copy kind="section">A clear starting point.</Copy>
    <Card><Copy>Resolution: {photo.width} × {photo.height}</Copy><Copy>File size: {(photo.bytes / 1048576).toFixed(1)} MB</Copy><Copy kind="caption">Lighting, face detection and filters have not been evaluated. Technical checks are not personal analysis.</Copy></Card>
    <Button title="Use this photo" onPress={() => go("GL-024")} disabledReason={!flow.goals.length ? "Choose a supported goal in Analyze before requesting processing." : undefined} />
    <Button title="Clear / retake photo" secondary onPress={() => { if (flow.clear()) go("GL-017"); }} />
  </> : <><Copy kind="title">Choose a private photo.</Copy><Copy>Your device photo is no longer available. No new upload has started.</Copy>{flow.cleanupFailed && <><Copy>Private file cleanup could not be confirmed.</Copy><Button title="Retry clearing private files" onPress={() => flow.clear()} /></>}<Button title="Return to Capture" onPress={() => go("GL-017")} /></>}</Page>;
}

export function AnalysisConsent({ flow, focused = true }: { flow: AnalyzeSession; focused?: boolean }) {
  const { operations: op } = flow, { state: s } = op;
  const [uploadRequested, setUploadRequested] = useState(false);
  const disabled = s.busy;
  useEffect(() => {
    if (!uploadRequested || s.busy) return;
    if (s.error) setUploadRequested(false);
    else if (focused && s.job) { setUploadRequested(false); go("GL-025"); }
  }, [uploadRequested, s.busy, s.error, s.job?.id, focused]);
  if (!op.account) return <Page title="Your permission" onBack={back}><Copy kind="title">Your photo. Your choice.</Copy><Copy>Sign in to review current account eligibility and processing permissions. Your photo has not been uploaded.</Copy><Button title="Sign in" onPress={() => go("GL-004")} /></Page>;
  if (!op.client) return <Page title="Your permission" onBack={back}><Copy kind="title">Photo analysis is unavailable.</Copy><Copy>The secure analysis service has not been configured. Your photo remains on this device.</Copy><Button title="Return to Capture" onPress={() => go("GL-017")} /></Page>;
  return <Page title="Your permission" onBack={back}><Copy kind="title">Your photo. Your choice.</Copy><Copy>Cosmetic guidance only. No diagnosis or attractiveness score.</Copy>
    {s.error && <Copy>{s.error}</Copy>}{s.message && <Copy>{s.message}</Copy>}
    <Button title="Load current permissions" onPress={() => void op.reload()} disabledReason={disabled ? "Checking your account…" : undefined} />
    {s.permissions && (["storage", "analysis"] as const).map(name => {
      const policy = s.permissions![name], key = name === "storage" ? "storageCheck" : "analysisCheck";
      return <Card key={name}><Copy kind="section">{name === "storage" ? "Private photo storage" : "Cosmetic photo analysis"}</Copy><Copy>{policy.policy.content}</Copy><Copy kind="caption">Policy {policy.policy.version}</Copy>
        {policy.granted ? <Copy>Current server permission confirmed. Use withdrawal below to revoke it.</Copy> : <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Switch accessibilityLabel={`I agree to ${name}`} value={s[key]} disabled={disabled} onValueChange={value => op.patch({ [key]: value })} /><View style={{ flex: 1 }}><Copy>I agree to this purpose</Copy></View></View>}
        {!policy.granted && <Button title={`Confirm ${name} permission`} onPress={() => void op.grant(name)} disabledReason={disabled || !s[key] ? "Choose this purpose explicitly before confirming." : undefined} />}
      </Card>;
    })}
    <Button title="Check analysis availability" secondary onPress={() => void op.check()} disabledReason={disabled ? "Checking…" : undefined} /><Copy kind="caption">Service: {s.status}</Copy>
    <Copy>Private storage is currently required for a durable analysis job. Declining storage exits photo processing; an ephemeral no-storage mode is not available.</Copy>
    <Button title="Upload privately and request analysis" onPress={() => { setUploadRequested(true); void op.upload(); }} disabledReason={disabled || !flow.photo || !flow.goals.length || s.status !== "CONNECTED" || !s.permissions?.eligible || !s.permissions.storage.granted || !s.permissions.analysis.granted || s.consentUnknown ? "A current private photo, eligible account, confirmed permissions and connected service are required." : undefined} />
    <Button title="Withdraw photo and analysis permissions" secondary onPress={flow.withdraw} disabledReason={!s.permissions ? "Load current permissions first." : undefined} />
  </Page>;
}

export function AnalysisProgress({ flow, focused = true }: { flow: AnalyzeSession; focused?: boolean }) {
  const op = flow.operations, s = op.state, { colors: c } = useNativeTheme(), [paused, setPaused] = useState(false);
  const polls = useRef(0);
  useEffect(() => { polls.current = 0; setPaused(false); }, [s.job?.id]);
  useEffect(() => {
    if (!focused) return;
    if (s.report && s.job?.state === "completed") { go("GL-026"); return; }
    if (!s.job || !["queued", "running"].includes(s.job.state) || s.busy || paused || s.error || polls.current >= 20) return;
    const timer = setTimeout(() => { polls.current++; void op.openJob(s.job!); }, 3000);
    return () => clearTimeout(timer);
  }, [s.job?.id, s.job?.state, s.report?.id, s.busy, s.error, paused, focused]);
  return <Page title="Your analysis" onBack={back}><View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
    {s.busy || ["queued", "running"].includes(s.job?.state || "") ? <ActivityIndicator color={c.primary} accessibilityLabel="Waiting for server analysis status" /> : null}
    <Copy kind="kicker">{s.job?.state || "NOT CONFIRMED"}</Copy><Copy kind="title">{s.job ? "Reading your possibilities." : "No analysis is running."}</Copy><Copy>No result appears until the server confirms a completed job. Stopping a local wait does not cancel remote work.</Copy>
    {s.error && <Copy>{s.error}</Copy>}{s.message && <Copy>{s.message}</Copy>}
    {(paused || polls.current >= 20 || s.error) && <Copy>Automatic status checks are paused. Refresh when you are ready.</Copy>}
    <Button title="Refresh analysis status" onPress={() => { polls.current = 0; setPaused(false); if (s.job) void op.openJob(s.job); }} disabledReason={!s.job || s.busy ? "A confirmed server job is required." : undefined} />
    <Button title="Cancel server analysis" secondary onPress={() => void op.cancelJob()} disabledReason={!s.job || s.busy || !["queued", "running"].includes(s.job.state) ? "No cancellable job is confirmed." : undefined} />
    <Button title="Stop waiting" secondary onPress={() => { setPaused(true); op.stop(); }} />
  </View></Page>;
}

export function AnalysisResults({ flow, recommendations }: { flow: AnalyzeSession; recommendations?: React.ReactNode }) {
  const op = flow.operations, s = op.state, { colors: c } = useNativeTheme();
  const unsaved = s.report?.findings.some(f => (s.edits[f.key] || "").trim() !== (f.user_correction || ""));
  return <Page title="Your analysis" onBack={back}><Copy kind="title">Your features. Your perspective.</Copy>
    {s.report ? <><Copy kind="caption">Cosmetic observations with uncertainty; not a medical assessment.</Copy>
      {s.report.findings.map(finding => <Card key={finding.key}><Copy kind="section">{finding.key.replace('-', ' ')}</Copy><Copy>{finding.display_value || "Unavailable"}</Copy><Copy kind="caption">{finding.uncertainty} · {finding.ai_certainty}</Copy>
        <TextInput accessibilityLabel={`Correct ${finding.key}`} value={s.edits[finding.key] || ""} editable={!s.busy} onChangeText={value => op.patch({ edits: { ...s.edits, [finding.key]: value } })} maxLength={240} style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.raised, padding: 14, color: c.text, fontSize: 15 }} />
      </Card>)}
      <Button title="Save corrections" onPress={() => void op.saveCorrection()} disabledReason={s.busy || !unsaved ? "Change an observation before saving a correction." : undefined} />
      <Button title="Save analysis to Style Passport" onPress={() => void op.savePassport()} disabledReason={s.busy || unsaved ? "Save or reconcile corrections first." : undefined} />
      <Copy kind="caption">Only server-confirmed revisions are saved to your account.</Copy>
    </> : <Copy>No current verified report is available. Open an account record to continue.</Copy>}
    {s.passport && <Card><Copy kind="section">Style Passport</Copy><Copy>Server revision {s.passport.revision} · {s.passport.analysis_state}</Copy><Copy kind="caption">Only a server-confirmed selected analysis is part of this account’s Passport.</Copy></Card>}
    {s.error && <Copy>{s.error}</Copy>}{s.message && <Copy>{s.message}</Copy>}
    {recommendations}
    <Button title="Open analysis history" secondary onPress={() => go("GL-033")} />
  </Page>;
}

export function AnalysisHistory({ flow, focused = true }: { flow: AnalyzeSession; focused?: boolean }) {
  const op = flow.operations, s = op.state, [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    if (!opening || s.busy) return;
    if (s.error) setOpening(null);
    else if (focused && s.report?.id === opening) { setOpening(null); go("GL-026"); }
  }, [opening, s.report?.id, s.busy, s.error, focused]);
  return <Page title="Your analysis history" onBack={back}><Copy kind="title">A record of your choices.</Copy><Copy kind="caption">Loaded from your authenticated account, never a local substitute history.</Copy>
    {!op.account && <Button title="Sign in" onPress={() => go("GL-004")} />}
    <Button title="Reload account history" onPress={() => void op.reload()} disabledReason={!op.account || s.busy ? "A verified account session is required." : undefined} />
    {s.passport?.analysis && <Button title="Open saved Style Passport analysis" onPress={() => go("GL-026")} />}
    {s.history.map(job => <Row key={job.id} title={new Date(job.created_at).toLocaleDateString()} detail={job.state} onPress={() => { setOpening(job.id); void op.openJob(job); }} />)}
    {s.error && <Copy>{s.error}</Copy>}{s.history.length === 0 && <Copy>No account analyses have been loaded.</Copy>}
  </Page>;
}
