import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useNativeInsets } from "./ui";
import type { CoreAccount } from "../../../packages/auth/core";
import { NativeButton as Button, NativeCard as Card, NativePage as Page, NativeRow as Row, NativeText as Copy, EditorialPhoto } from "./ui";
import { navigateDesign as go, backDesign as back } from "./navigation";
import { useNativeTheme } from "./theme";
import registry from "./registry.json";

export function NativeHome({ account }: { account: CoreAccount | null }) {
  const { colors: c } = useNativeTheme(), insets = useNativeInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 24 }}>
    <View style={{ position: "relative" }}><EditorialPhoto height={560} />
      <View style={{ position: "absolute", top: insets.top + 14, right: 22, flexDirection: "row", gap: 8 }}><Button title={account ? "Credits" : "Sign in"} secondary onPress={() => go(account ? "GL-126" : "GL-004")} /><Button title="Notifications" glass onPress={() => go("GL-197")} /></View>
      <View style={{ position: "absolute", bottom: 26, left: 22, right: 22, gap: 14 }}><Copy kind="kicker" onPhoto>YOUR DAILY DOSE OF YOU</Copy><Copy kind="hero" onPhoto>Your next look{"\n"}starts here.</Copy>
        <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Button title="◎ Analyze my face" onPress={() => go("GL-017")} /></View><View style={{ flex: 1 }}><Button title="✧ Try a look" glass onPress={() => go("GL-035")} /></View></View>
      </View>
    </View>
    <View style={{ padding: 22, gap: 18 }}><Copy kind="section">A look that feels like you.</Copy><Copy kind="caption">Explore editorial inspiration. These examples are not your personal results.</Copy>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{["Soft bronze", "Rose after hours", "Everyday natural", "Clean & considered"].map((title, panel) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={title} onPress={() => go("GL-035")} style={{ width: 150, gap: 8 }}><View style={{ borderRadius: 20, overflow: "hidden" }}><EditorialPhoto panel={panel} height={200} label={false} /></View><Copy>{title}</Copy><Copy kind="caption">Editorial · Explore</Copy></Pressable>)}</ScrollView>
      <Card><Row glyph="◎" title="Start your first analysis" detail="Private photo, your choice" onPress={() => go("GL-017")} /></Card>
      <Card><Copy kind="kicker">AN OCCASION COMING UP?</Copy><Copy kind="section">Let’s style the moment.</Copy><Button title="Find an occasion" secondary onPress={() => go("GL-056")} /></Card>
      <Button title="Ask your AI Advisor" secondary onPress={() => go("GL-054")} />
    </View>
  </ScrollView>;
}

export function NativeProfile({ account }: { account: CoreAccount | null }) {
  const { name, setTheme } = useNativeTheme();
  return <Page title="Profile"><View style={{ alignItems: "center", gap: 12, paddingVertical: 14 }}><Image source={require("../assets/brand/app-icon.png")} accessibilityLabel="GLAM Beauty" style={{ width: 72, height: 72, borderRadius: 36 }} />
    <Copy kind="section">{account?.profile.display_name || "Your space."}</Copy><Copy kind="caption">Your style, your choices.</Copy>
    <Button title={account ? "Manage your account" : "Sign in or create an account"} onPress={() => go("GL-004")} /></View>
    <Card>{[["Style Passport", "GL-121", "◎"], ["Saved looks", "GL-120", "♡"], ["Beauty library", "GL-122", "✧"], ["Preferences", "GL-119", "☷"], ["Plans & subscription", "GL-124", "◈"], ["Credits", "GL-126", "✧"], ["Notifications", "GL-129", "♢"], ["Security & privacy", "GL-130", "◇"]].map(([title, id, glyph]) => <Row key={id} title={title} glyph={glyph} onPress={() => go(id)} />)}</Card>
    <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Copy>Light appearance</Copy><Switch accessibilityLabel="Light appearance" value={name === "light"} onValueChange={value => setTheme(value ? "light" : "dark")} /></View></Card>
    <Row title="Creator Studio" detail="Your private profile and portfolio drafts" glyph="✧" onPress={() => go("GL-131")} />
    <Row title="Switch workspace" detail="Only your verified organizations and permissions" glyph="⇄" onPress={() => go("GL-202")} /><Row title="Help & support" glyph="?" onPress={() => go("GL-199")} />
  </Page>;
}

