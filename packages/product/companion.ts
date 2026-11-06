/** Runtime connection contracts. No adapter is registered by the preview or inferred from a flag.
 * The authenticated application must supply owner-scoped, qualified adapters. These are not new API endpoints.
 */
import type {
  RecommendationMatch,
  RecommendationResult,
  RequirementDraft,
} from "./catalog";
export const featureKeys = [
  "face-shape",
  "eyes",
  "brows",
  "lips",
  "undertone",
] as const;
export type FeatureKey = (typeof featureKeys)[number];
export const featureLabels: Record<FeatureKey, string> = {
  "face-shape": "Face shape",
  eyes: "Eye features",
  brows: "Brows",
  lips: "Lip features",
  undertone: "Estimated undertone",
};
export type Finding = {
  key: FeatureKey;
  estimate: string | null;
  certainty: "supported" | "tentative" | "unavailable";
  uncertainty: string;
};
export type LookDirection = {
  id: string;
  title: string;
  rationale: string;
  tool:
    | "Hair Try-On"
    | "Hair Color"
    | "Makeup Match"
    | "Glow-Up Preview"
    | "Look Remix";
  style: string;
};
export type AnalysisResult = {
  id: string;
  subject: string;
  photoRevision: number;
  completedAt: string;
  provider: string;
  model: string;
  findings: Finding[];
  directions: LookDirection[];
};
export type Corrections = Partial<Record<FeatureKey, string>>;
export type PreviewResult = {
  id: string;
  subject: string;
  photoRevision: number;
  analysisId: string;
  correctionRevision: number;
  directionId: string;
  imageUrl: string;
  expiresAt: string;
  provider: string;
};
export type VerifiedOffer = RecommendationMatch & {
  variant_id: string;
  quantity_available: number;
  country: string;
  city: string | null;
  checked_at: string;
};
export type CartItem = { offer: VerifiedOffer; quantity: number };
export type CheckoutQuote = {
  id: string;
  subject: string;
  expiresAt: string;
  currency: string;
  totalMinor: number;
  lines: {
    listingId: string;
    variantId: string;
    quantity: number;
    merchant: string;
    totalMinor: number;
  }[];
  delivery: string;
  returns: string;
  hostedUrl: string;
};
export type OrderReceipt = {
  id: string;
  subject: string;
  quoteId: string;
  state: "pending" | "paid" | "failed" | "cancelled";
  currency: string;
  totalMinor: number;
  merchantOrders: { id: string; merchant: string; state: string }[];
};
export type WeatherDay = {
  date: string;
  status: "forecast" | "seasonal_estimate" | "unavailable";
  lowC: number | null;
  highC: number | null;
  rainChance: number | null;
  note: string;
};
export type TravelPlan = {
  destination: string;
  country: string;
  start: string;
  end: string;
  activities: string;
  preferences: string;
  sourcing: "before-departure" | "at-destination";
};
export type WeatherResult = {
  destination: string;
  country: string;
  start: string;
  end: string;
  timezone: string;
  provider: string;
  retrievedAt: string;
  expiresAt: string;
  days: WeatherDay[];
};
export interface CompanionConnection {
  subject: string;
  /** Exact origins established by adapter qualification, not response-supplied allowlists. */
  imageOrigins: readonly string[];
  checkoutOrigins: readonly string[];
  analyze?: (
    request: {
      photoUri: string;
      photoRevision: number;
      goals: readonly string[];
      consent: true;
    },
    signal: AbortSignal,
  ) => Promise<AnalysisResult>;
  tryOn?: (
    request: {
      photoUri: string;
      photoRevision: number;
      analysisId: string;
      corrections: Corrections;
      correctionRevision: number;
      direction: LookDirection;
      consent: true;
    },
    signal: AbortSignal,
  ) => Promise<PreviewResult>;
  matches?: (
    request: RequirementDraft & { city: string },
    signal: AbortSignal,
  ) => Promise<RecommendationResult>;
  offer?: (
    listingId: string,
    requirement: RequirementDraft,
    signal: AbortSignal,
  ) => Promise<VerifiedOffer>;
  quote?: (
    items: { listingId: string; variantId: string; quantity: number }[],
    destination: { country: string; city: string; currency: string },
    signal: AbortSignal,
  ) => Promise<CheckoutQuote>;
  order?: (quoteId: string, signal: AbortSignal) => Promise<OrderReceipt>;
  weather?: (plan: TravelPlan, signal: AbortSignal) => Promise<WeatherResult>;
}
const bounded = (v: unknown, n = 1000): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= n;
const date = (v: string) => Number.isFinite(Date.parse(v));
export function validAnalysis(
  r: AnalysisResult,
  subject: string,
  revision: number,
  now = Date.now(),
): boolean {
  return (
    !!r &&
    r.subject === subject &&
    r.photoRevision === revision &&
    bounded(r.id, 160) &&
    bounded(r.provider, 160) &&
    bounded(r.model, 160) &&
    date(r.completedAt) &&
    Date.parse(r.completedAt) <= now + 60000 &&
    Array.isArray(r.findings) &&
    r.findings.length === featureKeys.length &&
    new Set(r.findings.map((f) => f.key)).size === featureKeys.length &&
    r.findings.every(
      (f) =>
        featureKeys.includes(f.key) &&
        ["supported", "tentative", "unavailable"].includes(f.certainty) &&
        bounded(f.uncertainty) &&
        (f.certainty === "unavailable"
          ? f.estimate === null
          : bounded(f.estimate, 240)),
    ) &&
    Array.isArray(r.directions) &&
    r.directions.length <= 12 &&
    new Set(r.directions.map((d) => d.id)).size === r.directions.length &&
    r.directions.every(
      (d) =>
        bounded(d.id, 160) &&
        bounded(d.title, 160) &&
        bounded(d.rationale) &&
        bounded(d.style, 160) &&
        [
          "Hair Try-On",
          "Hair Color",
          "Makeup Match",
          "Glow-Up Preview",
          "Look Remix",
        ].includes(d.tool),
    )
  );
}
export function allowedUrl(value: string, origins: readonly string[]): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      origins.includes(u.origin)
    );
  } catch {
    return false;
  }
}
export function validPreview(
  r: PreviewResult,
  c: CompanionConnection,
  analysis: AnalysisResult,
  correctionRevision: number,
  directionId: string,
  now = Date.now(),
) {
  return (
    !!r &&
    bounded(r.id, 160) &&
    bounded(r.provider, 160) &&
    r.subject === c.subject &&
    r.photoRevision === analysis.photoRevision &&
    r.analysisId === analysis.id &&
    r.correctionRevision === correctionRevision &&
    r.directionId === directionId &&
    date(r.expiresAt) &&
    Date.parse(r.expiresAt) > now &&
    allowedUrl(r.imageUrl, c.imageOrigins)
  );
}
export function eligibleOffer(
  o: VerifiedOffer,
  country: string,
  now = Date.now(),
): boolean {
  return (
    !!o &&
    bounded(o.listing_id, 160) &&
    bounded(o.variant_id, 160) &&
    bounded(o.merchant, 240) &&
    o.country === country &&
    bounded(country, 2) &&
    country.length === 2 &&
    !o.service_quote_required &&
    o.category !== "service" &&
    o.source === "reviewed_merchant_assertion" &&
    Number.isSafeInteger(o.price_minor) &&
    o.price_minor >= 0 &&
    ["ZAR", "USD", "EUR", "GBP"].includes(o.currency) &&
    (o.delivered_total_minor === null ||
      (Number.isSafeInteger(o.delivered_total_minor) &&
        o.delivered_total_minor >= 0)) &&
    Number.isInteger(o.quantity_available) &&
    o.quantity_available > 0 &&
    date(o.checked_at) &&
    Date.parse(o.checked_at) <= now + 60000 &&
    date(o.offer_expires_at) &&
    Date.parse(o.offer_expires_at) > now
  );
}
export function validQuote(
  q: CheckoutQuote,
  c: CompanionConnection,
  items: CartItem[],
  currency: string,
  now = Date.now(),
): boolean {
  return (
    !!q &&
    q.subject === c.subject &&
    bounded(q.id, 160) &&
    date(q.expiresAt) &&
    Date.parse(q.expiresAt) > now &&
    q.currency === currency &&
    Number.isSafeInteger(q.totalMinor) &&
    q.totalMinor >= 0 &&
    bounded(q.delivery) &&
    bounded(q.returns) &&
    allowedUrl(q.hostedUrl, c.checkoutOrigins) &&
    Array.isArray(q.lines) &&
    q.lines.length === items.length &&
    items.every(
      (i) =>
        q.lines.filter(
          (l) =>
            l.listingId === i.offer.listing_id &&
            l.variantId === i.offer.variant_id &&
            l.quantity === i.quantity &&
            bounded(l.merchant) &&
            Number.isSafeInteger(l.totalMinor) &&
            l.totalMinor >= 0,
        ).length === 1,
    )
  );
}
export function validReceipt(
  r: OrderReceipt,
  q: CheckoutQuote,
  subject: string,
): boolean {
  return (
    !!r &&
    r.subject === subject &&
    r.quoteId === q.id &&
    bounded(r.id, 160) &&
    ["pending", "paid", "failed", "cancelled"].includes(r.state) &&
    r.currency === q.currency &&
    r.totalMinor === q.totalMinor &&
    Array.isArray(r.merchantOrders) &&
    r.merchantOrders.length > 0 &&
    r.merchantOrders.every(
      (m) => bounded(m.id, 160) && bounded(m.merchant) && bounded(m.state),
    )
  );
}
export function travelProblem(p: TravelPlan): string | null {
  if (!bounded(p.destination, 160) || !/^[A-Z]{2}$/.test(p.country))
    return "Add a destination and a two-letter country code.";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(p.start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(p.end)
  )
    return "Choose arrival and departure dates.";
  const start = Date.parse(p.start),
    end = Date.parse(p.end);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    new Date(start).toISOString().slice(0, 10) !== p.start ||
    new Date(end).toISOString().slice(0, 10) !== p.end ||
    end < start
  )
    return "Departure must be on or after arrival.";
  if ((end - start) / 86400000 > 30) return "Plan up to 31 days at a time.";
  return null;
}
export function validWeather(
  w: WeatherResult,
  p: TravelPlan,
  now = Date.now(),
): boolean {
  if (
    !w ||
    w.destination !== p.destination ||
    w.country !== p.country ||
    w.start !== p.start ||
    w.end !== p.end ||
    !bounded(w.provider) ||
    !bounded(w.timezone) ||
    !date(w.retrievedAt) ||
    Date.parse(w.retrievedAt) > now + 60000 ||
    !date(w.expiresAt) ||
    Date.parse(w.expiresAt) <= now
  )
    return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: w.timezone });
  } catch {
    return false;
  }
  const count =
    Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86400000) + 1;
  return (
    Array.isArray(w.days) &&
    w.days.length === count &&
    new Set(w.days.map((d) => d.date)).size === count &&
    w.days.every(
      (d) =>
        d.date >= p.start &&
        d.date <= p.end &&
        date(d.date) &&
        ["forecast", "seasonal_estimate", "unavailable"].includes(d.status) &&
        bounded(d.note) &&
        [d.lowC, d.highC].every(
          (v) => v === null || (Number.isFinite(v) && v >= -100 && v <= 70),
        ) &&
        (d.rainChance === null ||
          (Number.isFinite(d.rainChance) &&
            d.rainChance >= 0 &&
            d.rainChance <= 100)) &&
        (d.lowC === null || d.highC === null || d.lowC <= d.highC) &&
        (d.status !== "unavailable" ||
          [d.lowC, d.highC, d.rainChance].every((v) => v === null)),
    )
  );
}
