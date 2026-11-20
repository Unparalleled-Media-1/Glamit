"use client";
import { useCallback, useEffect, useState } from "react";

export type Facts = {
  title: string;
  description: string;
  category: string;
  tags: string[];
  source_sku: string;
  source_ref: string;
  currency: string;
  price_minor: number;
  stock_quantity: number;
  accepting_requests: boolean;
  countries: string[];
  offer_expires_at: string;
  purchase_url: string;
  condition: string;
  shipping_minor?: number | null;
  tax_minor?: number | null;
  other_costs_minor?: number | null;
};
export type Listing = {
  id: string;
  organization_id: string;
  current_revision: number;
  published_revision: number | null;
  state: string;
  facts: Facts;
  merchant_reviewed: boolean;
  decision: string | null;
};

export function parseListings(value: unknown): Listing[] {
  if (!Array.isArray(value)) throw Error("INVALID_LISTINGS");
  return value.map((v) => {
    const f = v?.facts;
    if (
      typeof v?.id !== "string" ||
      typeof v?.state !== "string" ||
      !Number.isInteger(v?.current_revision) ||
      typeof v?.merchant_reviewed !== "boolean" ||
      !f ||
      typeof f.title !== "string" ||
      typeof f.source_sku !== "string" ||
      typeof f.currency !== "string" ||
      !Number.isInteger(f.price_minor) ||
      !Number.isInteger(f.stock_quantity)
    )
      throw Error("INVALID_LISTINGS");
    return v as Listing;
  });
}

export function statusOf(
  l: Pick<
    Listing,
    | "state"
    | "decision"
    | "merchant_reviewed"
    | "published_revision"
    | "current_revision"
  >,
) {
  if (l.state === "withdrawn") return "Withdrawn";
  if (l.published_revision === l.current_revision) return "Live";
  if (l.decision === "rejected") return "Rejected: revise and resubmit";
  if (l.decision === "approved") return "Approved: ready to publish";
  if (l.merchant_reviewed) return "Awaiting content review";
  return "Draft: confirm your review";
}

export function priceToMinor(text: string): number | null {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text.trim())) return null;
  const minor = Math.round(Number(text) * 100);
  return minor > 0 ? minor : null;
}

export function buildFacts(
  f: Record<string, string>,
  base?: Facts,
): Facts | string {
  const price = priceToMinor(f.price || "");
  if (price === null)
    return "Enter a price greater than zero, with at most two decimals.";
  if (!/^\d{1,9}$/.test(f.stock || ""))
    return "Stock must be a whole number, 0 or more.";
  const expires = new Date(f.expires || "");
  if (Number.isNaN(expires.getTime()))
    return "Enter when the source offer expires.";
  const tags = (f.tags || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const countries = (f.countries || "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  if (!f.title?.trim() || !f.sku?.trim() || !f.ref?.trim())
    return "Title, SKU and source evidence are required.";
  if (!tags.length || !countries.length)
    return "Add at least one tag and one country code.";
  return {
    ...(base || {}),
    title: f.title.trim(),
    description: f.description || "",
    category: f.category,
    tags,
    source_sku: f.sku.trim(),
    source_ref: f.ref.trim(),
    currency: f.currency,
    price_minor: price,
    stock_quantity: Number(f.stock),
    accepting_requests: base?.accepting_requests ?? false,
    countries,
    offer_expires_at: expires.toISOString(),
    purchase_url: f.url,
    condition: f.condition,
  } as Facts;
}

export function uploadRequest(
  apiOrigin: string,
  token: string,
  base: string,
  listingId: string,
  file: { type: string; size: number },
) {
  return {
    url: `${apiOrigin}${base}/listings/${encodeURIComponent(listingId)}/original-images`,
    init: {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": file.type,
        "X-Rights-Confirmed": "true",
      },
      cache: "no-store" as const,
      credentials: "omit" as const,
      redirect: "error" as const,
    },
  };
}

export function imageProblem(file: { type: string; size: number }): string {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Use a JPEG, PNG or WebP image.";
  if (file.size > 10 * 1024 * 1024)
    return "The image must be 10 MB or smaller.";
  return "";
}

export function request(
  apiOrigin: string,
  token: string,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  key?: string,
) {
  return {
    url: apiOrigin + path,
    init: {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store" as const,
      credentials: "omit" as const,
      redirect: "error" as const,
    },
  };
}

const CATEGORIES = [
  "cosmetics",
  "hair",
  "skincare",
  "clothing",
  "footwear",
  "accessories",
  "tool",
];
const money = (c: string, m: number) => `${c} ${(m / 100).toFixed(2)}`;
const localInput = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
};
const initial = (b?: Facts): Record<string, string> => ({
  title: b?.title || "",
  description: b?.description || "",
  category: b?.category || "skincare",
  tags: b?.tags.join(", ") || "",
  sku: b?.source_sku || "",
  ref: b?.source_ref || "",
  currency: b?.currency || "ZAR",
  price: b ? (b.price_minor / 100).toFixed(2) : "",
  stock: b ? String(b.stock_quantity) : "0",
  countries: b?.countries.join(", ") || "ZA",
  expires: b ? localInput(b.offer_expires_at) : "",
  url: b?.purchase_url || "https://",
  condition: b?.condition || "new",
});

