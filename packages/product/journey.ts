/** User-authored styling plans. No inferred analysis, identity, catalog or authority. */
import type { Page } from "./platform";
export const goalJourneys: {
  title: string;
  copy: string;
  page: Page;
  icon: string;
}[] = [
  {
    title: "Understand What Suits Me",
    copy: "Features, colors & a little clarity",
    page: "analyze",
    icon: "◌",
  },
  {
    title: "Style Me for an Event",
    copy: "An occasion. A budget. Your expression.",
    page: "event",
    icon: "✧",
  },
  {
    title: "Recreate This Look",
    copy: "Start with something that inspires you",
    page: "screenshot",
    icon: "⌑",
  },
  {
    title: "Try a New Hairstyle or Makeup Look",
    copy: "Explore a different side of you",
    page: "studio",
    icon: "〰",
  },
  {
    title: "Style My Existing Wardrobe",
    copy: "Make more of what you already own",
    page: "wardrobe",
    icon: "♧",
  },
  {
    title: "Find Products and Professionals",
    copy: "Bring your chosen look to life",
    page: "complete",
    icon: "↗",
  },
];
export const lookParts = [
  "Hair",
  "Makeup",
  "Clothing",
  "Accessories",
  "Professional services",
] as const;
export type LookPart = (typeof lookParts)[number];
export const partChoices: Record<LookPart, string[]> = {
  Hair: [
    "My natural texture",
    "Sculpted braids",
    "Soft waves",
    "Sleek low bun",
    "Tailored cut",
  ],
  Makeup: [
    "Barely there",
    "Soft bronze",
    "Rose accents",
    "Statement lip",
    "No makeup",
  ],
  Clothing: [
    "From my wardrobe",
    "Fluid tailoring",
    "An emerald dress",
    "Relaxed layers",
    "Custom design",
  ],
  Accessories: [
    "Already owned",
    "Gold accents",
    "Minimal silver",
    "Statement pieces",
    "None",
  ],
  "Professional services": [
    "Do it myself",
    "Hair styling request",
    "Makeup artist request",
    "Tailor feasibility quote",
    "Alterations request",
  ],
};
export type Look = {
  id: string;
  title: string;
  parts: Record<LookPart, string>;
};
export type Journey = {
  version: 1;
  remember: boolean;
  onboarded: boolean;
  name: string;
  preferences: string;
  country: string;
  city: string;
  currency: string;
  event: string;
  date: string;
  deadline: string;
  theme: string;
  budget: string;
  sourcing: string;
  messages: string[];
  look: Look;
  saved: Look[];
  wardrobe: { id: string; name: string }[];
};
export function freshJourney(): Journey {
  return {
    version: 1,
    remember: false,
    onboarded: false,
    name: "",
    preferences: "",
    country: "",
    city: "",
    currency: "ZAR",
    event: "",
    date: "",
    deadline: "",
    theme: "",
    budget: "",
    sourcing: "Compare options",
    messages: [],
    look: {
      id: "current",
      title: "My next look",
      parts: {
        Hair: "",
        Makeup: "",
        Clothing: "",
        Accessories: "",
        "Professional services": "",
      },
    },
    saved: [],
    wardrobe: [],
  };
}
export function changePart(s: Journey, part: LookPart, value: string): Journey {
  return {
    ...s,
    look: {
      ...s.look,
      parts: { ...s.look.parts, [part]: value.slice(0, 240) },
    },
  };
}
const text = (v: unknown, max = 1000) =>
  typeof v === "string" ? v.slice(0, max) : "";
function readLook(v: unknown): Look | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!o.parts || typeof o.parts !== "object") return null;
  const parts = {} as Record<LookPart, string>;
  for (const k of lookParts)
    parts[k] = text((o.parts as Record<string, unknown>)[k], 240);
  return {
    id: text(o.id, 80),
    title: text(o.title, 100) || "Untitled look",
    parts,
  };
}
/** Whitelist durable metadata. Conversations, attachments, reports, permissions and tokens never persist. */
export function durableJourney(s: Journey): string {
  const clean = restoreJourney(JSON.stringify({ ...s, remember: true }));
  const { messages, ...metadata } = clean;
  return JSON.stringify({ ...metadata, remember: s.remember });
}
export function restoreJourney(raw: string): Journey {
  const s = freshJourney();
  if (raw.length > 150000) return s;
  try {
    const o = JSON.parse(raw);
    if (o.version !== 1 || o.remember !== true) return s;
    for (const k of [
      "name",
      "preferences",
      "country",
      "city",
      "currency",
      "event",
      "date",
      "deadline",
      "theme",
      "budget",
      "sourcing",
    ] as const)
      s[k] = text(o[k], k === "preferences" ? 1000 : 160);
    if (!["ZAR", "USD", "GBP", "EUR"].includes(s.currency)) s.currency = "ZAR";
    s.remember = true;
    s.onboarded = o.onboarded === true;
    s.look = readLook(o.look) || s.look;
    s.saved = Array.isArray(o.saved)
      ? o.saved
          .slice(0, 30)
          .map(readLook)
          .filter((v: Look | null): v is Look => !!v)
      : [];
    s.wardrobe = Array.isArray(o.wardrobe)
      ? o.wardrobe
          .slice(0, 80)
          .flatMap((v: unknown) =>
            v && typeof v === "object"
              ? [
                  {
                    id: text((v as Record<string, unknown>).id, 80),
                    name: text((v as Record<string, unknown>).name, 160),
                  },
                ]
              : [],
          )
      : [];
    return s;
  } catch {
    return s;
  }
}
export function saveLook(s: Journey, id: string): Journey {
  const look = { ...s.look, id, parts: { ...s.look.parts } };
  return {
    ...s,
    look,
    saved: [look, ...s.saved.filter((x) => x.id !== id)].slice(0, 30),
  };
}
