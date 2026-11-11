import { createContext, useContext, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { geometry as g, typography as t, useNativeTheme } from "./theme";

export const ChromeLayout = createContext(false);
export function useNativeInsets() {
  const insets = useSafeAreaInsets(), chrome = useContext(ChromeLayout);
  return chrome ? { ...insets, top: 0, bottom: 0 } : insets;
}

export function NativeText({ children, kind = "body", onPhoto = false }: { children: React.ReactNode; kind?: "body" | "title" | "hero" | "section" | "caption" | "kicker"; onPhoto?: boolean }) {
  const { colors: c } = useNativeTheme();
  return <Text accessibilityRole={["title", "hero", "section"].includes(kind) ? "header" : undefined} style={{ color: onPhoto ? kind === "kicker" ? "#f6c6d8" : "#fff4f0" : kind === "kicker" ? c.accent : kind === "caption" ? c.secondary : c.text,
    fontFamily: ["title", "hero", "section"].includes(kind) ? t.display : t.body,
    fontSize: kind === "hero" ? 46 : kind === "title" ? 34 : kind === "section" ? 26 : kind === "caption" ? 12 : kind === "kicker" ? 11 : 15,
    lineHeight: kind === "hero" ? 48 : kind === "title" ? 38 : kind === "section" ? 30 : kind === "caption" ? 18 : 23,
    letterSpacing: kind === "kicker" ? 1.6 : ["title", "hero"].includes(kind) ? -1 : 0,
    fontWeight: kind === "kicker" ? "700" : "400" }}>{children}</Text>;
}
export function NativeButton({ title, onPress, secondary = false, glass = false, disabledReason }: { title: string; onPress?: () => void; secondary?: boolean; glass?: boolean; disabledReason?: string }) {
  const { colors: c } = useNativeTheme();
  const disabled = !!disabledReason || !onPress;
  return <View style={{ gap: 6 }}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 54, paddingVertical: 14, paddingHorizontal: 20, borderRadius: g.pill, alignItems: "center", justifyContent: "center", borderWidth: secondary ? 1 : 0,
      borderColor: c.line, backgroundColor: glass ? c.glass : secondary ? "transparent" : c.button, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 })}>
    <Text style={{ color: glass ? c.onGlass : secondary ? c.text : c.onButton, fontFamily: t.body, fontSize: 15, fontWeight: "700", textAlign: "center" }}>{title}</Text>
  </Pressable>{disabledReason && <NativeText kind="caption">{disabledReason}</NativeText>}</View>;
}
export function NativeCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useNativeTheme();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: g.card, padding: 18, gap: 12 }, style]}>{children}</View>;
}
export function NativePage({ title, onBack, children, scroll = true }: { title: string; onBack?: () => void; children: React.ReactNode; scroll?: boolean }) {
  const { colors: c } = useNativeTheme(), insets = useNativeInsets();
  return <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
    <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 }}>
      {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.text, fontSize: 28 }}>‹</Text></Pressable>}
      <View style={{ flex: 1 }}><NativeText>{title}</NativeText></View>
    </View>
    {scroll ? <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: g.gutter, paddingBottom: Math.max(insets.bottom, 22), gap: 18, flexGrow: 1 }}>{children}</ScrollView> : children}
  </View>;
}
export function EditorialPhoto({ panel = 0, height = 360, products = false, label = true }: { panel?: number; height?: number; products?: boolean; label?: boolean }) {
  const [width, setWidth] = useState(390);
  const spriteHeight = Math.max(height, width / 0.75), panelWidth = spriteHeight * 0.75;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height, overflow: "hidden", backgroundColor: "#332b2f" }}>
    <Image accessible accessibilityLabel="Editorial illustration, not your photo, analysis or verified inventory" source={products ? require("../assets/beauty-products.webp") : require("../assets/beauty-editorial.webp")}
      style={{ width: spriteHeight * 3, height: spriteHeight, position: "absolute", left: -(panel * panelWidth + (panelWidth - width) / 2), top: -0.15 * (spriteHeight - height) }} />
    <LinearGradient colors={["transparent", "rgba(10,8,10,.88)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" }} />
    {label && <Text style={{ position: "absolute", top: 14, left: 14, right: 14, padding: 8, backgroundColor: "#201620bb", color: "#fff4f0", fontSize: 11 }}>Editorial inspiration · Not your result</Text>}
  </View>;
}
export function NativeRow({ title, detail, glyph, onPress }: { title: string; detail?: string; glyph?: string; onPress: () => void }) {
  const { colors: c } = useNativeTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
    {glyph && <Text style={{ color: c.accent, fontSize: 24, width: 36, textAlign: "center" }}>{glyph}</Text>}<View style={{ flex: 1, gap: 4 }}><NativeText>{title}</NativeText>{detail && <NativeText kind="caption">{detail}</NativeText>}</View><NativeText>›</NativeText>
  </Pressable>;
}
