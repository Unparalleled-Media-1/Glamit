"use client";
import { useCallback, useEffect, useState } from "react";

export type QueueItem = {
  id: string;
  organization_id: string;
  current_revision: number;
  facts: {
    title: string;
    category: string;
    description: string;
    currency: string;
    price_minor: number;
    countries: string[];
    source_sku: string;
    source_ref: string;
    condition: string;
    purchase_url: string;
  };
};

export function parseQueue(value: unknown): QueueItem[] {
  if (!Array.isArray(value)) throw Error("INVALID_QUEUE");
  return value.map((v) => {
    const f = v?.facts;
    if (
      typeof v?.id !== "string" ||
      typeof v?.organization_id !== "string" ||
      !Number.isInteger(v?.current_revision) ||
      !f ||
      ["title", "category", "currency", "source_sku", "source_ref", "condition", "purchase_url"].some(
        (k) => typeof f[k] !== "string",
      ) ||
      typeof f.description !== "string" ||
      !Number.isInteger(f.price_minor) ||
      !Array.isArray(f.countries)
    )
      throw Error("INVALID_QUEUE");
    return v as QueueItem;
  });
}

export function reviewRequest(
  apiOrigin: string,
  token: string,
  item: Pick<QueueItem, "id" | "current_revision">,
  decision: "approved" | "rejected",
  identifierVerified: boolean,
  key: string,
) {
  return {
    url: `${apiOrigin}/v1/admin/catalog/${encodeURIComponent(item.id)}/revisions/${item.current_revision}/review`,
    init: {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify({ decision, identifier_verified: identifierVerified }),
      cache: "no-store" as const,
      credentials: "omit" as const,
      redirect: "error" as const,
    },
  };
}

const money = (currency: string, minor: number) =>
  `${currency} ${(minor / 100).toFixed(2)}`;

export default function CatalogReviewPanel({
  apiOrigin,
  token,
}: {
  apiOrigin: string;
  token: string;
}) {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<{
    id: string;
    decision: "approved" | "rejected";
  } | null>(null);
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setError("");
      fetch(`${apiOrigin}/v1/admin/catalog/review-queue`, {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      })
        .then(async (response) => {
          if (response.status === 401 || response.status === 403)
            throw Error("DENIED");
          if (!response.ok) throw Error("FAILED");
          setItems(parseQueue(await response.json()));
        })
        .catch((e: Error) => {
          if (signal?.aborted) return;
          setItems(null);
          setError(
            e.message === "DENIED"
              ? "You are not permitted to review the catalog, or your multi-factor verification has expired (it must be within the last 5 minutes). Sign in again to retry."
              : "The review queue could not be loaded. Nothing has been changed.",
          );
        });
    },
    [apiOrigin, token],
  );
  useEffect(() => {
    const abort = new AbortController();
    setItems(null);
    load(abort.signal);
    return () => abort.abort();
  }, [load]);

  async function decide(item: QueueItem, decision: "approved" | "rejected") {
    setBusy(true);
    setMessage("");
    const { url, init } = reviewRequest(
      apiOrigin,
      token,
      item,
      decision,
      Boolean(verified[item.id]),
      crypto.randomUUID(),
    );
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        setItems((current) => (current || []).filter((x) => x.id !== item.id));
        setMessage(
          `Listing ${item.id.slice(0, 8)} ${decision}. The decision is permanent and recorded with your identity.`,
        );
      } else if (response.status === 409) {
        setMessage(
          "That listing changed or was already decided by someone else. The queue has been refreshed; review the current version.",
        );
        load();
      } else if (response.status === 403) {
        setMessage(
          "Not permitted. You cannot review listings of an organization you belong to, and your multi-factor verification must be recent.",
        );
      } else {
        setMessage("The decision could not be recorded. Nothing was changed.");
      }
    } catch {
      setMessage("The decision could not be recorded. Nothing was changed.");
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  if (error)
    return (
      <div role="alert" className="notice">
        {error}
      </div>
    );
  if (!items)
    return (
      <div role="status" className="notice">
        Loading the review queue…
      </div>
    );
  return (
    <section className="panel" aria-label="Catalog review queue">
      <h2>Catalog review queue</h2>
      <p className="fine">
        Listings the merchant has factually reviewed and that await your decision. Approval is
        permanent for that revision; a rejected listing needs a new merchant revision. You never see
        listings from organizations you belong to.
      </p>
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
      {items.length === 0 ? (
        <p>No listings are waiting for review.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id} data-testid="review-item">
              <div>
                <strong>{item.facts.title}</strong>
                <p className="fine">
                  {item.facts.category} · {item.facts.condition} ·{" "}
                  {money(item.facts.currency, item.facts.price_minor)} ·{" "}
                  {item.facts.countries.join(", ")}
                </p>
                <p className="fine">
                  SKU {item.facts.source_sku} · evidence: {item.facts.source_ref} · destination:{" "}
                  {item.facts.purchase_url}
                </p>
                {item.facts.description && <p>{item.facts.description}</p>}
                <p className="fine">
                  Listing {item.id.slice(0, 8)} · organization {item.organization_id.slice(0, 8)} ·
                  revision {item.current_revision}
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(verified[item.id])}
                    onChange={(e) =>
                      setVerified({ ...verified, [item.id]: e.target.checked })
                    }
                  />{" "}
                  I checked the product identifier against the supplied evidence
                </label>
              </div>
              {pending?.id === item.id ? (
                <div>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => void decide(item, pending.decision)}
                  >
                    Confirm {pending.decision === "approved" ? "approval" : "rejection"}
                  </button>{" "}
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setPending(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setPending({ id: item.id, decision: "approved" })}
                  >
                    Approve
                  </button>{" "}
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setPending({ id: item.id, decision: "rejected" })}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
