import { NavigationContainer, createNavigationContainerRef, DarkTheme, DefaultTheme, useIsFocused } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import registry from "./registry.json";
import { NativeTheme, useNativeTheme } from "./theme";
import { ChromeLayout } from "./ui";

export type DesignRoute = string;
const routeIds = new Set(registry.map(row => row.id));
const navigation = createNavigationContainerRef<Record<string, undefined>>();
export function navigateDesign(id: DesignRoute) {
  if (!routeIds.has(id)) throw Error("Unknown design route");
  if (navigation.isReady()) navigation.navigate(id);
}
export function backDesign() {
  if (!navigation.isReady()) return;
  if (navigation.canGoBack()) navigation.goBack(); else navigation.resetRoot({ index: 0, routes: [{ name: "home" }] });
}
export function selectDesignTab(id: DesignRoute) {
  if (!routeIds.has(id)) throw Error("Unknown design tab");
  if (navigation.isReady()) navigation.resetRoot({ index: 0, routes: [{ name: id }] });
}
const Stack = createNativeStackNavigator<Record<string, undefined>>();
const tabs = [["Home", "⌂", "home"], ["Analyze", "◎", "GL-017"], ["Studio", "✧", "GL-035"], ["Discover", "⌖", "GL-069"], ["Profile", "○", "GL-117"]] as const;
// Full-screen capture retains its verified permission/lifecycle boundary. Older
// composed journeys retain their own chrome until their screen-level reskin.
const shared = new Set(["home", "GL-035", "GL-069", "GL-070", "GL-117", "GL-118", "GL-119", "GL-120", "GL-121", "GL-122", "GL-123", "GL-130", "GL-131", "GL-132", "GL-133", "GL-138", "GL-140", "GL-199", "GL-200", "GL-202", "GL-024", "GL-025", "GL-026", "GL-027", "GL-033", "GL-034", ...Array.from({ length: 11 }, (_, n) => `GL-${String(37 + n).padStart(3, "0")}`)]);
function activeTab(id: string) {
  if (id === "home") return "home";
  const n = Number(id.slice(3));
  if (n >= 17 && n <= 34) return "GL-017";
  if (n >= 35 && n <= 52) return "GL-035";
  if (n >= 69 && n <= 116) return "GL-069";
  return "GL-117";
}

type HostProps = { render: (id: string, focused: boolean) => React.ReactNode; onRoute: (id: string) => void };
function FocusedScreen({ id, render }: { id: string; render: HostProps["render"] }) {
  return <>{render(id, useIsFocused())}</>;
}
function NativeNavigation({ render, onRoute }: HostProps) {
  const { colors: c, name } = useNativeTheme(), insets = useSafeAreaInsets();
  return <NavigationContainer ref={navigation} theme={{ ...(name === "dark" ? DarkTheme : DefaultTheme), colors: { ...(name === "dark" ? DarkTheme : DefaultTheme).colors, background: c.background, card: c.surface, text: c.text, primary: c.primary, border: c.line } }}
    onStateChange={state => { const route = state?.routes[state.index]; if (route) onRoute(route.name); }}>
    <Stack.Navigator initialRouteName="home" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background }, animation: "slide_from_right" }}>
      {registry.map(row => <Stack.Screen key={row.id} name={row.id}>{() => <View style={{ flex: 1 }}>
        {shared.has(row.id) && <View style={{ paddingTop: insets.top, minHeight: insets.top + 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.background }}>
          <Pressable accessibilityRole="button" accessibilityLabel="GLAM Beauty home" onPress={() => selectDesignTab("home")} style={{ width: 48, height: 52, justifyContent: "center" }}><Image source={require("../assets/brand/app-icon.png")} style={{ width: 44, height: 44, borderRadius: 12 }} /></Pressable>
          <View style={{ flex: 1 }} /><Pressable accessibilityRole="button" accessibilityLabel="Messages" onPress={() => navigateDesign("GL-198")} style={{ minHeight: 48, minWidth: 48, borderRadius: 24, backgroundColor: c.raised, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.text, fontSize: 20 }}>✉</Text></Pressable>
        </View>}
        <ChromeLayout.Provider value={shared.has(row.id)}><View style={{ flex: 1 }}><FocusedScreen id={row.id} render={render} /></View></ChromeLayout.Provider>
        {shared.has(row.id) && <View accessibilityRole="tablist" style={{ flexDirection: "row", paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line }}>
          {tabs.map(([title, glyph, id]) => <Pressable key={id} testID={"native-tab-" + title.toLowerCase()} accessibilityRole="tab" accessibilityLabel={title} accessibilityState={{ selected: activeTab(row.id) === id }} onPress={() => selectDesignTab(id)}
            style={{ flex: 1, minHeight: 52, justifyContent: "center", alignItems: "center", gap: 4 }}>
            <Text style={{ color: activeTab(row.id) === id ? c.onPrimary : c.secondary, fontSize: 22, backgroundColor: activeTab(row.id) === id ? c.primary : "transparent", borderRadius: 18, paddingHorizontal: 16 }}>{glyph}</Text>
            <Text style={{ color: activeTab(row.id) === id ? c.text : c.secondary, fontSize: 11 }}>{title}</Text>
          </Pressable>)}
        </View>}
      </View>}</Stack.Screen>)}
    </Stack.Navigator>
  </NavigationContainer>;
}
export function NativeRouteHost(props: HostProps) {
  return <NativeTheme><NativeNavigation {...props} /></NativeTheme>;
}
