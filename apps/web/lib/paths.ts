/** Prefix only the standalone review export; normal Next routes remain rooted. */
const configured = process.env.NEXT_PUBLIC_GLAM_BASE_PATH || "";
export const appBasePath = configured.replace(/\/$/, "");
export function appPath(path: string): string {
  return appBasePath + (path.startsWith("/") ? path : "/" + path);
}
export function sectionFromPath(path: string): string {
  if (
    appBasePath &&
    path !== appBasePath &&
    !path.startsWith(appBasePath + "/")
  )
    return "home";
  return path.slice(appBasePath.length).replace(/^\/+|\/+$/g, "") || "home";
}
export const capabilitiesPath = () =>
  appPath(
    process.env.NEXT_PUBLIC_GLAM_STATIC_PREVIEW === "true"
      ? "/api/capabilities.json"
      : "/api/capabilities",
  );
