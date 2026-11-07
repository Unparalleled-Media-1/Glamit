"use client";
import type { MarketplaceState } from "../../../packages/product/use-marketplace";
import type { Page } from "../../../packages/product/platform";
import { displayMinor } from "../../../packages/product/catalog";
/** Verified data uses the approved light detail layout; editorial studies never become offers. */
export default function VerifiedProductDetail({
  market: m,
  go,
}: {
  market: MarketplaceState;
  go: (p: Page) => void;
}) {
  const o = m.review;
  return (
    <div className="golden-commerce">
      <div className="golden-product-topline">
        <button className="golden-text-button" onClick={() => go("complete")}>
          Back to my matches
        </button>
        <span>VERIFIED OFFER REVIEW</span>
      </div>
      {m.busy && <p role="status">Revalidating the merchant offer…</p>}
      {m.message && <p role="alert">{m.message}</p>}
      {o ? (
        <div className="golden-detail-layout">
          <section className="golden-detail-visual">
            <div className="verified-product-image-pending">
              <p className="golden-overline">{o.merchant}</p>
              <h2>Details, with evidence.</h2>
              <p>
                No qualified product image was supplied. Your photo and
                editorial studies are not substituted for this item.
              </p>
              <span className="badge">{o.match_type} match</span>
            </div>
          </section>
          <section className="golden-detail-copy">
            <p className="golden-overline">
              {o.category} / {o.merchant}
            </p>
            <h1>{o.title}</h1>
            <div className="golden-price-status">
              <strong>{displayMinor(o.price_minor, o.currency)}</strong>
              <span>
                Reviewed merchant assertion ·{" "}
                {o.condition || "Condition not supplied"}
              </span>
            </div>
            <h2>Your verified variant</h2>
            <p>
              {o.variant_id} · {o.quantity_available} available in the current
              assertion.
            </p>
            <p>
              {o.country}
              {o.city ? " / " + o.city : ""}. Source checked{" "}
              {new Date(o.checked_at).toLocaleString()} and expires{" "}
              {new Date(o.offer_expires_at).toLocaleString()}.
            </p>
            <p>
              {o.delivered_total_minor === null
                ? "Full delivery, tax and total remain unconfirmed."
                : "Delivered total in current assertion: " +
                  displayMinor(o.delivered_total_minor, o.currency)}{" "}
              Checkout requires a fresh server quote.
            </p>
            <div className="golden-product-actions">
              <button
                className="golden-dark-button"
                onClick={() => {
                  m.add();
                  go("cart");
                }}
              >
                Add verified variant to cart
              </button>
              <button
                className="golden-outline-button"
                onClick={() => go("studio")}
              >
                Return to my Studio
              </button>
            </div>
            <details className="golden-product-disclosure">
              <summary>Delivery, fit & returns</summary>
              <p>
                Final delivery and returns terms must be supplied by the server
                quote before checkout. Visual similarity and a virtual preview
                do not guarantee fit or exact product identity.
              </p>
            </details>
            <details className="golden-product-disclosure">
              <summary>Merchant & commission</summary>
              <p>
                {o.merchant} is the merchant named in the current reviewed
                assertion. The existing 10% eligible marketplace item-sale
                commission remains server-side. No extra buyer fee or service
                commission is calculated here.
              </p>
            </details>
          </section>
        </div>
      ) : (
        !m.busy && (
          <section className="panel">
            <h1>No verified product selected.</h1>
            <p>
              Choose a current product match to revalidate merchant, variant,
              stock and destination before adding it to your cart.
            </p>
            <button className="button" onClick={() => go("complete")}>
              Find products & professionals
            </button>
          </section>
        )
      )}
    </div>
  );
}
