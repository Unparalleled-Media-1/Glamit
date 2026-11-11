import { createContext, useContext, useMemo, useState } from "react";
import { Platform } from "react-native";

export const palettes = {
  dark: { background: "#0f0e10", surface: "#1a171b", raised: "#262027", text: "#f8f1ec", secondary: "#b9aeb5", line: "#352d36", primary: "#f6c6d8", onPrimary: "#1c1115", accent: "#e2a6c1", glass: "rgba(20,16,20,.55)", onGlass: "#fff4f0", success: "#9fd3b0", error: "#e07080", button: "#b04a6b", onButton: "#ffffff" },
  light: { background: "#f8f4f0", surface: "#ffffff", raised: "#efe8e3", text: "#17151a", secondary: "#5f5963", line: "#e3dad7", primary: "#17151a", onPrimary: "#ffffff", accent: "#8f3157", glass: "rgba(248,244,240,.7)", onGlass: "#17151a", success: "#2f7a4b", error: "#b3261e", button: "#17151a", onButton: "#ffffff" },
} as const;
export const geometry = { gutter: 22, field: 14, card: 22, tray: 30, pill: 28, touch: 48, fast: 160, normal: 240 } as const;
export const typography = { display: Platform.OS === "ios" ? "Georgia" : "serif", body: Platform.OS === "ios" ? "Arial" : "sans-serif", hero: 46, title: 34, section: 26, bodySize: 15, bodyLine: 23, label: 13, caption: 11 } as const;
type ThemeName = keyof typeof palettes;
type Theme = { name: ThemeName; colors: typeof palettes[ThemeName]; setTheme: (name: ThemeName) => void };
const ThemeContext = createContext<Theme | null>(null);
export function NativeTheme({ children }: { children: React.ReactNode }) {
  const [name, setTheme] = useState<ThemeName>("dark");
  const value = useMemo(() => ({ name, colors: palettes[name], setTheme }), [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useNativeTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw Error("Native theme provider required");
  return theme;
}
export function useOptionalNativeTheme() { return useContext(ThemeContext); }
