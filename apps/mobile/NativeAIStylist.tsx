import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { fetch as expoFetch } from "expo/fetch";
import { randomUUID } from "expo-crypto";
import { createStylistClient, StylistError } from "../../packages/product/ai-stylist";
import type { StylingAdvice, StylingPolicy, StylingSession, StylingStatus } from "../../packages/product/ai-stylist";
import type { CoreAccount } from "../../packages/auth/core";
import design from "../../packages/product/consumer-design.json";
const colors = design.palette;
type State = {
    generation: number;
    brief: string;
    consent: boolean;
    withdrawalPending: boolean;
    busy: string;
    status: StylingStatus | null;
    policy: StylingPolicy | null;
    reply: StylingAdvice | null;
    error: string;
};
const fresh = (generation: number): State => ({ generation, brief: "", consent: false, withdrawalPending: false, busy: "", status: null, policy: null, reply: null, error: "" });
const explanations: Record<string, string> = {
    openai_advisor_not_enabled: "AI styling advice is not enabled on this server.",
    openai_not_configured: "OpenAI is not configured on this server.",
    approved_styling_advice_policy_required: "The approved AI styling policy is not available yet.",
    qualified_styling_advice_eligibility_required: "A verified eligible adult account is required for this service.",
    current_styling_advice_consent_required: "Refresh and review the current AI styling policy before continuing.",
    styling_attempt_already_consumed: "That attempt was already submitted. Its response is not saved; a new explicit request may call the provider again.",
    styling_request_limit_reached: "The configured hourly request limit has been reached. Try later.",
    styling_scope_changed: "The account or consent changed. That response is unavailable.",
    styling_session_changed: "Your session changed. Sign in or unlock again before continuing.",
};
export default function NativeAIStylist({ account, apiOrigin, onLogin }: {
    account: CoreAccount | null;
    apiOrigin: string;
    onLogin: () => void;
}) {
    const current = useRef<{
        session: StylingSession | null;
        origin: string;
        generation: number;
    }>({ session: null, origin: apiOrigin, generation: 0 });
    const session = account ? { subject: account.profile.id, token: account.token } : null;
    if (session?.subject !== current.current.session?.subject || session?.token !== current.current.session?.token || apiOrigin !== current.current.origin)
        current.current = { session, origin: apiOrigin, generation: current.current.generation + 1 };
    const generation = current.current.generation;
    const [stored, setStored] = useState<State>(() => fresh(generation));
    const state = stored.generation === generation ? stored : fresh(generation);
    const busyRef = useRef(0);
    const request = useRef(0), pending = useRef<AbortController | null>(null), live = useRef(true);
    const client = useMemo(() => { try {
        return apiOrigin ? createStylistClient({ apiOrigin, getSession: () => current.current.session, fetch: expoFetch as typeof globalThis.fetch }) : null;
    }
    catch {
        return null;
    } }, [apiOrigin]);
    const valid = (g: number, ticket: number) => live.current && g === current.current.generation && ticket === request.current;
    const patch = (value: Partial<State>) => setStored(v => ({ ...v.generation === generation ? v : fresh(generation), ...value }));
    const failure = (error: unknown) => explanations[error instanceof StylistError ? error.code : ""] || "AI styling is unavailable. No response or save is confirmed.";
    useEffect(() => { live.current = true; return () => { live.current = false; request.current++; pending.current?.abort(); }; }, []);
    useEffect(() => { request.current++; pending.current?.abort(); busyRef.current = 0; setStored(fresh(generation)); }, [generation]);
    async function refresh() {
        if (!client || !current.current.session || busyRef.current || state.consent || state.withdrawalPending || generation !== current.current.generation)
            return;
        const g = generation, ticket = ++request.current, controller = new AbortController();
        pending.current = controller;
        busyRef.current = ticket;
        patch({ busy: "Checking service…", error: "", reply: null, consent: false });
        const results = await Promise.allSettled([client.status(controller.signal), client.policy(controller.signal)]);
        if (!valid(g, ticket))
            return;
        busyRef.current = 0;
        patch({ busy: "", status: results[0].status === "fulfilled" ? results[0].value : null, policy: results[1].status === "fulfilled" ? results[1].value : null, error: results.find(r => r.status === "rejected")?.status === "rejected" ? failure((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason) : "" });
    }
    async function consent(value: boolean) {
        if (!client || !state.policy || generation !== current.current.generation || (value && (busyRef.current || state.withdrawalPending)))
            return;
        pending.current?.abort();
        const g = generation, ticket = ++request.current, controller = new AbortController();
        pending.current = controller;
        busyRef.current = ticket;
        patch({ consent: false, withdrawalPending: !value, reply: null, busy: value ? "Saving consent…" : "Withdrawing consent…", error: "" });
        try {
            await client.consent(state.policy.id, value ? "granted" : "withdrawn", randomUUID(), controller.signal);
            if (valid(g, ticket)) {
                busyRef.current = 0;
                patch({ consent: value, withdrawalPending: false, busy: "" });
            }
        }
        catch (error) {
            if (valid(g, ticket)) {
                busyRef.current = 0;
                patch({ busy: "", withdrawalPending: true, error: value ? "Consent could not be confirmed. Withdraw the uncertain grant before choosing again." : "Consent withdrawal was not confirmed. Retry withdrawing it; the response stays hidden." });
            }
        }
    }
    async function ask() {
        if (!client || !state.policy || !state.consent || busyRef.current || !state.brief.trim() || generation !== current.current.generation)
            return;
        const g = generation, ticket = ++request.current, controller = new AbortController();
        pending.current = controller;
        busyRef.current = ticket;
        patch({ busy: "Asking your AI stylist…", error: "", reply: null });
        try {
            const reply = await client.ask([state.brief.trim()], state.policy.id, randomUUID(), controller.signal);
            if (valid(g, ticket)) {
                busyRef.current = 0;
                patch({ reply, busy: "" });
            }
        }
        catch (error) {
            if (valid(g, ticket)) {
                busyRef.current = 0;
                patch({ busy: "", error: failure(error) });
            }
        }
    }
    const button = (title: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={action} style={[s.button, disabled && { opacity: .5 }]}><Text style={s.buttonText}>{title}</Text></Pressable>;
    return <View style={s.card}>
    <Text style={s.title} accessibilityRole="header">Your AI styling companion</Text>
    <Text style={s.body}>Send a text brief only when you choose. Replies stay in this session; photos are not sent here.</Text>
    {!account ? <>{button("Sign in to ask your stylist", onLogin)}</> : !client ? <Text style={s.body}>The secure API connection is not configured. You can continue exploring GLAM Beauty.</Text> : <>
      {button("Check AI service", () => void refresh(), !!state.busy || state.consent || state.withdrawalPending)}
      {state.status && <Text style={s.body}>Last authenticated OpenAI API check: {state.status.state}{!state.status.advice_enabled ? " · advice is not enabled" : ""}</Text>}
      <TextInput accessibilityLabel="AI styling brief" multiline maxLength={2000} value={state.brief} onChangeText={brief => { if (state.busy === "Asking your AI stylist…") {
            request.current++;
            pending.current?.abort();
            busyRef.current = 0;
            patch({ brief, reply: null, busy: "" });
        }
        else
            patch({ brief, reply: null }); }} placeholder="Describe your occasion, preferences and what you already own…" style={s.input}/>
      {state.policy && <><Text style={s.body}>{state.policy.content}</Text><View style={s.row}><Switch accessibilityLabel="Allow this text brief to be processed by OpenAI" value={state.consent} disabled={(!!state.busy && !state.consent) || state.withdrawalPending} onValueChange={value => void consent(value)}/><Text style={[s.body, { flex: 1 }]}>I agree to send this styling brief under the displayed policy.</Text></View></>}
      {button(state.busy || "Ask my AI stylist", () => void ask(), !!state.busy || !state.consent || !state.brief.trim() || state.status?.state !== "CONNECTED" || !state.status.advice_enabled || !state.status.model_configured)}
      {state.withdrawalPending && !state.busy && button("Retry withdrawing AI consent", () => void consent(false))}
      {state.busy === "Asking your AI stylist…" && button("Stop waiting", () => { request.current++; pending.current?.abort(); busyRef.current = 0; patch({ busy: "", reply: null, error: "Stopped waiting locally. The provider may already have processed the request." }); })}
      {state.busy && <Text style={s.body} accessibilityLiveRegion="polite">{state.busy}</Text>}
      {!!state.error && <Text style={s.error} accessibilityRole="alert">{state.error}</Text>}
      {state.reply && <View accessibilityLiveRegion="polite"><Text style={s.body}>{state.reply.advice.message}</Text><Text style={s.body}>{state.reply.advice.uncertainty}</Text>{state.reply.advice.directions.map(d => <View key={d.id}><Text style={s.title}>{d.title}</Text><Text style={s.body}>{d.rationale}</Text></View>)}<Text style={s.fine}>AI styling concepts · not verified product, price, forecast or booking information.</Text></View>}
      <Text style={s.fine}>A stopped or interrupted request may already have reached the provider. Requests are not automatically repeated.</Text>
    </>}
  </View>;
}
const s = StyleSheet.create({ card: { padding: design.spacing.xl, backgroundColor: colors.ivory, borderRadius: design.radius.sheet, gap: design.spacing.md }, title: { fontSize: design.type.heading, color: colors.ink }, body: { fontSize: design.type.body, color: colors.ink, lineHeight: 22 }, fine: { fontSize: 12, color: colors.ink, lineHeight: 18 }, input: { minHeight: 110, padding: 14, borderWidth: 1, borderColor: colors.muted, borderRadius: design.radius.card, backgroundColor: colors.white, color: colors.ink }, button: { minHeight: 52, borderRadius: design.radius.control, backgroundColor: colors.mauve, padding: 14, alignItems: "center", justifyContent: "center" }, buttonText: { color: colors.white, fontWeight: "600" }, row: { flexDirection: "row", alignItems: "center", gap: 12 }, error: { color: colors.ink, fontSize: 14 } });
