"use client";
import type { Page } from "../../../packages/product/platform";
import type { CompanionConnection } from "../../../packages/product/companion";
import type { MarketplaceState } from "../../../packages/product/use-marketplace";
import { displayMinor } from "../../../packages/product/catalog";
export default function MarketplaceJourney({
  page,
  market,
  connection,
  go,
}: {
  page: Page;
  market: MarketplaceState;
  connection?: CompanionConnection;
  go: (p: Page) => void;
}) {
  const m = market,
    q = m.quote,
    r = m.receipt;
  return (
    <div className="commerce-checkpoint">
      <p className="golden-overline">YOUR LOOK, IN THE REAL WORLD</p>
      <h1>
        {page === "cart"
          ? "Your considered collection."
          : page === "checkout"
            ? "The final details."
            : r?.state === "paid"
              ? "Your order is confirmed."
              : "Your order status."}
      </h1>
      <nav className="checkout-steps" aria-label="Purchase journey">
        <button className="text-button" onClick={() => go("cart")}>
          01 / Cart
        </button>
        <button className="text-button" onClick={() => go("checkout")}>
          02 / Checkout
        </button>
        <button className="text-button" onClick={() => go("orders")}>
          03 / Order status
        </button>
      </nav>
      {m.message && <p role="alert">{m.message}</p>}
      {m.busy && (
        <div role="status">
          <p>Verifying with the connected service…</p>
          <button className="text-button" onClick={m.cancel}>
            Cancel request
          </button>
        </div>
      )}
      {page === "cart" ? (
        <>
          {m.review && (
            <section className="panel">
              <span className="badge">Fresh merchant offer</span>
              <h2>{m.review.title}</h2>
              <p>
                {m.review.merchant} · Variant {m.review.variant_id}
              </p>
              <p>
                {m.review.quantity_available} available in the verified
                assertion · Country {m.review.country}
              </p>
              <p>
                Item price{" "}
                {displayMinor(m.review.price_minor, m.review.currency)}
                <br />
                {m.review.delivered_total_minor === null
                  ? "Delivery, tax and total unconfirmed"
                  : "Delivered total " +
                    displayMinor(
                      m.review.delivered_total_minor,
                      m.review.currency,
                    )}
              </p>
              <p>
                Source expires{" "}
                {new Date(m.review.offer_expires_at).toLocaleString()}.
                Availability and price are rechecked during checkout.
              </p>
              <button className="button" onClick={m.add}>
                Add verified variant to cart
              </button>
            </section>
          )}
          <section className="panel">
            <h2>
              {m.items.length ? "Selected items" : "Your cart is waiting."}
            </h2>
            {m.items.map((i) => (
              <article key={i.offer.listing_id + ":" + i.offer.variant_id}>
                <h3>{i.offer.title}</h3>
                <p>
                  {i.offer.merchant} · {i.offer.variant_id} · Quantity{" "}
                  {i.quantity}
                </p>
                <p>
                  {displayMinor(i.offer.price_minor, i.offer.currency)} per item
                  · Final total requires a fresh server quote
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    m.remove(i.offer.listing_id, i.offer.variant_id)
                  }
                >
                  Remove {i.offer.title}
                </button>
              </article>
            ))}
            {!m.items.length && (
              <p>
                Only verified merchant variants can be added. Editorial product
                studies are not purchasable.
              </p>
            )}
            <button
              className="button"
              disabled={!m.items.length || !connection?.quote || m.busy}
              onClick={async () => {
                await m.request("quote");
                go("checkout");
              }}
            >
              Request checkout quote
            </button>
            <button className="button secondary" onClick={() => go("complete")}>
              Find products & professionals
            </button>
          </section>
        </>
      ) : page === "checkout" ? (
        <section className="panel">
          <h2>
            {q ? "Review your server quote" : "A verified quote comes first."}
          </h2>
          {q ? (
            <>
              <p>
                Quote {q.id} · expires {new Date(q.expiresAt).toLocaleString()}
              </p>
              {q.lines.map((l) => (
                <p key={l.listingId + ":" + l.variantId}>
                  {l.merchant} · {l.variantId} · Quantity {l.quantity} ·{" "}
                  {displayMinor(l.totalMinor, q.currency)}
                </p>
              ))}
              <h3>Total {displayMinor(q.totalMinor, q.currency)}</h3>
              <p>{q.delivery}</p>
              <p>{q.returns}</p>
              <button
                className="button"
                onClick={() => {
                  if (Date.parse(q.expiresAt) > Date.now())
                    window.location.assign(q.hostedUrl);
                }}
              >
                Continue to secure checkout
              </button>
            </>
          ) : (
            <>
              <p>
                Stock, merchant identity, variants, delivery, returns and the
                full cost must be confirmed before payment. No payment details
                are collected here.
              </p>
              <button className="button" disabled>
                Checkout connection required
              </button>
            </>
          )}
          <p className="fine">
            The existing 10% commission policy for eligible item sales stays on
            the server. No new buyer surcharge or service commission is
            calculated here.
          </p>
        </section>
      ) : (
        <section className="panel">
          {r ? (
            <>
              <span className="badge">
                {r.state === "paid"
                  ? "Payment confirmed by order service"
                  : r.state === "pending"
                    ? "Payment pending"
                    : r.state === "failed"
                      ? "Payment failed"
                      : "Order cancelled"}
              </span>
              <h2>Order {r.id}</h2>
              <p>{displayMinor(r.totalMinor, r.currency)}</p>
              {r.merchantOrders.map((o) => (
                <p key={o.id}>
                  {o.merchant} · {o.id} · {o.state}
                </p>
              ))}
            </>
          ) : (
            <>
              <h2>No order is confirmed.</h2>
              <p>
                Returning from checkout, clicking a button or opening this page
                does not prove payment. Confirmation requires a verified
                order-service response.
              </p>
            </>
          )}
          <button
            className="button"
            disabled={!connection?.order || !m.canCheckOrder || m.busy}
            onClick={() => m.request("order")}
          >
            Check verified order status
          </button>
        </section>
      )}
      <button className="text-button" onClick={() => go("shop")}>
        Back to the beauty edit
      </button>
    </div>
  );
}
