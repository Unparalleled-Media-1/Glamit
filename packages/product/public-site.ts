/** Public, operator-approved facts. Never infer social handles or store identifiers. */
export const publicPageLinks = [
  { slug: "terms", label: "Terms & conditions" },
  { slug: "privacy-policy", label: "Privacy policy" },
  { slug: "cookies", label: "Cookies & device storage" },
  { slug: "returns", label: "Returns & refunds" },
  { slug: "accessibility", label: "Accessibility" },
  { slug: "contact", label: "Contact" },
  { slug: "get-app", label: "Get the GLAM app" },
] as const;
export type PublicPage = typeof publicPageLinks[number]["slug"];
export const isPublicPage = (value: string): value is PublicPage => publicPageLinks.some(p => p.slug === value);
export const socialPlatforms = ["Instagram", "TikTok", "YouTube", "Facebook", "Pinterest"] as const;
export type SocialPlatform = typeof socialPlatforms[number];

const officialHosts: Record<SocialPlatform, string[]> = {
  Instagram: ["www.instagram.com", "instagram.com"], TikTok: ["www.tiktok.com", "tiktok.com"],
  YouTube: ["www.youtube.com", "youtube.com"], Facebook: ["www.facebook.com", "facebook.com"],
  Pinterest: ["www.pinterest.com", "pinterest.com"],
};
/** Validate destination identity as well as HTTPS; generic homepages are not profiles. */
export function checkedPublicLink(kind: SocialPlatform | "ios" | "android", value?: string | null): string | null {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { throw Error("Invalid public destination"); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash)
    throw Error("Invalid public destination");
  if (kind === "ios") {
    if (url.hostname !== "apps.apple.com" || !/^\/(?:[a-z]{2}\/)?app\/(?:[^/]+\/)?id\d+\/?$/.test(url.pathname) || url.search)
      throw Error("Invalid App Store listing");
  } else if (kind === "android") {
    if (url.hostname !== "play.google.com" || url.pathname !== "/store/apps/details" ||
        !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(url.searchParams.get("id") || "") ||
        [...url.searchParams.keys()].some(k => k !== "id") || url.searchParams.getAll("id").length !== 1)
      throw Error("Invalid Google Play listing");
  } else if (!officialHosts[kind].includes(url.hostname) || url.search || !/^\/[^/]+(?:\/[^/]+)*\/?$/.test(url.pathname)) {
    throw Error("Invalid official social profile");
  }
  return url.href;
}

// Populate only with confirmed official profiles/published listings supplied by the operator.
const officialSocialProfiles: Partial<Record<SocialPlatform, string>> = {};
export const publicSite = {
  operator: "Zanzu Technologies Inc.",
  jurisdiction: "Delaware, United States",
  email: "hello@glamit.beauty", // Explicitly supplied by the user; retain glamit spelling.
  legalStatus: "draft" as const,
  iosUrl: checkedPublicLink("ios", null),
  androidUrl: checkedPublicLink("android", null),
  social: socialPlatforms.map(name => ({ name, url: checkedPublicLink(name, officialSocialProfiles[name]) })),
};
