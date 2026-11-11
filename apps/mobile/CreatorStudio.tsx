import { useOptionalNativeTheme } from "./reskin/theme";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import design from "../../packages/product/consumer-design.json";
import { socialProviders } from "../../packages/product/creator";
import type { CreatorProvider } from "../../packages/product/creator";
import { useCreator } from "../../packages/product/use-creator";
import { nativePublicKey } from "./auth/use-native-account";
export default function CreatorStudio({ token }: { token?: string }) {
  const theme = useOptionalNativeTheme();
  const colors = theme ? { ...design.palette, ivory: theme.colors.surface, ink: theme.colors.text, muted: theme.colors.line, white: theme.colors.raised, mauve: theme.colors.accent, blush: theme.colors.raised } : design.palette;
  const s = creatorStyles(colors);
  const { data, busy, message, act } = useCreator(nativePublicKey, token);
  const [editing, setEditing] = useState(false), [handle, setHandle] = useState(""), [name, setName] = useState(""), [bio, setBio] = useState("");
  const [provider, setProvider] = useState<CreatorProvider>("tiktok"), [url, setUrl] = useState("");
  const [title, setTitle] = useState(""), [mediaUrl, setMediaUrl] = useState(""), [rights, setRights] = useState(false);
  const [collection, setCollection] = useState(""), [collectionRights, setCollectionRights] = useState(false);
  const input = (label: string, value: string, change: (v: string) => void, max: number) => <View><Text style={s.text}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} maxLength={max} autoCapitalize="none" style={s.input} /></View>;
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: busy || disabled }} disabled={busy || disabled} style={[s.button, (busy || disabled) && { opacity: .5 }]} onPress={action}><Text style={s.buttonText}>{label}</Text></Pressable>;
  return <View style={s.card}>
    <Text style={s.heading} accessibilityRole="header">Creator Studio</Text>
    <Text style={s.text}>Your GLAM Beauty stories, in one private space.</Text>
    <Text style={s.text}>Manual links are unverified. Social import, publication, campaigns, attribution and payouts are unavailable. This is separate from social sign-in.</Text>
    {!token ? <Text style={s.text}>Sign in above to open your private studio.</Text> : <>
      {busy && <Text style={s.text} accessibilityLiveRegion="polite">Loading or saving…</Text>}
      {!!message && <Text style={s.text} accessibilityLiveRegion="polite">{message}</Text>}
      {data.profile && !editing ? <><Text style={s.heading}>{data.profile.display_name}</Text><Text style={s.text}>@{data.profile.handle} · Private draft</Text><Text style={s.text}>{data.profile.bio}</Text>{button("Edit creator profile", () => { setHandle(data.profile!.handle); setName(data.profile!.display_name); setBio(data.profile!.bio); setEditing(true); })}</> : <>
        {input("Creator handle", handle, setHandle, 40)}{input("Creator display name", name, setName, 160)}{input("Creator bio", bio, setBio, 4000)}
        {button("Save private creator profile", () => void act(data.profile ? "PATCH" : "POST", "/profile", { handle, display_name: name, bio, ...(data.profile ? { expected_revision: data.profile.revision } : {}) }).then(saved => { if (saved) setEditing(false); }), !name.trim() || !/^[a-z0-9][a-z0-9_-]{2,39}$/.test(handle))}
        <Text style={s.text}>Changes require an explicitly verified adult account. No business permissions are granted.</Text>
      </>}
      {data.profile && <>
        <Text style={s.heading} accessibilityRole="header">Social profiles</Text>
        <View>{socialProviders.map(p => <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: provider === p }} style={[s.button, provider === p && { backgroundColor: colors.blush }]} onPress={() => setProvider(p)}><Text style={s.text}>{p}</Text></Pressable>)}</View>
        {input("Public social profile URL", url, setUrl, 2048)}
        {button("Save unverified profile link", () => void act("POST", "/connections", { provider, profile_url: url }).then(saved => { if (saved) setUrl(""); }), !url.trim())}
        {data.connections.filter(c => c.status !== "revoked").map(c => <View key={c.id}><Text style={s.text}>{c.provider} · {c.status === "manual_unverified" ? "Manual · unverified" : c.status}</Text><Text style={s.text}>{c.profile_url}</Text>{button("Remove " + c.provider + " link", () => void act("DELETE", "/connections/" + c.id))}</View>)}
        <Text style={s.heading} accessibilityRole="header">Portfolio drafts</Text>
        {input("Content title", title, setTitle, 240)}{input("Public content URL", mediaUrl, setMediaUrl, 2048)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rights }} onPress={() => setRights(!rights)} style={s.button}><Text style={s.text}>{rights ? "✓ " : "○ "}I own this content or have permission to use it.</Text></Pressable>
        {button("Save portfolio draft", () => void act("POST", "/media", { provider, source_url: mediaUrl, title, rights_confirmed: rights }).then(saved => { if (saved) { setTitle(""); setMediaUrl(""); setRights(false); } }), !rights || !title || !mediaUrl)}
        {data.media.map(m => <View key={m.id}><Text style={s.text}>{m.title} · Private draft · Creator submitted</Text>{button("Delete " + m.title, () => void act("DELETE", "/media/" + m.id))}</View>)}
        <Text style={s.heading} accessibilityRole="header">Collection drafts</Text>
        {input("Collection title", collection, setCollection, 240)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: collectionRights }} onPress={() => setCollectionRights(!collectionRights)} style={s.button}><Text style={s.text}>{collectionRights ? "✓ " : "○ "}I have the rights to this collection.</Text></Pressable>
        {button("Save private collection draft", () => void act("POST", "/collections", { title: collection, sponsored: false, disclosure: "", rights_confirmed: collectionRights, product_ids: [] }).then(saved => { if (saved) { setCollection(""); setCollectionRights(false); } }), !collection || !collectionRights)}
        <Text style={s.text}>Shoppable product selection and sponsored collection editing require the qualified marketplace flow. No public collection is created.</Text>
        {data.collections.map(c => <View key={c.id}><Text style={s.text}>{c.title} · Private draft{c.sponsored ? " · Sponsored: " + c.disclosure : ""}</Text>{button("Delete " + c.title, () => void act("DELETE", "/collections/" + c.id))}</View>)}
        <Text style={s.heading} accessibilityRole="header">Earnings</Text><Text style={s.text}>No verified earnings data is connected. No balance or payout is available. Creator rates need an explicit agreement; the platform’s 10% marketplace item commission remains separate.</Text>
      </>}
    </>}
  </View>;
}
const creatorStyles = (colors: typeof design.palette) => StyleSheet.create({
  card: { padding: design.spacing.xl, backgroundColor: colors.ivory, borderRadius: design.radius.sheet, gap: design.spacing.md, marginVertical: design.spacing.lg },
  heading: { fontSize: design.type.heading, color: colors.ink }, text: { fontSize: design.type.body, color: colors.ink, lineHeight: 22 },
  input: { minHeight: 48, padding: 14, borderWidth: 1, borderColor: colors.muted, borderRadius: design.radius.card, backgroundColor: colors.white, color: colors.ink },
  button: { minHeight: 52, borderWidth: 1, borderColor: colors.mauve, borderRadius: design.radius.control, padding: 14, marginVertical: 4, alignItems: "center" },
  buttonText: { color: colors.mauve, fontWeight: "600" },
});
