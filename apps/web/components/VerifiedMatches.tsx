"use client";
import { displayMinor } from "../../../packages/product/catalog";
import type { RecommendationMatch } from "../../../packages/product/catalog";
/** Only render canonical qualified responses; handoff requires a fresh server revalidation callback. */
export default function VerifiedMatches({
  matches,
  sponsored = false,
  onReview,
}: {
  matches: RecommendationMatch[];
  sponsored?: boolean;
  onReview?: (match: RecommendationMatch) => void;
}) {
  const fresh = matches.filter(
    (m) => Date.parse(m.offer_expires_at) > Date.now(),
  );
  if (!fresh.length)
    return (
      <p role="status">
        These offers are no longer current. Refresh matching before continuing.
      </p>
    );
  return (
    <div className="verified-matches">
      {fresh.map((m) => (
        <article className="verified-match" key={m.listing_id}>
          <div>
            <span className="badge">
              {sponsored ? "Sponsored" : m.match_type + " · Organic"}
            </span>
            <h3>{m.title}</h3>
            <p>
              {m.merchant}
              {m.condition ? ` · ${m.condition}` : ""}
            </p>
            <p>
              <strong>
                {m.service_quote_required
                  ? "Indicative service price"
                  : "Item price"}
                : {displayMinor(m.price_minor, m.currency)}
              </strong>
              <br />
              {m.delivered_total_minor === null
                ? "Full delivered / service total unconfirmed"
                : "Delivered total: " +
                  displayMinor(m.delivered_total_minor, m.currency)}
            </p>
            <p className="fine">
              Reviewed merchant assertion · Source expires{" "}
              {new Date(m.offer_expires_at).toLocaleString()}.{" "}
              {m.service_quote_required
                ? "Feasibility and an accepted full quote are required; no appointment is confirmed."
                : "Price and availability must be rechecked before external handoff."}
            </p>
          </div>
          <button
            className="button secondary"
            disabled={!onReview}
            onClick={() => onReview?.(m)}
          >
            {m.service_quote_required
              ? "Review professional quote request"
              : "Review merchant handoff"}
          </button>
        </article>
      ))}
    </div>
  );
}
