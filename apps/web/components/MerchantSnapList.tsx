"use client";
import { useEffect, useRef, useState } from "react";
import {
  categories,
  emptyMerchantDraft,
  enhancementOptions,
  merchantDraftProblem,
  parseMerchantImport,
} from "../../../packages/product/catalog";
import type { MerchantDraft } from "../../../packages/product/catalog";
import { photoIssue } from "../../../packages/product/platform";
interface LocalImage {
  uri: string;
  name: string;
}
export default function MerchantSnapList({
  drafts,
  setDrafts,
  view = "Snap & List",
}: {
  drafts: MerchantDraft[];
  setDrafts: (drafts: MerchantDraft[]) => void;
  view?: string;
}) {
  const [stage, setStage] = useState(0);
  const [images, setImages] = useState<LocalImage[]>([]);
  const imageRef = useRef<LocalImage[]>([]);
  const ticket = useRef(0);
  const importRun = useRef(0);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const [values, setValues] = useState({ ...emptyMerchantDraft });
  const [options, setOptions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      ticket.current++;
      importRun.current++;
      imageRef.current.forEach((n) => URL.revokeObjectURL(n.uri));
    },
    [],
  );
  async function select(files: FileList | null) {
    if (!files) return;
    const run = ++ticket.current;
    setMessage("");
    if (
      files.length > 8 ||
      Array.from(files).reduce((n, f) => n + f.size, 0) > 32 * 1048576
    ) {
      setMessage("Choose at most eight images totaling no more than 32 MB.");
      setBusy(false);
      return;
    }
    setBusy(true);
    const next: LocalImage[] = [];
    try {
      for (const f of Array.from(files)) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 10 * 1048576
        )
          throw Error("Use JPEG, PNG or WebP product photos under 10 MB each.");
        const uri = URL.createObjectURL(f);
        next.push({ uri, name: f.name });
        const im = new Image();
        im.src = uri;
        await im.decode();
        const issue = photoIssue({
          bytes: f.size,
          width: im.naturalWidth,
          height: im.naturalHeight,
        });
        if (issue) throw Error(issue);
      }
      if (run !== ticket.current) {
        next.forEach((n) => URL.revokeObjectURL(n.uri));
        return;
      }
      imageRef.current.forEach((n) => URL.revokeObjectURL(n.uri));
      imageRef.current = next;
      setImages(next);
    } catch (e) {
      next.forEach((n) => URL.revokeObjectURL(n.uri));
      if (run === ticket.current)
        setMessage(
          e instanceof Error
            ? e.message
            : "Product images could not be opened.",
        );
    } finally {
      if (run === ticket.current) setBusy(false);
    }
  }
  const field = (name: keyof typeof values, label: string, type = "text") => (
    <label>
      {label}
      <input
        type={type}
        maxLength={name === "description" ? 3000 : 300}
        value={String(values[name])}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
      />
    </label>
  );
  function save() {
    const candidate = { ...values, photoCount: images.length };
    const issue = merchantDraftProblem(candidate, drafts);
    if (issue) {
      setMessage(issue);
      return;
    }
    setDrafts([...drafts, { ...candidate, id: crypto.randomUUID() }]);
    setMessage(
      "Reviewed draft saved in this session only. Images have not been uploaded; no listing was approved, published or indexed.",
    );
  }
  async function importDrafts(file: File | undefined) {
    if (!file) return;
    const run = ++importRun.current;
    try {
      if (file.size > 2 * 1048576)
        throw Error("Keep a session import below 2 MB.");
      const text = await file.text();
      if (run !== importRun.current) return;
      const imported = parseMerchantImport(text, draftsRef.current);
      setDrafts([
        ...draftsRef.current,
        ...imported.map((d) => ({ ...d, id: crypto.randomUUID() })),
      ]);
      setMessage(
        "Imported session drafts only. Image links and review attestations were discarded; review is required before any future canonical submission.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Import failed; no draft was added.",
      );
    }
  }
  function exportDrafts() {
    const blob = new Blob([JSON.stringify(drafts, null, 2)], {
      type: "application/json",
    });
    const uri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = uri;
    link.download = "glam-merchant-session-drafts.json";
    link.click();
    URL.revokeObjectURL(uri);
  }
  if (view === "Catalog Health")
    return (
      <section className="panel">
        <h2>Catalog Health</h2>
        <p>
          These counts describe your actual session drafts, not a live merchant
          catalog.
        </p>
        <div className="metric-grid">
          <div>
            <h3>Session drafts</h3>
            <strong>{drafts.length}</strong>
          </div>
          <div>
            <h3>Need image upload</h3>
            <strong>{drafts.length}</strong>
          </div>
          <div>
            <h3>Published listings</h3>
            <strong>0</strong>
          </div>
        </div>
        <p>
          Every draft still needs authenticated storage, canonical validation
          and version-specific approval before publication.
        </p>
      </section>
    );
  if (view === "My Products" || view === "Draft Listings")
    return (
      <section className="panel">
        <h2>{view}</h2>
        <p>
          {view === "My Products"
            ? "No published products are connected. Session drafts are shown separately below."
            : "Session drafts only. No stock or price is represented as a verified consumer offer."}
        </p>
        {drafts.length ? (
          drafts.map((d) => (
            <article className="draft" key={d.id}>
              <h3>{d.title}</h3>
              <p>
                {d.sku} · {d.category} · Merchant-entered price {d.price}{" "}
                {d.currency}
              </p>
              <span className="badge">Session draft · Not published</span>
              <button
                className="text-button"
                onClick={() => setDrafts(drafts.filter((n) => n.id !== d.id))}
              >
                Delete session listing draft
              </button>
            </article>
          ))
        ) : (
          <p>No session listing drafts.</p>
        )}
        <label className="drop-zone">
          Import session draft JSON
          <input
            data-testid="merchant-bulk-import"
            type="file"
            accept="application/json,.json"
            onChange={(e) => importDrafts(e.target.files?.[0])}
          />
        </label>
        {message && <p role="status">{message}</p>}
        <button
          className="button secondary"
          disabled={!drafts.length}
          onClick={exportDrafts}
        >
          Download session draft JSON
        </button>
        <button className="button" disabled>
          Bulk publish — verified connection required
        </button>
      </section>
    );
  return (
    <section className="snap-list">
      <header>
        <p className="eyebrow">Merchant Snap & List</p>
        <h2>Snap. Prepare. Review.</h2>
        <p>
          Your real product stays intact. Nothing becomes a purchasable
          recommendation until the current facts and images pass review.
        </p>
      </header>
      <ol className="stepper">
        {["Snap", "AI Enhance", "Merchant Review", "Publish & Match"].map(
          (n, i) => (
            <li key={n} aria-current={stage === i ? "step" : undefined}>
              {n}
            </li>
          ),
        )}
      </ol>
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
      <div className="panel">
        {stage === 0 ? (
          <>
            <h3>Capture or upload product photos</h3>
            <label className="drop-zone">
              Choose product images
              <input
                data-testid="merchant-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => select(e.target.files)}
              />
            </label>
            <p className="fine">
              Device-only originals · No upload · Up to eight images / 32 MB
              total. Native camera capture is in the mobile app.
            </p>
            {busy && <p role="status">Checking local product images…</p>}
            <div className="product-originals">
              {images.map((n, i) => (
                <figure key={n.uri}>
                  <img
                    src={n.uri}
                    alt={`Original product photo ${i + 1}; not enhanced`}
                  />
                  <figcaption>Original · Unchanged</figcaption>
                </figure>
              ))}
            </div>
            <button
              className="button secondary"
              disabled={!images.length}
              onClick={() => {
                ticket.current++;
                imageRef.current.forEach((n) => URL.revokeObjectURL(n.uri));
                imageRef.current = [];
                setImages([]);
                setBusy(false);
                setMessage(
                  "Local product photo previews cleared. Source files were not deleted.",
                );
              }}
            >
              Clear product photos
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setStage(1)}
            >
              Continue to enhancement options
            </button>
          </>
        ) : stage === 1 ? (
          <>
            <h3>AI enhancement options</h3>
            {enhancementOptions.map((n) => (
              <label className="check" key={n}>
                <input
                  type="checkbox"
                  checked={options.includes(n)}
                  onChange={() =>
                    setOptions(
                      options.includes(n)
                        ? options.filter((x) => x !== n)
                        : [...options, n],
                    )
                  }
                />
                {n}
              </label>
            ))}
            <div className="notice">
              No qualified image/recognition/OCR provider or private storage is
              connected. No enhancement, barcode match, translation or
              description has been generated. Enhanced images must remain
              separate from originals.
            </div>
            <button className="button" disabled>
              Run AI preparation — connection required
            </button>
            <button className="button secondary" onClick={() => setStage(2)}>
              Continue with a manual listing draft
            </button>
          </>
        ) : stage === 2 ? (
          <>
            <h3>Review the real product facts</h3>
            <p>
              No facts below are AI-generated. Confirm from packaging or an
              authoritative merchant source; never invent ingredients, SPF,
              benefits or certifications.
            </p>
            <div className="form-grid">
              {field("title", "Product title")}
              {field("sku", "Source SKU / product identifier")}
              <label>
                Product category
                <select
                  value={values.category}
                  onChange={(e) =>
                    setValues({ ...values, category: e.target.value })
                  }
                >
                  {categories
                    .filter((n) => n !== "service")
                    .map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                </select>
              </label>
              <label>
                Condition
                <select
                  value={values.condition}
                  onChange={(e) =>
                    setValues({ ...values, condition: e.target.value })
                  }
                >
                  {["new", "used", "refurbished", "rental"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              {field("price", "Merchant price")}
              <label>
                Listing currency
                <select
                  value={values.currency}
                  onChange={(e) =>
                    setValues({ ...values, currency: e.target.value })
                  }
                >
                  {["ZAR", "USD", "EUR", "GBP"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              {field("stock", "Confirmed stock quantity")}
              {field("country", "Delivery country code")}
              {field("source", "Source evidence reference")}
              {field("destination", "Merchant HTTPS destination")}
            </div>
            <label htmlFor="product-description">Factual description</label>
            <textarea
              id="product-description"
              value={values.description}
              maxLength={3000}
              rows={4}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
            />
            <label className="check">
              <input
                type="checkbox"
                checked={values.reviewed}
                onChange={(e) =>
                  setValues({ ...values, reviewed: e.target.checked })
                }
              />
              I have the image rights and have reviewed identity, variants,
              price, stock, condition, delivery and all product claims.
            </label>
            <button className="button" onClick={save}>
              Save reviewed session listing draft
            </button>
            <button className="button secondary" onClick={() => setStage(3)}>
              Review publication requirements
            </button>
          </>
        ) : (
          <>
            <h3>Publish only what is ready.</h3>
            <ul className="list">
              {[
                "Verified merchant and authorized role",
                "Validated original media / separate derivatives",
                "Current factual revision and content approval",
                "Fresh price / stock / delivery evidence",
                "Transactional publication and matching index",
              ].map((n) => (
                <li key={n}>
                  {n}
                  <span>Required</span>
                </li>
              ))}
            </ul>
            <p>
              Once approved, published products can match Face, Hair, Skin,
              Color, Body & Fit, Makeup Match, Makeover and Complete the Look
              requirements. Organic eligibility comes before paid placements.
            </p>
            <button className="button" disabled>
              Publish — verified connections required
            </button>
            <button className="button secondary" disabled>
              Promote — publication and ad qualification required
            </button>
          </>
        )}
        {stage > 0 && (
          <button className="text-button" onClick={() => setStage(stage - 1)}>
            Back
          </button>
        )}
      </div>
    </section>
  );
}