export function NativeDiscover() {
  const { colors: c } = useNativeTheme(), insets = useNativeInsets();
  return <View style={{ flex: 1, backgroundColor: c.background, overflow: "hidden" }}><EditorialPhoto panel={1} height={800} />
    <View style={{ position: "absolute", top: insets.top + 12, left: 22, right: 22, gap: 12 }}><Button title="⌕ Search looks, creators…" secondary onPress={() => go("GL-070")} /><ScrollView horizontal contentContainerStyle={{ gap: 10 }}>{[["For you", "GL-069"], ["Trending", "GL-072"], ["Following", "GL-075"], ["Tutorials", "GL-080"]].map(([label, id]) => <Button key={id} title={label} secondary onPress={() => go(id)} />)}</ScrollView></View>
    <View style={{ position: "absolute", bottom: 22, left: 22, right: 22, padding: 18, borderRadius: 22, backgroundColor: c.glass, gap: 12 }}><Copy kind="kicker">INSPIRATION, NOT YOUR RESULT</Copy><Copy kind="section">Discover a different point of view.</Copy><Copy>No qualified public feed is connected. Your private photos are never used here.</Copy><Button title="Explore beauty tools" onPress={() => go("GL-035")} /><Button title="Find professionals" secondary onPress={() => go("GL-103")} /></View>
  </View>;
}

export function NativeSearch() {
  const { colors: c } = useNativeTheme(), [query, setQuery] = useState("");
  // Search actual available destinations, not a fabricated creator/product catalogue.
  const items = [["Analyze", "GL-017"], ["Studio", "GL-035"], ["Professionals", "GL-103"], ["Beauty library", "GL-122"], ["Wardrobe", "GL-061"], ["Products", "GL-085"], ["Events", "GL-209"]].filter(([label]) => label.toLowerCase().includes(query.trim().toLowerCase()));
  return <Page title="Search" onBack={back}><TextInput accessibilityLabel="Search looks, creators and tools" placeholder="Search looks, creators…" placeholderTextColor={c.secondary} value={query} onChangeText={setQuery} returnKeyType="search" style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.text, padding: 16, fontSize: 16 }} />
    <Copy kind="caption">Find available GLAM destinations. Live creator and product search is unavailable.</Copy>{items.map(([title, id]) => <Row key={id} title={title} onPress={() => go(id)} />)}{items.length === 0 && <Copy>No matching destinations.</Copy>}
  </Page>;
}

export function NativeWelcome({ id }: { id: string }) {
  if (id === "GL-001") return <Page title="GLAM Beauty" scroll={false}><View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 24, padding: 22 }}><Image source={require("../assets/brand/wordmark.png")} accessibilityLabel="GLAM Beauty" style={{ width: 260, height: 91 }} resizeMode="contain" /><Copy kind="caption">Every look. Every style. Everyone.</Copy><Button title="Continue" onPress={() => go("GL-002")} /></View></Page>;
  return <Page title={id === "GL-002" ? "Welcome" : "Make it your own"} onBack={back}><View style={{ borderRadius: 26, overflow: "hidden" }}><EditorialPhoto panel={id === "GL-002" ? 0 : 2} height={330} /></View><Copy kind="hero">Every look.{"\n"}Every style. You.</Copy><Copy>Discover your possibilities. Your features are a starting point, never a score.</Copy><Button title={id === "GL-002" ? "Get started" : "Create my space"} onPress={() => go(id === "GL-002" ? "GL-003" : "GL-004")} /><Button title="Explore first" secondary onPress={() => go("home")} /></Page>;
}

export function NativeDependencyScreen({ id, reason }: { id: string; reason?: string }) {
  const row = registry.find(r => r.id === id);
  return <Page title={row?.title || "GLAM Beauty"} onBack={back}><View style={{ flex: 1, justifyContent: "center", gap: 20 }}><Copy kind="kicker">UNAVAILABLE</Copy><Copy kind="title">This service isn’t ready.</Copy><Copy>{reason || "This journey is unavailable until its service and account permissions can be confirmed. No request, payment or account change has been made."}</Copy><Button title="Back" onPress={back} /><Button title="Return Home" secondary onPress={() => go("home")} /></View></Page>;
}

export function NativeSystemScreen({ id }: { id: string }) {
  const [error, setError] = useState("");
  if (id === "GL-205") return <Page title="Device permission" onBack={back}><Copy kind="title">Permission needed.</Copy><Copy>You can change device permissions in Settings, or choose a photo through the system picker.</Copy>{error && <Copy>{error}</Copy>}<Button title="Open Settings" onPress={() => void Linking.openSettings().catch(() => setError("Settings could not open. Open your device settings manually and choose GLAM Beauty."))} /><Button title="Return to Analyze" secondary onPress={() => go("GL-017")} /></Page>;
  return <NativeDependencyScreen id={id} reason={id === "GL-203" ? "You appear to be offline. Reconnect before requesting an online service. Your local photos are not uploaded." : id === "GL-206" ? "Sign in or unlock your account again before opening private records." : "The service could not be confirmed. Return to a safe destination and try the journey again."} />;
}
