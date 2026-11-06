"use client";
import VerifiedMatches from "./VerifiedMatches";
import type {
  RecommendationResult,
  RecommendationMatch,
} from "../../../packages/product/catalog";
import { useState, useRef, useEffect } from "react";
import type { CompanionConnection } from "../../../packages/product/companion";
import {
  analysisContexts,
  categories,
  requirementProblem,
} from "../../../packages/product/catalog";
import type {
  AnalysisContext,
  RequirementDraft,
} from "../../../packages/product/catalog";
export default function ContextualRecommendations({
  context,
  saved,
  onSave,
  onDelete,
  onComplete,
  results,
  onReview,
  connection,
  location,
  onLocation,
}: {
  context: AnalysisContext;
  saved: RequirementDraft[];
  onSave: (r: RequirementDraft) => void;
  onDelete: (id: string) => void;
  onComplete: () => void;
  results?: RecommendationResult;
  onReview?: (
    match: RecommendationMatch,
    requirement: RequirementDraft,
  ) => void;
  connection?: CompanionConnection;
  location?: { country: string; city: string; currency: string };
  onLocation?: (location: {
    country: string;
    city: string;
    currency: string;
  }) => void;
}) {
  const config = analysisContexts.find((n) => n.id === context)!;
  const [tags, setTags] = useState("");
  const [country, setCountry] = useState(location?.country || "");
  const [city, setCity] = useState(location?.city || "");
  const [currency, setCurrency] = useState(location?.currency || "ZAR");
  const [category, setCategory] = useState<string>(config.category);
  const [message, setMessage] = useState("");
  const [received, setReceived] = useState<RecommendationResult | undefined>(
    undefined,
  );
  const [requested, setRequested] = useState<RequirementDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0),
    abort = useRef<AbortController | null>(null);
  useEffect(() => {
    sequence.current++;
    abort.current?.abort();
    setReceived(undefined);
    setRequested(null);
    setBusy(false);
    return () => {
      sequence.current++;
      abort.current?.abort();
    };
  }, [tags, country, city, currency, category, connection]);
  const shown = received || results;
  async function search() {
    const values = tags
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean),
      issue = requirementProblem(values, country);
    if (issue) {
      setMessage(issue);
      return;
    }
    if (!connection?.matches) {
      setMessage(
        "Catalog matching is not connected. No local availability is confirmed.",
      );
      return;
    }
    onLocation?.({ country, city, currency });
    const id = ++sequence.current,
      controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage("");
    const request = {
      id: crypto.randomUUID(),
      context,
      category,
      tags: values,
      country,
      currency,
      city,
    };
    try {
      const response = await connection.matches(request, controller.signal);
      if (sequence.current !== id) return;
      if (
        !Array.isArray(response.organic) ||
        !Array.isArray(response.sponsored)
      )
        throw Error();
      setRequested(request);
      setReceived(response);
    } catch {
      if (sequence.current === id)
        setMessage(
          "Matching could not be verified. No price, inventory or booking is confirmed.",
        );
    } finally {
      if (sequence.current === id) setBusy(false);
    }
  }

  function save() {
    const values = tags
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const issue = requirementProblem(values, country);
    if (issue) {
      setMessage(issue);
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      context,
      category,
      tags: values,
      country,
      currency,
    });
    setMessage(
      "Requirement saved for this session. No listing was invented and no availability notification was scheduled.",
    );
  }
  return (
    <section
      className="contextual-commerce"
      aria-label={config.title + " contextual recommendations"}
    >
      <header>
        <p className="eyebrow">From useful guidance to real possibilities</p>
        <h2>Personalized Recommendations</h2>
        <p>
          No personalized recommendation has been computed yet. When available,
          each suggestion will become a structured product or professional
          requirement. You can prepare your own requirement below.
        </p>
      </header>
      <div className="contextual-grid">
        <section className="panel">
          <h3>Your chosen requirements</h3>
          <label>
            Product or service category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Style requirements (comma-separated tags)
            <input
              value={tags}
              maxLength={500}
              onChange={(e) => setTags(e.target.value)}
              placeholder="braids, protective-style"
            />
          </label>
          <div className="form-grid">
            <label>
              Delivery country code
              <input
                value={country}
                maxLength={2}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="ZA"
              />
            </label>
            <label>
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {["ZAR", "USD", "EUR", "GBP"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Shopping city (optional)
            <input
              value={city}
              maxLength={160}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <button className="button" disabled={busy} onClick={search}>
            {busy ? "Finding verified matches…" : "Find verified local matches"}
          </button>
          <p className="fine">
            Only your explicit product requirements and chosen shopping location
            are used. No photo, analysis report or sensitive preference enters
            this request. City-level coverage must be qualified by the catalog
            adapter.
          </p>
          <button className="button" onClick={save}>
            Save recommendation requirements
          </button>
          {message && <p role="status">{message}</p>}
          <p className="fine">
            Explicit choices only. No private facial data is shared with
            advertisers.
          </p>
        </section>
        <section>
          <h2>Where to Buy / Book</h2>
          <div className="panel">
            <span className="badge">Best Matches · Organic</span>
            {shown?.organic.length ? (
              <VerifiedMatches
                matches={shown.organic}
                onReview={
                  requested && onReview
                    ? (match) => onReview(match, requested)
                    : undefined
                }
              />
            ) : (
              <h3>No verified matching listings currently available.</h3>
            )}
            <p>
              {shown
                ? "Source assertions and final availability require fresh revalidation before handoff."
                : "A live catalog is not connected. Merchant names, variant suitability, fresh prices, stock, delivery and service availability will appear only when verified."}
            </p>
            <p className="fine">
              Visual resemblance is Similar. Exact requires verified
              product/source identifier evidence. Services need feasibility and
              a full quote before a booking.
            </p>
          </div>
          <div className="panel sponsored-panel">
            <span className="badge">Sponsored Matches</span>
            {shown?.sponsored.length ? (
              <VerifiedMatches
                matches={shown.sponsored}
                sponsored
                onReview={
                  requested && onReview
                    ? (match) => onReview(match, requested)
                    : undefined
                }
              />
            ) : (
              <h3>No qualified sponsored placements.</h3>
            )}
            <p>
              {shown?.sponsored.length
                ? "Paid placements must pass the same eligibility and suitability checks as organic offers."
                : "Suppressed until eligibility, consent and advertising delivery are qualified."}{" "}
              Payment never changes your analysis or makes an unsuitable product
              a match.
            </p>
          </div>
          <button className="button secondary" disabled>
            Availability notifications — connection required
          </button>
          <button className="button" onClick={onComplete}>
            Complete the Look
          </button>
        </section>
      </div>
      {saved.filter((n) => n.context === context).length > 0 && (
        <section className="panel">
          <h3>Saved session requirements</h3>
          {saved
            .filter((n) => n.context === context)
            .map((n) => (
              <div className="saved-requirement" key={n.id}>
                <p>
                  <strong>{n.category}</strong> · {n.tags.join(", ")} ·{" "}
                  {n.country} / {n.currency}
                </p>
                <button className="text-button" onClick={() => onDelete(n.id)}>
                  Delete saved requirement
                </button>
              </div>
            ))}
        </section>
      )}
    </section>
  );
}
