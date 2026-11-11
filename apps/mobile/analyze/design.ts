import { Platform } from "react-native";

// Handover v3 theme.css is later than the older shared consumer-design palette.
export const captureDesign = {
  background: "#0f0e10", surface: "#1a171b", raised: "#262027", text: "#f8f1ec",
  muted: "#b9aeb5", line: "#352d36", action: "#f6c6d8", onAction: "#1c1115",
  accent: "#e2a6c1", error: "#ffd1d7", gutter: 22, sheetRadius: 28,
  displayFont: Platform.OS === "ios" ? "Georgia" : "serif",
} as const;
