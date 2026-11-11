import { Platform } from "react-native";
import { useOptionalNativeTheme } from "../reskin/theme";

// Handover v3 theme.css is later than the older shared consumer-design palette.
export const captureDesign = {
  background: "#0f0e10", surface: "#1a171b", raised: "#262027", text: "#f8f1ec",
  muted: "#b9aeb5", line: "#352d36", action: "#f6c6d8", onAction: "#1c1115",
  accent: "#e2a6c1", error: "#ffd1d7", gutter: 22, sheetRadius: 28,
  displayFont: Platform.OS === "ios" ? "Georgia" : "serif",
} as const;
export function useCaptureDesign() {
  const theme = useOptionalNativeTheme();
  if (!theme) return captureDesign;
  const c = theme.colors;
  return { ...captureDesign, background: c.background, surface: c.surface, raised: c.raised, text: c.text,
    muted: c.secondary, line: c.line, action: c.button, onAction: c.onButton, accent: c.accent, error: c.error };
}
