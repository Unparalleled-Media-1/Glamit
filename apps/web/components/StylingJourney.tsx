"use client";
import { BeautyHome } from "./BeautyExperience";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../../../packages/product/platform";
import {
  changePart,
  freshJourney,
  goalJourneys,
  lookParts,
  partChoices,
  saveLook,
} from "../../../packages/product/journey";
import type { Journey, LookPart } from "../../../packages/product/journey";
type Props = {
  accountAvailable?: boolean;
  page: Page;
  data: Journey;
  setData: Dispatch<SetStateAction<Journey>>;
  go: (p: Page) => void;
};
const letters = ["01", "02", "03", "04", "05", "06"];
function JourneyIcon({ kind = "arrow" }: { kind?: string }) {
  const paths: Record<string, string> = {
    arrow: "M5 19L19 5M5 5h14v14",
    up: "M12 20V4M5 11l7-7 7 7",
    spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
    face: "M5 8V4h4m6 0h4v4m0 8v4h-4m-6 0H5v-4M8 11h.1m8 0h.1M9 15q3 3 6 0",
    camera: "M3 7h5l2-3h4l2 3h5v13H3zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    wave: "M2 12q5-12 10 0t10 0",
    wardrobe: "M8 3l4 3 4-3 6 7-4 3v8H6v-8l-4-3z",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind] || paths.spark} />
    </svg>
  );
}
function Portrait({ panel = 0 }: { panel?: number }) {
  return (
    <div
      className={`editorial panel-${panel}`}
      role="img"
      aria-label="Original editorial inspiration, not an AI result"
    />
  );
}
export default function StylingJourney({
  page, data: s, setData, go, accountAvailable = false,
}: Props) {
  const [part, setPart] = useState<LookPart>("Hair");
  const [draft, setDraft] = useState("");
  const [item, setItem] = useState("");
  const [notice, setNotice] = useState("");
  const [attachment, setAttachment] = useState<{
    name: string;
    url: string;
    image: boolean;
  } | null>(null);
  const [fileError, setFileError] = useState("");
  const [permission, setPermission] = useState(false);
  const objectUrl = useRef<string | null>(null);
  const ticket = useRef(0);
  useEffect(
    () => () => {
      ticket.current++;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  useEffect(() => {
    setNotice("");
  }, [page]);
  const patch = (key: keyof Journey, value: string | boolean) =>
    setData((prev) => ({ ...prev, [key]: value }));
  const act = (label: string, p: Page, secondary = false) => (
    <button
      className={secondary ? "button secondary" : "button"}
      onClick={() => go(p)}
    >
      {label}
      <JourneyIcon />
    </button>
  );
  const title = (kicker: string, head: string, copy?: string) => (
    <header className="journey-heading">
      <p className="eyebrow">{kicker}</p>
      <h1>{head}</h1>
      {copy && <p>{copy}</p>}
    </header>
  );
  const field = (
    key:
      | "name"
      | "preferences"
      | "country"
      | "city"
      | "event"
      | "date"
      | "deadline"
      | "theme"
      | "budget",
    label: string,
    type = "text",
  ) => (
    <label>
      {label}
      <input
        type={type}
        value={s[key]}
        maxLength={key === "preferences" ? 1000 : 160}
        onChange={(e) => patch(key, e.target.value)}
      />
    </label>
  );
  const selections = lookParts.filter((k) => s.look.parts[k]);
  const persist = (
    <label className="check">
      <input
        type="checkbox"
        checked={s.remember}
        onChange={(e) => patch("remember", e.target.checked)}
      />
      <span>
        Remember my approved plan, preferences and wardrobe on this browser.
        Photos and conversations stay session-only. Shared device? Leave this
        off.
      </span>
    </label>
  );
  const market = (
    <div className="market-fields">
      {field("country", "Shopping country")}
      {field("city", "Delivery / service city")}
      <label>
        Currency
        <select
          aria-label="Currency"
          value={s.currency}
          onChange={(e) => patch("currency", e.target.value)}
        >
          {["ZAR", "USD", "GBP", "EUR"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
    </div>
  );
  const attach = (
    <div className="inspiration-upload">
      <label className="check">
        <input
          type="checkbox"
          checked={permission}
          onChange={(e) => {
            setPermission(e.target.checked);
            if (!e.target.checked) {
              ticket.current++;
              if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
              objectUrl.current = null;
              setAttachment(null);
            }
          }}
        />
        <span>
          I have permission to preview this inspiration or invitation locally.
        </span>
      </label>
      <label className="attachment-button">
        ＋ Add inspiration or invitation
        <input
          aria-label="Add inspiration or invitation"
          type="file"
          disabled={!permission}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const id = ++ticket.current;
            if (
              !permission ||
              ![
                "image/jpeg",
                "image/png",
                "image/webp",
                "application/pdf",
              ].includes(file.type) ||
              file.size > 10 * 1024 * 1024
            ) {
              setFileError("Choose a JPEG, PNG, WebP or PDF under 10 MB.");
              return;
            }
            const url = URL.createObjectURL(file);
            try {
              if (file.type !== "application/pdf") {
                const img = new Image();
                img.src = url;
                await img.decode();
                if (img.naturalWidth * img.naturalHeight > 40000000)
                  throw Error();
              }
              if (ticket.current !== id) {
                URL.revokeObjectURL(url);
                return;
              }
              if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
              objectUrl.current = url;
              setAttachment({
                name: file.name,
                url,
                image: file.type !== "application/pdf",
              });
              setFileError("");
            } catch {
              URL.revokeObjectURL(url);
              if (ticket.current === id)
                setFileError(
                  "This file could not be previewed safely. Choose another.",
                );
            }
          }}
        />
      </label>
      {fileError && <p role="alert">{fileError}</p>}
      {attachment && (
        <figure className="attached">
          {attachment.image && (
            <img src={attachment.url} alt="Your local inspiration" />
          )}
          <figcaption>
            {attachment.name} · Local reference only, not read by AI
          </figcaption>
          <button
            className="text-button"
            onClick={() => {
              ticket.current++;
              if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
              objectUrl.current = null;
              setAttachment(null);
            }}
          >
            Remove attachment
          </button>
        </figure>
      )}
    </div>
  );
  if (page === "home")
    return (
      <BeautyHome
        data={s}
        go={go}
        setup={() => {
          patch("onboarded", true);
          go("profile");
        }}
      />
    );
  if (page === "advisor" || page === "event" || page === "screenshot")
    return (
      <>
        {title(
          "THE PERSONAL STYLIST",
          page === "event"
            ? "Dress for the moment."
            : page === "screenshot"
              ? "Inspired by a look? Make it yours."
              : "Let’s make it feel like you.",
          "One styling brief, from the first idea to the finishing touch.",
        )}
        <nav className="companion-link-row" aria-label="Styling experiences"><button className="button secondary" onClick={()=>go("advisor")}>AI Personal Stylist</button><button className="button secondary" onClick={()=>go("event")}>Event Stylist</button><button className="button secondary" onClick={()=>go("destination")}>Destination & Weather Stylist</button><button className="button secondary" onClick={()=>go("results")}>Personalized Results</button></nav>
        <div className="stylist-layout">
          <section className="conversation">
            <div className="stylist-greeting">
              <span className="stylist-symbol">✧</span>
              <h2>Start anywhere.</h2>
              <p>
                Tell me about the occasion, a color you love, a style you’ve
                saved — or something you already own.
              </p>
              <span className="connection-label">
                Draft conversation · AI stylist not connected
              </span>
            </div>
            <div className="prompt-row">
              {[
                "A wedding guest look",
                "A five-minute routine",
                "Make the look more relaxed",
              ].map((q) => (
                <button className="chip" key={q} onClick={() => setDraft(q)}>
                  {q}
                </button>
              ))}
            </div>
            <div
              className="conversation-messages"
              role="log"
              aria-live="polite"
              aria-label="Your styling brief"
            >
              {s.messages.map((m, i) => (
                <div className="user-message" key={i}>
                  <span>YOU · SAVED TO THIS SESSION</span>
                  <p>{m}</p>
                </div>
              ))}
            </div>
            <form
              className="stylist-composer"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                setData((p) => ({
                  ...p,
                  messages: [...p.messages, draft.trim()].slice(-30),
                }));
                setDraft("");
                setNotice(
                  "Added to your brief. No AI reply was generated. Continue shaping your look below.",
                );
              }}
            >
              <label htmlFor="styling-message">
                Your styling goal or refinement
              </label>
              <textarea
                id="styling-message"
                placeholder="I’m going to a wedding in Cape Town. I’d love an emerald look, under R4,000…"
                value={draft}
                maxLength={2000}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
              />
              <button className="button" disabled={!draft.trim()}>
                Add to my brief <JourneyIcon kind="up" />
              </button>
            </form>
            {attach}
            {notice && (
              <p role="status" className="inline-status">
                {notice}
              </p>
            )}
          </section>
          <aside className="styling-brief">
            <p className="eyebrow">YOUR STYLING PLAN</p>
            <h2>The details make it yours.</h2>
            {field("event", "Occasion / event")}
            {field("theme", "Theme or dress code (your input)")}
            <div className="paired-fields">
              {field("date", "Event date", "date")}
              {field("deadline", "Needed by", "date")}
            </div>
            {s.date && s.deadline && s.deadline > s.date && (
              <p role="alert">
                Choose a needed-by date on or before the event.
              </p>
            )}
            {field("budget", "Total budget, including delivery")}
            {field("preferences", "Comfort, coverage, fit & colors")}
            <label>
              How to achieve the look
              <select
                value={s.sourcing}
                onChange={(e) => patch("sourcing", e.target.value)}
              >
                {[
                  "Compare options",
                  "Use what I own",
                  "Buy ready-made",
                  "Custom tailor quote",
                  "Explore rental (not connected)",
                ].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <details>
              <summary>Shopping destination & currency</summary>
              {market}
            </details>
            <p className="fine">
              Themes are your input, not verified official event details. No
              delivery deadline or tailor feasibility is confirmed.
            </p>
            {act("Shape my look", "builder")}
            {persist}
          </aside>
        </div>
      </>
    );
  if (page === "builder")
    return (
      <>
        {title(
          "LIVE LOOK BUILDER",
          "Every detail. Still you.",
          "Change one element, keep everything else. Your selections are styling notes, not generated results.",
        )}
        <div className="look-layout">
          <section className="look-canvas">
            <Portrait panel={1} />
            <div className="look-canvas-caption">
              <span>EDITORIAL INSPIRATION</span>
              <h2>{s.look.title}</h2>
              <p>{selections.length}/5 elements chosen</p>
            </div>
          </section>
          <section className="look-controls">
            <label>
              Look name
              <input
                value={s.look.title}
                maxLength={100}
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    look: { ...p.look, title: e.target.value },
                  }))
                }
              />
            </label>
            <div
              className="component-tabs"
              role="tablist"
              aria-label="Look components"
            >
              {lookParts.map((k) => (
                <button
                  id={"tab-" + k.replaceAll(" ", "-")}
                  role="tab"
                  tabIndex={part === k ? 0 : -1}
                  aria-selected={part === k}
                  aria-controls="part-panel"
                  key={k}
                  onClick={() => setPart(k)}
                  onKeyDown={(e) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                    ) {
                      e.preventDefault();
                      const index =
                        e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? 4
                            : (lookParts.indexOf(k) +
                                (e.key === "ArrowRight" ? 1 : 4)) %
                              5;
                      setPart(lookParts[index]);
                      document
                        .getElementById(
                          "tab-" + lookParts[index].replaceAll(" ", "-"),
                        )
                        ?.focus();
                    }
                  }}
                >
                  {k}
                  <span>{s.look.parts[k] ? "✓" : "＋"}</span>
                </button>
              ))}
            </div>
            <div
              id="part-panel"
              role="tabpanel"
              aria-labelledby={"tab-" + part.replaceAll(" ", "-")}
              className="part-panel"
            >
              <p className="eyebrow">PERSONALIZE / {part.toUpperCase()}</p>
              <div className="option-grid">
                {partChoices[part].map((v, i) => (
                  <button
                    key={v}
                    aria-pressed={s.look.parts[part] === v}
                    className={
                      s.look.parts[part] === v
                        ? "look-option chosen"
                        : "look-option"
                    }
                    onClick={() => setData((p) => changePart(p, part, v))}
                  >
                    <span
                      className={"material material-" + i}
                      aria-hidden="true"
                    />
                    {v}
                  </button>
                ))}
              </div>
              <label>
                Your own {part.toLowerCase()} choice
                <input
                  value={s.look.parts[part]}
                  maxLength={240}
                  onChange={(e) =>
                    setData((p) => changePart(p, part, e.target.value))
                  }
                />
              </label>
              <button
                className="text-button"
                onClick={() => setData((p) => changePart(p, part, ""))}
              >
                Clear {part.toLowerCase()} only
              </button>
            </div>
            <div className="look-summary">
              {lookParts.map((k) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{s.look.parts[k] || "Open to possibilities"}</strong>
                </div>
              ))}
            </div>
            <div className="actions">
              <button
                className="button secondary"
                disabled={!s.look.title.trim() || !selections.length}
                onClick={() => {
                  setData((p) =>
                    saveLook(
                      { ...p, onboarded: true },
                      p.look.id === "current" ? crypto.randomUUID() : p.look.id,
                    ),
                  );
                  setNotice(
                    "Look saved. " +
                      (s.remember
                        ? "Approved metadata is remembered on this browser."
                        : "Session only. Enable remember in your profile to keep it after reload."),
                  );
                }}
              >
                Save this look ♡
              </button>
              {act("Get This Look", "complete")}
            </div>
            {notice && (
              <p role="status" className="inline-status">
                {notice}
              </p>
            )}
          </section>
        </div>
      </>
    );
  if (page === "complete")
    return (
      <>
        {title(
          "GET THIS LOOK",
          "From a look to real life.",
          "Your selected elements, with room for the right products and people.",
        )}
        <div className="get-look-layout">
          <section className="look-breakdown">
            <h2>{s.look.title}</h2>
            {lookParts.map((k, i) => (
              <div className="look-line" key={k}>
                <span className="look-line-number">0{i + 1}</span>
                <div>
                  <h3>{k}</h3>
                  <p>
                    {s.look.parts[k] ||
                      "Choose a direction in the Look Builder"}
                  </p>
                </div>
                <span className="quiet-pill">
                  {s.look.parts[k] === "Already owned" ||
                  s.look.parts[k] === "From my wardrobe"
                    ? "Owned · confirm details"
                    : "Not sourced"}
                </span>
              </div>
            ))}
            {act("Edit my look", "builder", true)}
          </section>
          <aside className="sourcing-panel">
            <p className="eyebrow">THE COMPLETE PICTURE</p>
            {act("Explore the beauty edit", "shop", true)}
            <h2>Made for your world.</h2>
            {market}
            <div className="cost-summary">
              <span>Total delivered cost</span>
              <strong>Not yet known</strong>
            </div>
            <p>
              No verified offers yet. Prices, variants, stock, merchant identity
              and delivery estimates will appear with qualified matches.
            </p>
            <div className="match-empty">
              <strong>Best matches</strong>
              <p>No verified products or professionals meet this plan yet.</p>
            </div>
            <div className="match-empty sponsored">
              <strong>Sponsored matches</strong>
              <p>
                No eligible sponsored offers. Paid placements must meet the same
                requirements.
              </p>
            </div>
            {act("Prepare a professional / tailor brief", "booking", true)}
            <p className="fine">
              Quotes need professional feasibility and availability
              confirmation. Checkout and bookings are not connected. GLAM’s 10%
              item-sale commission is a merchant deduction on completed eligible
              sales, not an added customer fee. Service fees are not yet set.
            </p>
          </aside>
        </div>
      </>
    );
  if (page === "wardrobe")
    return (
      <>
        {title(
          "YOUR WARDROBE",
          "A fresh look. A familiar favorite.",
          "Start with what you own. Add private item notes, then choose pieces for your look.",
        )}
        <form
          className="wardrobe-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!item.trim() || s.wardrobe.length >= 80) return;
            setData((p) => ({
              ...p,
              wardrobe: [
                ...p.wardrobe,
                { id: crypto.randomUUID(), name: item.trim() },
              ],
            }));
            setItem("");
          }}
        >
          <label>
            Wardrobe item
            <input
              value={item}
              maxLength={160}
              onChange={(e) => setItem(e.target.value)}
              placeholder="My black blazer, size M"
            />
          </label>
          <button
            className="button"
            disabled={!item.trim() || s.wardrobe.length >= 80}
          >
            Add item ＋
          </button>
        </form>
        <div className="wardrobe-grid">
          {s.wardrobe.map((v, i) => (
            <article className="wardrobe-card" key={v.id}>
              <span
                className={"wardrobe-art material-" + (i % 5)}
                aria-hidden="true"
              >
                ♧
              </span>
              <label>
                Item details
                <input
                  aria-label={"Edit " + v.name}
                  value={v.name}
                  maxLength={160}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      wardrobe: p.wardrobe.map((w) =>
                        w.id === v.id ? { ...w, name: e.target.value } : w,
                      ),
                    }))
                  }
                />
              </label>
              <button
                className="text-button"
                disabled={!v.name.trim()}
                onClick={() => {
                  setData((p) => changePart(p, "Clothing", v.name));
                  go("builder");
                }}
              >
                Style this piece <JourneyIcon />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setData((p) => ({
                    ...p,
                    wardrobe: p.wardrobe.filter((w) => w.id !== v.id),
                  }))
                }
              >
                Delete item
              </button>
            </article>
          ))}
        </div>
        {!s.wardrobe.length && (
          <div className="soft-empty">
            <span>♧</span>
            <h2>Your style already has a starting point.</h2>
            <p>
              Add your first piece above. Image recognition is not connected;
              notes stay yours to edit.
            </p>
          </div>
        )}
        {persist}
      </>
    );
  if (page === "profile")
    return (
      <section className="glam-profile">
        <div className="goal-section-title">
          <div>
            <p className="eyebrow">YOUR GLAM PROFILE</p>
            <h2>A memory you control.</h2>
          </div>
          <span className="quiet-pill">
            {s.remember ? "Remembered on this browser" : "Private session"}
          </span>
        </div>
        <div className="profile-fields">
          {field("name", "What should we call you?")}
          {field("preferences", "Your styling & shopping preferences")}
        </div>
        {persist}
        <p className="fine">
          Only your approved text and look selections are stored here. No
          selfies, attachment files, conversations, inferred identity or
          uncomputed analysis reports. {accountAvailable
            ? "This plan stays on this device. Account details and routines are saved separately after sign-in."
            : "Account sync is not connected."}
        </p>
        {market}
        <h3>Saved looks ({s.saved.length})</h3>
        <div className="saved-look-grid">
          {s.saved.map((l) => (
            <article className="saved-look" key={l.id}>
              <span>✧</span>
              <h3>{l.title}</h3>
              <p>{lookParts.filter((k) => l.parts[k]).length} components</p>
              <button
                className="text-button"
                onClick={() => {
                  setData((p) => ({
                    ...p,
                    look: { ...l, parts: { ...l.parts } },
                  }));
                  go("builder");
                }}
              >
                Open & edit look <JourneyIcon />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setData((p) => ({
                    ...p,
                    saved: p.saved.filter((v) => v.id !== l.id),
                  }))
                }
              >
                Delete saved look
              </button>
            </article>
          ))}
        </div>
        {!s.saved.length && (
          <p>
            No saved looks yet. Start a look and save the elements you choose.
          </p>
        )}
        {act("Create a look", "builder", true)}
        <button
          className="text-button danger"
          onClick={() => {
            setData(freshJourney());
            setNotice(
              "GLAM Profile, saved looks, wardrobe and conversation cleared.",
            );
          }}
        >
          Delete my GLAM Profile on this device
        </button>
        {notice && <p role="status">{notice}</p>}
      </section>
    );
  return null;
}
