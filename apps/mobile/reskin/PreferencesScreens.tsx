import type { Dispatch, SetStateAction } from "react";
import { Switch, TextInput, View } from "react-native";
import { randomUUID } from "expo-crypto";
import type { Journey } from "../../../packages/product/journey";
import { lookParts, saveLook } from "../../../packages/product/journey";
import { NativeButton as Button, NativeCard as Card, NativePage as Page, NativeRow as Row, NativeText as Copy } from "./ui";
import { navigateDesign as go, backDesign as back } from "./navigation";
import { useNativeTheme } from "./theme";

export type JourneyProps = { journey: Journey; setJourney: Dispatch<SetStateAction<Journey>> };
export function NativePreferences({ journey: d, setJourney, id }: JourneyProps & { id: string }) {
  const { colors: c } = useNativeTheme();
  const field = (label: string, key: "name" | "preferences" | "country" | "city", max: number) => <View style={{ gap: 8 }}><Copy kind="caption">{label}</Copy><TextInput accessibilityLabel={label} value={d[key]} onChangeText={value => setJourney(s => ({ ...s, [key]: value }))} maxLength={max} multiline={key === "preferences"} style={{ minHeight: 54, padding: 16, color: c.text, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, fontSize: 15 }} /></View>;
  return <Page title={id === "GL-011" ? "Your details" : "Beauty preferences"} onBack={back}><Copy kind="title">Make it your own.</Copy><Copy>Only what you choose to share. These styling preferences do not change your account identity or eligibility.</Copy>
    {field("Preferred name", "name", 160)}{field("Beauty and style preferences", "preferences", 1000)}{field("Country", "country", 100)}{field("City", "city", 100)}
    <Card><View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><View style={{ flex: 1 }}><Copy>Remember my styling preferences</Copy></View><Switch accessibilityLabel="Remember my styling preferences" value={d.remember} onValueChange={value => setJourney(s => ({ ...s, remember: value }))} /></View><Copy kind="caption">Opt in to this device’s existing metadata storage. Photos, conversations, tokens and private reports are excluded.</Copy></Card>
    <Button title="Continue" onPress={() => { setJourney(s => ({ ...s, onboarded: true })); go("home"); }} /><Button title="Account details and security" secondary onPress={() => go("GL-004")} />
  </Page>;
}

export function NativeSavedLooks({ journey: d, setJourney }: JourneyProps) {
  return <Page title="Saved looks" onBack={back}><Copy kind="title">Your ideas, kept close.</Copy><Copy>These are your written style briefs. No generated photo or AI result is implied.</Copy>
    {d.saved.map(look => <Card key={look.id}><Copy kind="section">{look.title}</Copy>{lookParts.map(part => look.parts[part] ? <Copy key={part}>{part}: {look.parts[part]}</Copy> : null)}<Button title={`Open ${look.title}`} onPress={() => { setJourney(s => ({ ...s, look: { ...look, id: "current" } })); go("FB-03"); }} /><Button title={`Delete ${look.title}`} secondary onPress={() => setJourney(s => ({ ...s, saved: s.saved.filter(item => item.id !== look.id) }))} /></Card>)}
    {!d.saved.length && <Card><Copy>No saved style briefs yet.</Copy><Row title="Create a look" onPress={() => go("FB-03")} /></Card>}
    <Button title="Save current written style brief" onPress={() => setJourney(s => saveLook(s, randomUUID()))} disabledReason={!lookParts.some(part => d.look.parts[part]) ? "Choose a look direction before saving." : undefined} />
  </Page>;
}

export function NativeHelp() {
  return <Page title="Help & support" onBack={back}><Copy kind="title">Here for your choices.</Copy><Card><Copy kind="section">Your photos</Copy><Copy>Capture creates an app-owned private device copy. Processing requires a separate action and confirmed account permissions. Clearing a device copy does not remove an existing server record.</Copy><Row title="Manage privacy and stored photos" onPress={() => go("GL-130")} /></Card><Card><Copy kind="section">Your account</Copy><Copy>Use the existing sign-in and recovery controls. No support inbox or ticket delivery service is configured in this build.</Copy><Row title="Sign in or recover access" onPress={() => go("GL-004")} /></Card><Row title="Your analysis history" onPress={() => go("GL-121")} /></Page>;
}
