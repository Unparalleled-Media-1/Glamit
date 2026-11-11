import { useOptionalNativeTheme } from "./reskin/theme";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { CoreAccount } from "../../packages/auth/core";
import type { Media } from "../../packages/product/private-media";
import { PrivateMediaError } from "../../packages/product/private-media";
import { nativePrivateMedia } from "./private-media";
import design from "../../packages/product/consumer-design.json";

type LibraryState = {
  generation: number;
  rows: Media[] | null;
  status: "NOT CONFIGURED" | "DEGRADED" | "CONNECTED" | null;
  busy: boolean;
  error: string;
};
const fresh = (generation: number): LibraryState => ({ generation, rows: null, status: null, busy: false, error: "" });
const stateLabels: Record<Media["state"], string> = {
  ready: "Ready in private storage",
  pending: "Upload pending",
  deletion_pending: "Deletion pending — removal is not confirmed",
  deleted: "Deleted from private storage",
};

/** Owner-scoped server metadata only. No photo bytes, analysis or device-library access. */
export default function NativePrivatePhotos({ account, apiOrigin, onMediaChanged }: {
  account: CoreAccount | null;
  apiOrigin: string;
  onMediaChanged?: () => void;
}) {
  const theme = useOptionalNativeTheme();
  const palette = theme ? { ...design.palette, ivory: theme.colors.surface, ink: theme.colors.text, muted: theme.colors.line, white: theme.colors.onPrimary, mauve: theme.colors.primary } : design.palette;
  const s = libraryStyles(palette);
  const scope = useRef({ subject: account?.profile.id, token: account?.token, origin: apiOrigin, generation: 0 });
  if (scope.current.subject !== account?.profile.id || scope.current.token !== account?.token || scope.current.origin !== apiOrigin)
    scope.current = { subject: account?.profile.id, token: account?.token, origin: apiOrigin, generation: scope.current.generation + 1 };
  const generation = scope.current.generation;
  const [stored, setStored] = useState(() => fresh(generation));
  const state = stored.generation === generation ? stored : fresh(generation);
  const mounted = useRef(true), busy = useRef(false), sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const client = useMemo(() => {
    try { return apiOrigin ? nativePrivateMedia(apiOrigin, () => scope.current.token || null) : null; }
    catch { return null; }
  }, [apiOrigin]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current++; pending.current?.abort(); }; }, []);
  useEffect(() => {
    sequence.current++; pending.current?.abort(); busy.current = false; setStored(fresh(generation));
  }, [generation]);
  const patch = (value: Partial<LibraryState>) => setStored(v => ({ ...(v.generation === generation ? v : fresh(generation)), ...value }));
  async function run(work: (signal: AbortSignal, valid: () => boolean) => Promise<void>) {
    // Includes confirmations created before a session/origin change.
    if (!client || !account || !mounted.current || scope.current.generation !== generation || busy.current) return;
    busy.current = true;
    const ticket = ++sequence.current, controller = new AbortController();
    pending.current = controller;
    const valid = () => mounted.current && generation === scope.current.generation && ticket === sequence.current && !controller.signal.aborted;
    patch({ busy: true, error: "" });
    try { await work(controller.signal, valid); }
    catch (error) {
      if (valid()) patch({ error: error instanceof PrivateMediaError && error.code === "media_session_changed"
        ? "Your session changed. Sign in or unlock again."
        : "Private photos could not be confirmed. Refresh to check server state; no operation is automatically repeated." });
    } finally {
      if (valid()) { busy.current = false; pending.current = null; patch({ busy: false }); }
    }
  }
  const refresh = () => run(async (signal, valid) => {
    const status = await client!.status(signal);
    if (!valid()) return;
    patch({ status: status.state, rows: null });
    if (status.state !== "CONNECTED") return;
    const rows = await client!.list(signal);
    if (valid()) patch({ rows });
  });
  function confirmRemoval(row: Media) {
    if (scope.current.generation !== generation || state.busy || row.state === "deleted") return;
    Alert.alert("Delete private photo?", "This requests removal from your private server storage. It does not delete your original device photo or your account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => run(async (signal, valid) => {
        const result = await client!.remove(row.id, signal);
        if (!valid()) return;
        if (result.id !== row.id || !["deleted", "deletion_pending"].includes(result.state))
          throw new PrivateMediaError("private_media_response_invalid");
        onMediaChanged?.();
        setStored(v => v.generation === generation ? { ...v, rows: v.rows?.map(item => item.id === result.id ? result : item) || null } : v);
      }) },
    ]);
  }
  const action = (label: string, onPress: () => void, disabled = state.busy) => <Pressable key={label}
    accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, disabled && { opacity: 0.5 }]}><Text style={s.buttonText}>{label}</Text></Pressable>;
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>My private photos</Text>
    <Text style={s.body}>Manage photo records saved to your account. This does not upload a photo or run analysis.</Text>
    {!account ? <Text style={s.body}>Sign in above to access your private photos.</Text> : !client ?
      <Text style={s.body}>Private-photo service is not configured in this app.</Text> : <>
        {action("Refresh private photos", () => { void refresh(); })}
        {state.status && <Text style={s.body}>Private storage: {state.status}</Text>}
        {state.busy && <Text accessibilityLiveRegion="polite" style={s.body}>Checking private storage…</Text>}
        {state.busy && action("Stop waiting", () => {
          sequence.current++; pending.current?.abort(); pending.current = null; busy.current = false;
          patch({ busy: false, error: "Stopped waiting. Refresh to confirm server state; a submitted operation may already have completed." });
        }, false)}
        {state.error && <Text accessibilityRole="alert" style={s.body}>{state.error}</Text>}
        {state.rows?.length === 0 && <Text style={s.body}>No private photos were returned for this account.</Text>}
        {state.rows?.map(row => <View key={row.id} style={s.record}>
          <Text style={s.body}>Private photo · {row.created_at.slice(0, 10)}</Text>
          <Text style={s.body}>{stateLabels[row.state]}</Text>
          <Text style={s.fine}>Retention expiry: {row.expires_at}</Text>
          {row.state !== "deleted" && action(row.state === "deletion_pending" ? "Retry photo deletion" : "Delete private photo", () => confirmRemoval(row))}
        </View>)}
      </>}
  </View>;
}
const libraryStyles = (palette: typeof design.palette) => StyleSheet.create({
  card: { padding: design.spacing.xl, borderRadius: design.radius.sheet, backgroundColor: palette.ivory, gap: design.spacing.md },
  heading: { fontSize: design.type.heading, color: palette.ink },
  body: { fontSize: design.type.body, color: palette.ink, lineHeight: 22 },
  fine: { fontSize: 12, color: palette.ink, lineHeight: 18 },
  record: { paddingVertical: design.spacing.md, gap: design.spacing.sm, borderTopWidth: 1, borderColor: palette.muted },
  button: { minHeight: 52, padding: 14, borderRadius: design.radius.control, backgroundColor: palette.mauve, alignItems: "center", justifyContent: "center" },
  buttonText: { color: palette.white, fontWeight: "600" },
});
