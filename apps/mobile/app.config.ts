import type { ConfigContext, ExpoConfig } from "expo/config";
import { existsSync } from "node:fs";
import path from "node:path";
import design from "../../packages/product/consumer-design.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const stage = process.env.GLAM_BUILD_ENV || "development";
  if (!["development", "preview", "production"].includes(stage)) throw Error("Invalid GLAM_BUILD_ENV");
  const bundleId = process.env.GLAM_IOS_BUNDLE_IDENTIFIER;
  const androidId = process.env.GLAM_ANDROID_PACKAGE;
  const projectId = process.env.EAS_PROJECT_ID;
  const owner = process.env.EXPO_OWNER;
  const stylistOrigin = process.env.EXPO_PUBLIC_GLAM_API_ORIGIN || "";
  if (stylistOrigin) {
    let target: URL;
    try { target = new URL(stylistOrigin); } catch { throw Error("Native styling API origin must be a valid HTTPS origin"); }
    if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash || target.pathname !== "/") throw Error("Native styling API origin must be HTTPS without credentials, path or query");
  }
  const icon = "./assets/brand/app-icon.png";
  const splash = "./assets/brand/wordmark.png";
  if (stage === "production") {
    if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) throw Error("Production mobile Auth public key is required; never provide server keys.");
    if (!bundleId || !androidId || !projectId || !owner) throw Error("Registered iOS/Android identifiers, EAS_PROJECT_ID and EXPO_OWNER are required. Do not invent replacements for existing store records.");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) throw Error("EAS_PROJECT_ID must be an existing project UUID");
    if (!existsSync(path.resolve(__dirname, icon)) || !existsSync(path.resolve(__dirname, splash))) throw Error("Original approved app icon and splash source files are required before store builds.");
  }
  if ([bundleId, androidId].some(id => id && !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(id))) throw Error("Invalid application identifier");
  return {
    ...config,
    name: "GLAM Beauty",
    slug: config.slug || "glam-ai",
    scheme: "glamai",
    ...(owner ? { owner } : {}),
    ...(existsSync(path.resolve(__dirname, icon)) ? { icon } : {}),
    ...(existsSync(path.resolve(__dirname, splash)) ? { splash: { image: splash, resizeMode: "contain", backgroundColor: design.palette.ivory } } : {}),
    ios: { ...config.ios, ...(bundleId ? { bundleIdentifier: bundleId } : {}) },
    web: { ...config.web, favicon: "./assets/brand/favicon.png" },
    android: { ...config.android, ...(androidId ? { package: androidId } : {}) },
    extra: { ...config.extra, deploymentEnvironment: stage, ...(projectId ? { eas: { projectId } } : {}), supabaseProject: "bkkmsbxrxkqaveymcrgi", apiTransport: "supabase-edge-v1", aiStylistTransport: "fastapi-v1", aiStylistOriginConfigured: Boolean(stylistOrigin) },
  };
};
