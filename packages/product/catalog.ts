/** Explicit style requirements only. No face data, inferred identity or ad targeting profiles. */
export const analysisContexts = [
  { id: "face", title: "Face Analysis", category: "cosmetics" },
  { id: "hair", title: "Hair Analysis", category: "hair" },
  { id: "skin", title: "Skin Appearance Analysis", category: "skincare" },
  { id: "body-fit", title: "Body & Fit Styling", category: "clothing" },
  { id: "color", title: "Personal Color Analysis", category: "cosmetics" },
  { id: "makeup-match", title: "Makeup Match", category: "cosmetics" },
  { id: "makeover", title: "AI Makeover", category: "cosmetics" },
  { id: "routine", title: "Your Routine", category: "cosmetics" },
] as const;
export type AnalysisContext = (typeof analysisContexts)[number]["id"];
export const categories = [
  "cosmetics",
  "hair",
  "skincare",
  "clothing",
  "footwear",
  "accessories",
  "tool",
  "service",
] as const;
export interface RequirementDraft {
  id: string;
  context: AnalysisContext;
  category: string;
  tags: string[];
  country: string;
  currency: string;
}
export function requirementProblem(
  tags: string[],
  country: string,
): string | null {
  if (
    !tags.length ||
    tags.length > 20 ||
    tags.some((t) => !/^[a-z0-9][a-z0-9-]{0,47}$/.test(t))
  )
    return "Use one to 20 short tags with lowercase letters, numbers and hyphens.";
  if (new Set(tags).size !== tags.length)
    return "Remove duplicate requirement tags.";
  if (!/^[A-Z]{2}$/.test(country))
    return "Choose a two-letter delivery country code.";
  return null;
}
export const enhancementOptions = [
  "Clean background",
  "Improve lighting",
  "Generate description",
  "Suggest product tags",
  "Read packaging / barcode",
  "Translate listing",
  "Create advertising image",
];
export interface MerchantDraft {
  id: string;
  title: string;
  category: string;
  sku: string;
  description: string;
  price: string;
  currency: string;
  stock: string;
  country: string;
  source: string;
  destination: string;
  condition: string;
  reviewed: boolean;
  photoCount: number;
}
export const emptyMerchantDraft: Omit<MerchantDraft, "id"> = {
  title: "",
  category: "hair",
  sku: "",
  description: "",
  price: "",
  currency: "ZAR",
  stock: "",
  country: "",
  source: "",
  destination: "",
  condition: "new",
  reviewed: false,
  photoCount: 0,
};
export function merchantDraftProblem(
  d: Omit<MerchantDraft, "id">,
  existing: MerchantDraft[] = [],
): string | null {
  if (
    d.title.length > 160 ||
    d.sku.length > 80 ||
    d.source.length > 160 ||
    d.description.length > 3000
  )
    return "Keep product facts within the supported field limits.";
  if (
    !categories.includes(d.category as (typeof categories)[number]) ||
    d.category === "service"
  )
    return "Choose a product category; services require the Professional workspace.";
  if (!["ZAR", "USD", "EUR", "GBP"].includes(d.currency))
    return "Choose a supported listing currency.";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(d.sku))
    return "Use a source SKU with letters, numbers and standard identifier punctuation.";
  if (!d.title.trim() || !d.sku.trim() || !d.source.trim())
    return "Add a title, source SKU and factual source reference.";
  if (!/^\d+(\.\d{1,2})?$/.test(d.price) || Number(d.price) <= 0)
    return "Enter a positive merchant price with at most two decimal places.";
  if (!/^\d+$/.test(d.stock))
    return "Confirm stock as a whole number, including zero when out of stock.";
  if (!/^[A-Z]{2}$/.test(d.country))
    return "Add a two-letter delivery country code.";
  try {
    const url = new URL(d.destination);
    if (url.protocol !== "https:" || url.username || url.password)
      return "Use a reviewed HTTPS destination without embedded credentials.";
  } catch {
    return "Add the intended merchant HTTPS destination.";
  }
  if (!d.reviewed)
    return "Confirm rights and review all product facts before saving a reviewed draft.";
  if (
    existing.some(
      (n) => n.sku.trim().toLowerCase() === d.sku.trim().toLowerCase(),
    )
  )
    return "This source SKU already has a session draft. Review that draft instead of creating a duplicate.";
  return null;
}
export const contextualReportFields: Record<
  AnalysisContext,
  readonly string[]
> = {
  face: [
    "Face shape",
    "Eye shape",
    "Brows",
    "Lip features",
    "Facial proportions",
    "Skin tone",
    "Estimated undertone",
  ],
  hair: [
    "Hair appearance",
    "Chosen texture preferences",
    "Styling goals",
    "Haircare routine",
    "Professional feasibility",
  ],
  skin: [
    "Cosmetic appearance guidance",
    "Lighting and uncertainty",
    "Chosen skincare goals",
    "Routine suggestions",
    "Professional guidance boundaries",
  ],
  "body-fit": [
    "Declared fit preferences",
    "Comfort and accessibility",
    "Chosen silhouettes",
    "Merchant size-chart evidence",
    "Tailoring requirements",
  ],
  color: [
    "Color season",
    "Estimated undertone",
    "Chosen palette",
    "Lighting limits",
  ],
  "makeup-match": [
    "Inspiration rights",
    "Technique steps",
    "Required components",
    "Exact / similar evidence",
  ],
  makeover: [
    "User-chosen look",
    "Original image",
    "Simulation limits",
    "Look components",
  ],
  routine: [
    "Your own steps",
    "Chosen goals",
    "Products already owned",
    "Optional missing requirements",
  ],
};
/** Session-only import. Discard supplied identities, image counts and review attestations. */
export function parseMerchantImport(
  text: string,
  existing: MerchantDraft[],
): Omit<MerchantDraft, "id">[] {
  const rows: unknown = JSON.parse(text);
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 50)
    throw Error("Import one to 50 product draft records.");
  const next: Omit<MerchantDraft, "id">[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw Error("Every imported product must be an object.");
    const raw = row as Record<string, unknown>;
    const draft = { ...emptyMerchantDraft };
    for (const key of Object.keys(
      emptyMerchantDraft,
    ) as (keyof typeof emptyMerchantDraft)[]) {
      if (key === "reviewed" || key === "photoCount") continue;
      if (typeof raw[key] !== "string")
        throw Error(
          "Imported product facts must use the session draft format.",
        );
      (draft as unknown as Record<string, unknown>)[key] = raw[key];
    }
    const issue = merchantDraftProblem({ ...draft, reviewed: true }, [
      ...existing,
      ...next.map((r, i) => ({ ...r, id: String(i) })),
    ]);
    if (issue) throw Error(issue);
    next.push({ ...draft, reviewed: false, photoCount: 0 });
  }
  return next;
}
export type RecommendationMatch =
  import("../contracts/api").components["schemas"]["Match"];
export type RecommendationResult =
  import("../contracts/api").components["schemas"]["MatchResult"];
/** Display formatting only; prices and delivered totals are computed/confirmed by the server. */
export function displayMinor(amount: number, currency: string): string {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !["ZAR", "USD", "EUR", "GBP"].includes(currency)
  )
    return "Unavailable";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount / 100);
}
