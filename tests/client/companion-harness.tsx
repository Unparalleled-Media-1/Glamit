/** TEST DOUBLE ONLY. Never imported by Next, Expo or the distributed preview. */
import React from "react";
import { createRoot } from "react-dom/client";
import GlamApp from "../../apps/web/components/GlamApp";
import { featureKeys } from "../../packages/product/companion";
import type {
  CompanionConnection,
  VerifiedOffer,
} from "../../packages/product/companion";
import "../../apps/web/app/styles.css";
import "../../apps/web/app/golden-tokens.css";
import "../../apps/web/app/golden-screens.css";
import "../../apps/web/app/personal-results.css";
declare global {
  interface Window {
    testFixture: { mode: string; trace: { kind: string; request: unknown }[] };
  }
}
window.testFixture = { mode: "ok", trace: [] };
const expires = () => new Date(Date.now() + 600000).toISOString();
const offer = (): VerifiedOffer => ({
  listing_id: "test-listing",
  title: "TEST ONLY lipstick",
  category: "cosmetics",
  merchant: "TEST ONLY merchant",
  currency: "ZAR",
  price_minor: 1000,
  delivered_total_minor: 1200,
  source: "reviewed_merchant_assertion",
  match_type: "Similar",
  offer_expires_at: expires(),
  purchase_url: "https://fixture.invalid/merchant",
  service_quote_required: false,
  revision: 1,
  condition: "new",
  variant_id: "test-rose",
  quantity_available: 2,
  country: "ZA",
  city: "Cape Town",
  checked_at: new Date().toISOString(),
});
const trace = (kind: string, request: unknown) =>
  window.testFixture.trace.push({ kind, request });
const connection: CompanionConnection = {
  subject: "test-owner",
  imageOrigins: ["https://fixture.invalid"],
  checkoutOrigins: ["https://fixture.invalid"],
  async analyze(request) {
    trace("analysis", request);
    await new Promise((r) => setTimeout(r, 200));
    return {
      id: "test-analysis",
      subject:
        window.testFixture.mode === "wrong-owner"
          ? "other-owner"
          : "test-owner",
      photoRevision: request.photoRevision,
      completedAt: new Date().toISOString(),
      provider: "TEST DOUBLE — NOT LIVE",
      model: "test-model",
      findings: featureKeys.map((key) => ({
        key,
        estimate: key === "face-shape" ? "TEST oval" : null,
        certainty: key === "face-shape" ? "tentative" : "unavailable",
        uncertainty: "TEST ONLY: light and angle limit this observation.",
      })),
      directions: [
        {
          id: "test-look",
          title: "TEST rose look",
          tool: "Makeup Match",
          style: "Natural",
          rationale:
            "TEST ONLY: a suggested concept, not measured compatibility.",
        },
      ],
    };
  },
  async tryOn(request) {
    trace("preview", request);
    await new Promise((r) => setTimeout(r, 500));
    return {
      id: "test-preview",
      subject: "test-owner",
      photoRevision: request.photoRevision,
      analysisId: request.analysisId,
      correctionRevision: request.correctionRevision,
      directionId: request.direction.id,
      imageUrl: "https://fixture.invalid/preview.webp",
      expiresAt: expires(),
      provider: "TEST DOUBLE — unchanged fixture image",
    };
  },
  async matches(request) {
    trace("matches", request);
    return {
      message: "TEST ONLY",
      organic: [offer()],
      sponsored: [
        {
          ...offer(),
          listing_id: "test-sponsored",
          title: "TEST ONLY sponsored lipstick",
        },
      ],
    };
  },
  async offer(id, request) {
    trace("offer", request);
    return { ...offer(), listing_id: id };
  },
  async quote(items, destination) {
    trace("quote", { items, destination });
    return {
      id: "test-quote",
      subject: "test-owner",
      expiresAt: expires(),
      currency: "ZAR",
      totalMinor: 1200,
      lines: items.map((i) => ({
        ...i,
        merchant: "TEST ONLY merchant",
        totalMinor: 1200,
      })),
      delivery: "TEST ONLY delivery quote",
      returns: "TEST ONLY return policy",
      hostedUrl: "https://fixture.invalid/checkout",
    };
  },
  async order(quoteId) {
    trace("order", { quoteId });
    return {
      id: "test-order",
      subject: "test-owner",
      quoteId,
      state: window.testFixture.mode === "paid" ? "paid" : "pending",
      currency: "ZAR",
      totalMinor: 1200,
      merchantOrders: [
        {
          id: "test-merchant-order",
          merchant: "TEST ONLY merchant",
          state: "test-pending",
        },
      ],
    };
  },
};
createRoot(document.getElementById("root")!).render(
  <>
    <div role="note" style={{ padding: 12, background: "#fff", color: "#000" }}>
      TEST HARNESS / ALL PROVIDER AND COMMERCE RESPONSES ARE TEST DOUBLES / NOT
      OPERATIONAL
    </div>
    <GlamApp connection={connection} />
  </>,
);
