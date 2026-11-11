import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export function loadCaptureCamera(): typeof import("expo-camera") | null {
  // An older development binary may lack the newly installed native module.
  // Never replace it with a browser camera or a portrait pretending to be live.
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  try {
    if (!requireOptionalNativeModule("ExpoCamera")) return null;
    return require("expo-camera") as typeof import("expo-camera");
  } catch { return null; }
}