function FactsForm({
  base,
  busy,
  submitLabel,
  confirmLabel,
  onSubmit,
  onCancel,
}: {
  base?: Facts;
  busy: boolean;
  submitLabel: string;
  confirmLabel?: string;
  onSubmit: (facts: Facts) => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState(initial(base));
  const [reviewed, setReviewed] = useState(!confirmLabel);
  const [problem, setProblem] = useState("");
  const set = (k: string) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const input = (k: string, label: string, type = "text", disabled = false) => (
    <label>
      {label}
      <input
        value={f[k]}
        onChange={set(k)}
        type={type}
        disabled={disabled || busy}
      />
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const built = buildFacts(f, base);
        if (typeof built === "string") return setProblem(built);
        setProblem("");
        onSubmit(built);
      }}
    >
      {input("title", "Product name")}
      {input("sku", "Source SKU", "text", Boolean(base))}
      {input("ref", "Source evidence (invoice, supplier reference)")}
      <label>
        Category
        <select
          value={f.category}
          onChange={set("category")}
          disabled={busy || Boolean(base)}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {input("tags", "Tags (comma separated)")}
      <label>
        Currency
        <select value={f.currency} onChange={set("currency")} disabled={busy}>
          {["ZAR", "USD", "EUR", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {input("price", "Price")}
      {input("stock", "Stock on hand")}
      {input("countries", "Sold in (country codes)")}
      {input("expires", "Source offer valid until", "datetime-local")}
      {input("url", "Purchase page (https)", "url")}
      <label>
        Description
        <textarea
          value={f.description}
          onChange={set("description")}
          disabled={busy}
          maxLength={3000}
        />
      </label>
      {confirmLabel && (
        <label>
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />{" "}
          {confirmLabel}
        </label>
      )}
      {problem && (
        <div role="alert" className="notice">
          {problem}
        </div>
      )}
      <button className="button" disabled={busy || !reviewed}>
        {submitLabel}
      </button>
      {onCancel && (
        <>
          {" "}
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        </>
      )}
    </form>
  );
}

function ListingImages({
  apiOrigin,
  token,
  base,
  listingId,
  canWrite,
}: {
  apiOrigin: string;
  token: string;
  base: string;
  listingId: string;
  canWrite: boolean;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const load = useCallback(() => {
    const { url, init } = request(
      apiOrigin,
      token,
      `${base}/listings/${encodeURIComponent(listingId)}/original-images`,
      "GET",
    );
    fetch(url, init)
      .then(async (r) => {
        const j = r.ok ? await r.json() : null;
        setCount(Array.isArray(j) ? j.length : null);
      })
      .catch(() => setCount(null));
  }, [apiOrigin, token, base, listingId]);
  useEffect(load, [load]);
  async function choose(file: File | undefined) {
    if (!file) return;
    const problem = imageProblem(file);
    if (problem) return setNote(problem);
    setBusy(true);
    setNote("");
    const { url, init } = uploadRequest(
      apiOrigin,
      token,
      base,
      listingId,
      file,
    );
    try {
      const r = await fetch(url, { ...init, body: file });
      if (r.ok) {
        setNote("Image added. It was re-encoded and stripped of metadata.");
        load();
      } else if (r.status === 503) {
        setNote("Image storage is not available yet. Nothing was uploaded.");
      } else {
        let detail = "";
        try {
          const j = await r.json();
          if (typeof j?.detail === "string") detail = j.detail;
        } catch {
          /* no body */
        }
        setNote(`The image was not accepted${detail ? `: ${detail}` : ""}.`);
      }
    } catch {
      setNote("The upload failed. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p className="fine" data-testid="image-count">
        {count === null
          ? "Original images unavailable"
          : `${count} original image${count === 1 ? "" : "s"} (required to publish)`}
      </p>
      {canWrite && (
        <>
          <label>
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
            />{" "}
            I own or am licensed to use this image
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Add original image"
            disabled={busy || !rights}
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      )}
      {note && (
        <div role="status" className="notice">
          {note}
        </div>
      )}
    </div>
  );
}

export default function MerchantListings({
  apiOrigin,
  token,
  organizationId,
  canWrite,
}: {
  apiOrigin: string;
  token: string;
  organizationId: string;
  canWrite: boolean;
}) {
  const base = `/v1/organizations/${encodeURIComponent(organizationId)}/catalog`;
  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) => {
      const { url, init } = request(
        apiOrigin,
        token,
        `${base}/listings`,
        "GET",
      );
      fetch(url, { ...init, signal })
        .then(async (r) => {
          if (r.status === 401 || r.status === 403 || r.status === 404)
            throw Error("DENIED");
          if (!r.ok) throw Error("FAILED");
          setItems(parseListings(await r.json()));
          setError("");
        })
        .catch((e: Error) => {
          if (signal?.aborted) return;
          setItems(null);
          setError(
            e.message === "DENIED"
              ? "Your account cannot view this organization's catalog."
              : "Your products could not be loaded. Nothing was changed.",
          );
        });
    },
    [apiOrigin, token, base],
  );
  useEffect(() => {
    const abort = new AbortController();
    setItems(null);
    load(abort.signal);
    return () => abort.abort();
  }, [load]);

  async function send(
    path: string,
    body?: unknown,
    key?: string,
    success = "Saved.",
  ) {
    setBusy(true);
    setMessage("");
    const { url, init } = request(
      apiOrigin,
      token,
      path,
      "POST",
      body ?? {},
      key,
    );
    try {
      const r = await fetch(url, init);
      if (r.ok) {
        setMessage(success);
        setEditing(null);
        setCreating(false);
        load();
      } else {
        let detail = "";
        try {
          const j = await r.json();
          if (typeof j?.detail === "string") detail = j.detail;
        } catch {
          /* no body */
        }
        setMessage(
          r.status === 409 || r.status === 422
            ? `Not accepted: ${detail || "the listing did not pass validation."} Nothing was changed.`
            : r.status === 403
              ? "Your role cannot make this change."
              : "The change could not be saved. Nothing was changed.",
        );
      }
    } catch {
      setMessage("The change could not be saved. Nothing was changed.");
    } finally {
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
        Loading your products…
      </div>
    );
  return (
    <section className="panel" aria-label="My products">
      <h2>My products</h2>
      <p className="fine">
        Price and stock changes create a new revision. A revision goes live only
        after content review approves it, and every change is recorded.
      </p>
      {!canWrite && (
        <p className="notice">This workspace has read-only access.</p>
      )}
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
      {canWrite && !creating && (
        <button
          className="button"
          disabled={busy}
          onClick={() => setCreating(true)}
        >
          Add a product
        </button>
      )}
      {creating && (
        <FactsForm
          busy={busy}
          submitLabel="Save draft"
          onCancel={() => setCreating(false)}
          onSubmit={(facts) =>
            void send(
              `${base}/listings`,
              { facts },
              crypto.randomUUID(),
              "Draft saved. Confirm your review to submit it.",
            )
          }
        />
      )}
      {items.length === 0 ? (
        <p>You have no products yet.</p>
      ) : (
        <ul className="list">
          {items.map((l) => (
            <li key={l.id} data-testid="listing">
              <div>
                <strong>{l.facts.title}</strong>
                <p className="fine">
                  SKU {l.facts.source_sku} ·{" "}
                  {money(l.facts.currency, l.facts.price_minor)} · stock{" "}
                  {l.facts.stock_quantity} · revision {l.current_revision}
                </p>
                <p data-testid="status">{statusOf(l)}</p>
                <ListingImages
                  apiOrigin={apiOrigin}
                  token={token}
                  base={base}
                  listingId={l.id}
                  canWrite={canWrite}
                />
              </div>
              {canWrite && editing === l.id ? (
                <FactsForm
                  base={l.facts}
                  busy={busy}
                  submitLabel="Submit for review"
                  confirmLabel="I confirm these facts match my source records"
                  onCancel={() => setEditing(null)}
                  onSubmit={(facts) =>
                    void send(
                      `${base}/listings/${encodeURIComponent(l.id)}/revisions`,
                      {
                        facts,
                        expected_revision: l.current_revision,
                        merchant_reviewed: true,
                      },
                      crypto.randomUUID(),
                      "Revision submitted for content review. It stays off sale until approved.",
                    )
                  }
                />
              ) : (
                canWrite && (
                  <div>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setEditing(l.id)}
                    >
                      Edit price & stock
                    </button>{" "}
                    {l.decision === "approved" &&
                      l.published_revision !== l.current_revision &&
                      l.state !== "withdrawn" && (
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() =>
                            void send(
                              `${base}/listings/${encodeURIComponent(l.id)}/publish`,
                              { revision: l.current_revision },
                              undefined,
                              "Published.",
                            )
                          }
                        >
                          Publish
                        </button>
                      )}{" "}
                    {l.published_revision !== null && (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          void send(
                            `${base}/listings/${encodeURIComponent(l.id)}/withdraw`,
                            undefined,
                            undefined,
                            "Withdrawn from sale.",
                          )
                        }
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
