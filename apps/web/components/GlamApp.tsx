"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  capabilityReasons,
  goals,
  initialPersonal,
  interests,
  personalReducer,
  photoIssue,
  reportFields,
  styles,
  tabPage,
  tools,
  webTabs,
  mobileTabs,
} from "../../../packages/product/platform";
import type { Page, Photo } from "../../../packages/product/platform";

const pages: Page[] = [
  "home",
  "analyze",
  "consent",
  "quality",
  "goals",
  "report",
  "color",
  "guide",
  "studio",
  "advisor",
  "profile",
  "history",
  "privacy",
  "explore",
  "complete",
  "screenshot",
  "budget",
  "booking",
  "wardrobe",
  "calendar",
  "groups",
  "agent",
];
const names: Partial<Record<Page, string>> = {
  analyze: "Face Analysis",
  color: "Color Analysis",
  guide: "My Glow-Up Guide",
  studio: "AI Studio",
  advisor: "AI Advisor",
  profile: "Your space",
  history: "Saved results",
  privacy: "Privacy & photos",
  explore: "Explore, when you want to",
  complete: "Complete the Look",
  screenshot: "Screenshot to Shop",
  budget: "Complete My Look Within My Budget",
  booking: "Book the Exact Look",
  wardrobe: "Digital Wardrobe",
  calendar: "Style Calendar",
  groups: "Group styling",
  agent: "Shopping Agent",
};
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10l9-7 9 7v11h-6v-7H9v7H3z",
    analyze:
      "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M8 11h.1M16 11h.1M9 16q3 2 6 0",
    studio: "M4 20L17 7l3 3L7 23zM18 1v3M22 5h-3",
    advisor: "M3 4h18v13H9l-6 4z",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 22a8 8 0 0 1 16 0",
    spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M5 19L19 5M5 5h14v14" />
    </svg>
  );
}
function Editorial({
  panel = 0,
  className = "",
}: {
  panel?: number;
  className?: string;
}) {
  return (
    <div
      className={`editorial panel-${panel} ${className}`}
      role="img"
      aria-label="Original editorial illustration. Not a personal analysis or makeover result."
    />
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice" role="status">
      {children}
    </div>
  );
}
export default function GlamApp({ start = "home" }: { start?: Page }) {
  const [state, dispatch] = useReducer(personalReducer, {
    ...initialPersonal,
    page: start,
  });
  const [photo, setPhoto] = useState<Photo | null>(null);
  const photoRef = useRef<Photo | null>(null);
  const selection = useRef(0);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [routineTitle, setRoutineTitle] = useState("My getting-ready routine");
  const [routineText, setRoutineText] = useState(
    "Choose a look that feels comfortable\nPrepare the tools I already own\nFollow one technique at a time",
  );
  const [advisor, setAdvisor] = useState("");
  const [compare, setCompare] = useState(50);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const switchButton = useRef<HTMLButtonElement>(null);
  const page = state.page;
  useEffect(() => {
    const pop = () => {
      const p = location.pathname.slice(1) || "home";
      if (pages.includes(p as Page))
        dispatch({ type: "navigate", page: p as Page });
    };
    const network = () => setOnline(navigator.onLine);
    network();
    addEventListener("popstate", pop);
    addEventListener("online", network);
    addEventListener("offline", network);
    return () => {
      removeEventListener("popstate", pop);
      removeEventListener("online", network);
      removeEventListener("offline", network);
      selection.current++;
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.uri);
    };
  }, []);
  useEffect(() => {
    if (showSwitcher) {
      modalRef.current?.showModal();
    } else if (modalRef.current?.open) {
      modalRef.current.close();
      switchButton.current?.focus();
    }
  }, [showSwitcher]);
  function go(next: Page) {
    dispatch({ type: "navigate", page: next });
    setError("");
    setMessage("");
    history.pushState(null, "", next === "home" ? "/" : "/" + next);
    mainRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function clearPhoto() {
    selection.current++;
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.uri);
    photoRef.current = null;
    setPhoto(null);
    setConsent(false);
    setPhotoBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }
  async function choosePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ticket = ++selection.current;
    setError("");
    if (!consent) {
      setError("Choose local-preview permission first.");
      e.target.value = "";
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10485760
    ) {
      setError("Choose a JPEG, PNG or WebP image smaller than 10 MB.");
      e.target.value = "";
      return;
    }
    setPhotoBusy(true);
    const uri = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = uri;
      await img.decode();
      if (ticket !== selection.current) {
        URL.revokeObjectURL(uri);
        return;
      }
      const candidate = {
        uri,
        width: img.naturalWidth,
        height: img.naturalHeight,
        bytes: file.size,
        name: file.name,
      };
      const issue = photoIssue(candidate);
      if (issue) {
        URL.revokeObjectURL(uri);
        setError(issue);
        e.target.value = "";
        return;
      }
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.uri);
      photoRef.current = candidate;
      setPhoto(candidate);
      go("quality");
    } catch {
      URL.revokeObjectURL(uri);
      if (ticket === selection.current)
        setError("This image could not be opened. Try another image.");
    } finally {
      if (ticket === selection.current) setPhotoBusy(false);
    }
  }
  async function checkAnalysis() {
    if (checking) return;
    setChecking(true);
    setError("");
    setMessage(
      "Checking service availability only. No analysis job is running.",
    );
    try {
      const r = await fetch("/api/capabilities", { cache: "no-store" });
      if (!r.ok) throw Error();
      await r.json();
      setMessage(capabilityReasons.analysis);
    } catch {
      setError(
        "Service availability could not be checked. Your photo stays on this device; no request is queued.",
      );
    } finally {
      setChecking(false);
    }
  }
  function saveRoutine(e: FormEvent) {
    e.preventDefault();
    const lines = routineText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!routineTitle.trim() || !lines.length || lines.length > 30) {
      setError("Add a title and between one and 30 steps.");
      return;
    }
    dispatch({
      type: "save-routine",
      routine: {
        id: crypto.randomUUID(),
        title: routineTitle.trim(),
        steps: lines.map((text) => ({
          id: crypto.randomUUID(),
          text,
          done: false,
        })),
      },
    });
    setMessage(
      "Routine saved for this session. Account sync is not connected.",
    );
  }
  const btn = (label: string, next: Page, secondary = false) => (
    <button
      className={secondary ? "button secondary" : "button"}
      onClick={() => go(next)}
    >
      {label}
      <Arrow />
    </button>
  );
  const heading = (title: string, body: string) => (
    <header className="page-heading">
      <p className="eyebrow">Your personal AI beauty & style advisor</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </header>
  );
  const unavailable = (reason: string) => <Notice>{reason}</Notice>;
  const fields = (labels: readonly string[]) => (
    <div className="form-grid">
      {labels.map((label) => (
        <label key={label}>
          {label}
          <input maxLength={160} placeholder="Optional planning context" />
        </label>
      ))}
    </div>
  );
  function content() {
    switch (page) {
      case "home":
        return (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">Understand. Explore. Express.</p>
                <h1>
                  Discover What
                  <br />
                  <em>Suits You.</em>
                </h1>
                <p>
                  Understand your features. Discover your colors. Explore your
                  look. Learn how to achieve it.
                </p>
                <div className="actions">
                  {btn("Analyze My Face", "analyze")}
                  {btn("Explore AI Studio", "studio", true)}
                </div>
                <p className="fine">
                  Private by default · Your photo, your choice
                </p>
              </div>
              <Editorial className="hero-image" />
              <div className="hero-caption">
                Every look. Every style. Everyone.
              </div>
            </section>
            <div className="quick-grid">
              {[
                ["Face Analysis", "Understand your features", "analyze"],
                ["Color Analysis", "Discover your palette", "color"],
                ["AI Makeover", "Explore a chosen style", "studio"],
                ["Makeup Match", "Recreate inspiration", "studio"],
              ].map(([title, copy, target], i) => (
                <button
                  className="quick-card"
                  key={title}
                  onClick={() => {
                    if (i === 3)
                      dispatch({ type: "tool", value: "Makeup Match" });
                    go(target as Page);
                  }}
                >
                  <span className="number">0{i + 1}</span>
                  <Icon name={i === 0 ? "analyze" : "spark"} />
                  <h2>{title}</h2>
                  <p>{copy}</p>
                  <Arrow />
                </button>
              ))}
            </div>
            <section className="journey">
              <div>
                <p className="eyebrow">Your glow-up journey</p>
                <h2>
                  A little guidance.
                  <br />A style of your own.
                </h2>
                <p>Useful advice before any product recommendation.</p>
              </div>
              <ol>
                {[
                  "Complete your personal analysis",
                  "Explore your colors and chosen looks",
                  "Build a practical routine",
                ].map((n, i) => (
                  <li key={n}>
                    <span>0{i + 1}</span>
                    {n}
                  </li>
                ))}
              </ol>
            </section>
            <section className="section-head">
              <div>
                <p className="eyebrow">Unlimited personal styles</p>
                <h2>Follow interests. Skip the labels.</h2>
              </div>
            </section>
            <div className="chips">
              {interests.map((n) => (
                <button
                  key={n}
                  className={
                    state.interests.includes(n) ? "chip selected" : "chip"
                  }
                  aria-pressed={state.interests.includes(n)}
                  onClick={() =>
                    dispatch({ type: "toggle", key: "interests", value: n })
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="fine">
              Optional session preferences. No personality or identity is
              inferred from a photo.
            </p>
            <div className="secondary-links">
              {btn("Plan a routine", "guide", true)}
              {btn("Optional looks & products", "explore", true)}
            </div>
          </>
        );
      case "analyze":
        return (
          <>
            {heading(
              "Your features. Your possibilities.",
              "A personal guide to facial features, colors and styling — without a beauty score.",
            )}
            <div className="split">
              <Editorial panel={1} />
              <section className="panel">
                <p className="eyebrow">Face & personal color</p>
                <h2>
                  One starting point.
                  <br />
                  Your own direction.
                </h2>
                <ul className="list">
                  {reportFields.map((n) => (
                    <li key={n}>
                      {n}
                      <span>Guidance, with uncertainty</span>
                    </li>
                  ))}
                </ul>
                {btn("Start Face Analysis", "consent")}
                {btn("Open Color Analysis", "color", true)}
                <p className="fine">
                  Cosmetic styling guidance only. No diagnosis, identification
                  or attractiveness ranking.
                </p>
              </section>
            </div>
          </>
        );
      case "consent":
        return (
          <>
            {heading(
              "Your photo. Your permission.",
              "Prepare a photo privately on this device. No photo is uploaded, analyzed or shared.",
            )}
            <section className="narrow panel">
              <h2>Before you choose a photo</h2>
              <p>
                Use a photo you have permission to use. Face a soft light, keep
                your camera level and avoid filters. You can clear your preview
                at any time.
              </p>
              <Notice>
                Account, age/guardian eligibility, processing consent and a
                qualified provider are required before any future server upload.
                Local preview permission grants none of those capabilities.
              </Notice>
              <label className="check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (!e.target.checked) clearPhoto();
                  }}
                />
                I have permission to use this image and want a device-only
                preview.
              </label>
              <label
                className={`button ${!consent || photoBusy ? "disabled" : ""}`}
              >
                Choose a photo
                <input
                  ref={inputRef}
                  data-testid="photo-input"
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!consent || photoBusy}
                  onChange={choosePhoto}
                />
              </label>
              <p className="fine">
                JPEG, PNG or WebP · under 10 MB · at least 480 × 480 pixels
              </p>
              {photoBusy && <p role="status">Opening your local preview…</p>}
              {btn("Continue without a photo", "goals", true)}
            </section>
          </>
        );
      case "quality":
        return (
          <>
            {heading(
              "A clear starting point.",
              "Technical file checks help prepare your image. They do not evaluate your face, lighting or suitability.",
            )}
            <div className="split">
              <div className="photo-preview">
                {photo ? (
                  <img src={photo.uri} alt="Your device-only photo preview" />
                ) : (
                  <p>No local photo selected.</p>
                )}
              </div>
              <section className="panel">
                <h2>Photo review</h2>
                <ul className="list">
                  <li>
                    Dimensions
                    <span>
                      {photo
                        ? `${photo.width} × ${photo.height} pixels`
                        : "No image"}
                    </span>
                  </li>
                  <li>
                    File size
                    <span>
                      {photo
                        ? `${(photo.bytes / 1048576).toFixed(1)} MB`
                        : "Unknown"}
                    </span>
                  </li>
                  <li>
                    Lighting / blur / face detection<span>Not evaluated</span>
                  </li>
                  <li>
                    Processing / storage<span>Not uploaded</span>
                  </li>
                </ul>
                {btn("Choose my goals", "goals")}
                <button
                  className="button secondary"
                  onClick={() => {
                    clearPhoto();
                    go("consent");
                  }}
                >
                  Clear and choose another photo
                </button>
              </section>
            </div>
          </>
        );
      case "goals":
        return (
          <>
            {heading(
              "What would you like to explore?",
              "Choose your goals. You can change them at any time.",
            )}
            <section className="narrow panel">
              <div className="choice-list">
                {goals.map((n) => (
                  <label className="check" key={n}>
                    <input
                      type="checkbox"
                      checked={state.goals.includes(n)}
                      onChange={() =>
                        dispatch({ type: "toggle", key: "goals", value: n })
                      }
                    />
                    {n}
                  </label>
                ))}
              </div>
              {unavailable(capabilityReasons.analysis)}
              <button
                className="button"
                disabled={checking || !online}
                onClick={checkAnalysis}
              >
                {checking
                  ? "Checking connection…"
                  : "Check analysis availability"}
              </button>
              {btn("View report workspace", "report", true)}
            </section>
          </>
        );
      case "report":
        return (
          <>
            {heading(
              "Your personal analysis.",
              "A report will explain estimates, their limits and practical options. There is no analysis result yet.",
            )}
            <div className="report-layout">
              <section className="panel report-visual">
                <Icon name="analyze" />
                <h2>No photo analyzed</h2>
                <p>
                  Your image stays on this device until you explicitly authorize
                  a qualified service.
                </p>
                {photo && (
                  <img src={photo.uri} alt="Unanalyzed local original" />
                )}
                {btn("Prepare a photo", "consent", true)}
              </section>
              <div className="report-fields">
                {reportFields.map((n) => (
                  <section className="panel" key={n}>
                    <h2>{n}</h2>
                    <span className="badge">Not computed</span>
                    <p>
                      Qualified analysis, uncertainty and your correction will
                      appear here.
                    </p>
                  </section>
                ))}
              </div>
              <aside className="panel">
                <h2>Guidance, not a verdict.</h2>
                <p>
                  No beauty scores. No medical conclusions. Estimates should be
                  explained and open to correction.
                </p>
                {btn("Explore Color Analysis", "color")}
                {btn("Build my Glow-Up Guide", "guide", true)}
                {unavailable(capabilityReasons.analysis)}
              </aside>
            </div>
          </>
        );
      case "color":
        return (
          <>
            {heading(
              "Find your colors.",
              "Personal color suggestions depend on lighting, camera and a qualified analysis. They are not rules about what you can wear.",
            )}
            <div className="split">
              <section className="palette-art">
                <div className="palette-orbit">
                  {["#c9a46a", "#a98abd", "#d96b95", "#62515d", "#dfcbb9"].map(
                    (c) => (
                      <span key={c} style={{ background: c }} />
                    ),
                  )}
                </div>
                <p>Brand color illustration · Not your personal palette</p>
              </section>
              <section className="panel">
                <h2>Your palette is still open.</h2>
                <ul className="list">
                  {[
                    "Color season",
                    "Estimated undertone",
                    "Makeup shade families",
                    "Hair & clothing colors",
                  ].map((n) => (
                    <li key={n}>
                      {n}
                      <span>Not computed</span>
                    </li>
                  ))}
                </ul>
                {unavailable(capabilityReasons.analysis)}
                {btn("Prepare my photo", "consent")}
                {btn("Build a chosen-color routine", "guide", true)}
              </section>
            </div>
          </>
        );
      case "guide":
        return (
          <>
            {heading(
              "A guide you can make your own.",
              "Start with practical steps you choose. AI personalization will require a qualified analysis; these are your own editable notes.",
            )}
            <div className="split">
              <form className="panel" onSubmit={saveRoutine}>
                <h2>Build a routine</h2>
                <label>
                  Routine title
                  <input
                    value={routineTitle}
                    maxLength={160}
                    required
                    onChange={(e) => setRoutineTitle(e.target.value)}
                  />
                </label>
                <label htmlFor="routine-steps">One step per line</label>
                <textarea
                  id="routine-steps"
                  value={routineText}
                  maxLength={6000}
                  rows={7}
                  required
                  onChange={(e) => setRoutineText(e.target.value)}
                />
                <button className="button" type="submit">
                  Save session routine
                </button>
                <p className="fine">
                  Stored in app memory only. Reloading clears these drafts until
                  account sync is connected.
                </p>
              </form>
              <section>
                <h2>Your routines</h2>
                {!state.routines.length && (
                  <div className="empty">
                    <h3>A little room for something useful.</h3>
                    <p>
                      Save your first routine to follow and check off steps.
                    </p>
                  </div>
                )}
                {state.routines.map((r) => (
                  <section className="panel" key={r.id}>
                    <h3>{r.title}</h3>
                    {r.steps.map((s) => (
                      <label className="check" key={s.id}>
                        <input
                          type="checkbox"
                          checked={s.done}
                          onChange={() =>
                            dispatch({
                              type: "step",
                              routine: r.id,
                              step: s.id,
                            })
                          }
                        />
                        <span className={s.done ? "done" : ""}>{s.text}</span>
                      </label>
                    ))}
                    <button
                      className="text-button"
                      onClick={() =>
                        dispatch({ type: "delete-routine", id: r.id })
                      }
                    >
                      Delete routine
                    </button>
                  </section>
                ))}
              </section>
            </div>
            <div className="secondary-links">
              {btn("Try AI Makeover", "studio", true)}
              {btn("Optional products for this look", "complete", true)}
            </div>
          </>
        );
      case "studio":
        return (
          <>
            {heading(
              "Explore your look.",
              "Hair, makeup and grooming choices — while keeping your original, your complexion and your identity.",
            )}
            <div className="studio-layout">
              <aside className="panel">
                <h2>Your studio</h2>
                <div className="tool-list">
                  {tools.map((n) => (
                    <button
                      aria-pressed={state.tool === n}
                      className={state.tool === n ? "selected" : ""}
                      key={n}
                      onClick={() => dispatch({ type: "tool", value: n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <label>
                  Style direction
                  <select
                    value={state.style}
                    onChange={(e) =>
                      dispatch({ type: "style", value: e.target.value })
                    }
                  >
                    {styles.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Requested intensity: {state.intensity}%
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={state.intensity}
                    onChange={(e) =>
                      dispatch({
                        type: "intensity",
                        value: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </aside>
              <section className="studio-canvas">
                {photo ? (
                  <img
                    src={photo.uri}
                    alt="Your unchanged local original. No makeover generated."
                  />
                ) : (
                  <Editorial panel={2} />
                )}
                <div className="canvas-label">
                  {photo
                    ? "Original · Unchanged"
                    : "Editorial inspiration · Not your result"}
                </div>
                <div className="compare-line" style={{ left: compare + "%" }} />
                <div className="canvas-bottom">
                  <h2>{state.tool}</h2>
                  <p>No generated comparison yet</p>
                </div>
              </section>
              <aside className="panel">
                <h2>Your original comes first.</h2>
                {unavailable(capabilityReasons.studio)}
                {state.tool === "Makeup Match" && (
                  <p>
                    Select inspiration only after reviewing image rights. Makeup
                    matching is not face identification.
                  </p>
                )}
                {state.tool === "Look Remix" && (
                  <p>
                    Hair, makeup and outfit references require separate rights
                    and user selection.
                  </p>
                )}
                {btn("Choose / change photo", "consent", true)}
                <label>
                  Comparison handle
                  <input
                    type="range"
                    aria-label="Comparison handle"
                    min="0"
                    max="100"
                    value={compare}
                    onChange={(e) => setCompare(Number(e.target.value))}
                  />
                </label>
                <button className="button" disabled>
                  Generate — connection required
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    dispatch({ type: "intensity", value: 35 });
                    dispatch({ type: "style", value: styles[0] });
                    setCompare(50);
                    setMessage(
                      "Controls reset. The original image was never changed.",
                    );
                  }}
                >
                  Reset to original
                </button>
                {btn("Optional Complete the Look", "complete", true)}
              </aside>
            </div>
          </>
        );
      case "advisor":
        return (
          <>
            {heading(
              "A little guidance, whenever you need it.",
              "Your beauty and grooming questions, routines and technique guidance — without pressure to buy.",
            )}
            <section className="advisor-panel">
              <div className="advisor-intro">
                <Icon name="spark" />
                <h2>What would you like to explore?</h2>
                <p>
                  Prepare a question for the future connected advisor, or build
                  your own routine today.
                </p>
                <div className="chips">
                  {[
                    "A five-minute routine",
                    "How do I recreate this makeup?",
                    "Hair care for my chosen style",
                  ].map((n) => (
                    <button
                      className="chip"
                      key={n}
                      onClick={() => setAdvisor(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setMessage(capabilityReasons.advisor);
                }}
              >
                <label htmlFor="advisor-question">Your question</label>
                <textarea
                  id="advisor-question"
                  value={advisor}
                  onChange={(e) => setAdvisor(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="What would you like help with?"
                />
                <button className="button" disabled={!advisor.trim()}>
                  Check advisor connection
                </button>
              </form>
              {btn("Build my own routine", "guide", true)}
            </section>
          </>
        );
      case "profile":
        return (
          <>
            {heading(
              "Your space. Your choices.",
              "Your goals, private routines, saved results and authorized workspaces.",
            )}
            <div className="split">
              <section className="panel">
                <h2>Personal account</h2>
                {unavailable(capabilityReasons.account)}
                <button
                  className="button"
                  onClick={() =>
                    setMessage(
                      "Google sign-in will use the selected Supabase project when it is connected. No password is collected here.",
                    )
                  }
                >
                  Continue with Google
                </button>
                <button
                  ref={switchButton}
                  className="button secondary"
                  onClick={() => setShowSwitcher(true)}
                >
                  Switch workspace
                </button>
                <p>
                  One login. Multiple approved roles. No separate business
                  account required.
                </p>
              </section>
              <section className="panel">
                <h2>Your personal space</h2>
                {[
                  ["Analysis history & saved looks", "history"],
                  ["My routines", "guide"],
                  ["Privacy & photo deletion", "privacy"],
                  ["Digital Wardrobe", "wardrobe"],
                  ["Style Calendar", "calendar"],
                  ["Group styling", "groups"],
                  ["Shopping Agent", "agent"],
                ].map(([n, p]) => (
                  <button
                    className="profile-link"
                    key={p}
                    onClick={() => go(p as Page)}
                  >
                    {n}
                    <Arrow />
                  </button>
                ))}
              </section>
            </div>
            <section className="panel">
              <h2>Style DNA</h2>
              <p>
                Your optional selected interests. No inferred identity or
                appearance labels.
              </p>
              <div className="chips">
                {interests.map((n) => (
                  <button
                    className={
                      state.interests.includes(n) ? "chip selected" : "chip"
                    }
                    aria-pressed={state.interests.includes(n)}
                    key={n}
                    onClick={() =>
                      dispatch({ type: "toggle", key: "interests", value: n })
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                className="text-button"
                onClick={() => {
                  for (const n of state.interests)
                    dispatch({ type: "toggle", key: "interests", value: n });
                  setMessage("Session interests cleared.");
                }}
              >
                Clear Style DNA choices
              </button>
            </section>
          </>
        );
      case "history":
        return (
          <>
            {heading(
              "Your history belongs to you.",
              "Analysis reports and AI looks appear only after a real, completed operation.",
            )}
            <div className="empty">
              <Icon name="analyze" />
              <h2>No saved analysis reports.</h2>
              <p>
                No photo has been analyzed and no AI result has been generated.
              </p>
              {btn("Start Face Analysis", "analyze")}
              {btn("View session routines", "guide", true)}
            </div>
          </>
        );
      case "privacy":
        return (
          <>
            {heading(
              "Private by default.",
              "Control local previews and notes. Server export and deletion will need an authenticated connection.",
            )}
            <section className="narrow panel">
              <ul className="list">
                <li>
                  Local photo
                  <span>
                    {photo ? "One device-only preview" : "No photo selected"}
                  </span>
                </li>
                <li>
                  Server photo upload<span>None</span>
                </li>
                <li>
                  Session routines<span>{state.routines.length}</span>
                </li>
                <li>
                  Account sync<span>Not connected</span>
                </li>
              </ul>
              <button
                className="button secondary"
                onClick={() => {
                  clearPhoto();
                  setMessage(
                    "Local preview cleared and its object URL revoked. Your source file on this device was not deleted.",
                  );
                }}
              >
                Clear local photo
              </button>
              <button
                className="button"
                onClick={() => {
                  clearPhoto();
                  dispatch({ type: "reset" });
                  setMessage(
                    "All app-session photo previews, interests and routines cleared.",
                  );
                  history.replaceState(null, "", "/");
                }}
              >
                Clear all session data
              </button>
              <button className="button secondary" disabled>
                Request server export / deletion — sign-in required
              </button>
            </section>
          </>
        );
      case "explore":
        return (
          <>
            {heading(
              "More possibilities, on your terms.",
              "Optional inspiration, products and professionals after your own goals and guidance.",
            )}
            <div className="inspiration-grid">
              {[0, 1, 2, 3].map((i) => (
                <button
                  className="inspiration-card"
                  key={i}
                  onClick={() => go("complete")}
                >
                  <Editorial panel={i} />
                  <h2>
                    {
                      [
                        "Quiet confidence",
                        "Everyday expression",
                        "Soft structure",
                        "A different perspective",
                      ][i]
                    }
                  </h2>
                  <p>Editorial inspiration · No matching offers yet</p>
                </button>
              ))}
            </div>
            <div className="secondary-links">
              {btn("Screenshot to Shop", "screenshot", true)}
              {btn("Plan within my budget", "budget", true)}
              {btn("Book the Exact Look", "booking", true)}
            </div>
          </>
        );
      case "complete":
        return (
          <>
            {heading(
              "Complete the Look.",
              "An optional checklist for recreating a chosen style. No purchases, personal results or verified matches are implied.",
            )}
            <div className="complete-layout">
              <Editorial />
              <section className="panel">
                <h2>Everything that makes the look</h2>
                {[
                  "Hair & grooming",
                  "Makeup",
                  "Clothing",
                  "Shoes & bag",
                  "Accessories",
                  "Professional service",
                ].map((n, i) => (
                  <div className="component-line" key={n}>
                    <div className={`product product-${i % 4}`} />
                    <div>
                      <h3>{n}</h3>
                      <p>
                        {i === 0 || i === 5
                          ? "Feasibility / quote needed"
                          : "Price pending · Availability unverified"}
                      </p>
                    </div>
                    <span className="badge">Unknown</span>
                  </div>
                ))}
              </section>
              <aside className="panel">
                <h2>The whole cost.</h2>
                <ul className="list">
                  {[
                    "Items & materials",
                    "Delivery / tax / duties",
                    "Full service price",
                    "Delivered total",
                  ].map((n) => (
                    <li key={n}>
                      {n}
                      <span>Unconfirmed</span>
                    </li>
                  ))}
                </ul>
                {unavailable(capabilityReasons.commerce)}
                <button className="button" disabled>
                  Verified merchant handoff unavailable
                </button>
                {btn("Plan within a budget", "budget", true)}
                {btn("Request a professional quote", "booking", true)}
              </aside>
            </div>
          </>
        );
      case "screenshot":
        return (
          <>
            {heading(
              "Inspiration to a practical checklist.",
              "Identify a hairstyle, makeup, clothing or accessories from an image you have rights to use.",
            )}
            <section className="narrow panel">
              <h2>Screenshot to Shop</h2>
              <p>
                Image matching is not connected. “Exact” needs verified
                source/SKU evidence; visual resemblance alone is “Similar”.
              </p>
              {fields(["Source / permission note", "Component to find"])}
              {unavailable(capabilityReasons.commerce)}
              <button className="button" disabled>
                Upload & match — connection required
              </button>
              {btn("Open look checklist", "complete", true)}
            </section>
          </>
        );
      case "budget":
        return (
          <>
            {heading(
              "Your budget. The whole look.",
              "Plan with delivery, taxes, services and uncertainty included — not just advertised item prices.",
            )}
            <section className="narrow panel">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setMessage(
                    "Plan retained in these fields only. No verified offers exist, so budget fit and arrival cannot be confirmed.",
                  );
                }}
              >
                <label>
                  Total budget
                  <input type="number" min="1" max="1000000" required />
                </label>
                {fields([
                  "Currency",
                  "Location",
                  "Occasion",
                  "Date / arrival deadline",
                ])}
                <label>
                  Preferred approach
                  <select>
                    <option>Best match</option>
                    <option>Lowest full delivered cost</option>
                    <option>Reuse my owned items first</option>
                    <option>Secondhand or rental alternatives</option>
                  </select>
                </label>
                <button className="button">Review planning limits</button>
              </form>
              {unavailable(capabilityReasons.commerce)}
            </section>
          </>
        );
      case "booking":
        return (
          <>
            {heading(
              "A chosen look. A real conversation.",
              "A professional must confirm feasibility, materials, full price and actual appointment availability.",
            )}
            <section className="narrow panel">
              {fields([
                "Service / chosen look",
                "Region",
                "Preferred date",
                "Reference permission",
              ])}
              <label className="check">
                <input type="checkbox" />
                Share only a non-personal style board when a professional is
                connected.
              </label>
              <Notice>
                No request sent. No booking, payment or slot hold exists.
              </Notice>
              <button className="button" disabled>
                Send request — professional connection required
              </button>
            </section>
          </>
        );
      case "wardrobe":
      case "calendar":
      case "groups":
      case "agent":
        return (
          <>
            {heading(
              names[page]!,
              "Plan your style without pressure to buy. These companion workflows await private account and service connections.",
            )}
            <section className="narrow panel">
              {fields(
                page === "wardrobe"
                  ? ["Owned item", "Materials / size", "Care note"]
                  : page === "calendar"
                    ? [
                        "Event",
                        "Local date / timezone",
                        "Time available / dress code",
                      ]
                    : page === "groups"
                      ? [
                          "Group theme",
                          "Occasion",
                          "Permitted shared style board",
                        ]
                      : [
                          "Goal",
                          "Budget / arrival deadline",
                          "Source and obligations",
                        ],
              )}
              <Notice>
                {page === "agent"
                  ? "The agent may prepare proposals. Only you can confirm a verified purchase or booking."
                  : "No private record, invitation or reminder is sent from these planning fields."}
              </Notice>
              <button className="button" disabled>
                Account connection required
              </button>
              {btn("Build a session routine instead", "guide", true)}
            </section>
          </>
        );
    }
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <a href="/" className="brand" aria-label="GLAM AI home">
          <Icon name="spark" /> GLAM <span>AI</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {webTabs.map((n) => (
            <button
              key={n}
              aria-current={page === tabPage[n] ? "page" : undefined}
              onClick={() => go(tabPage[n])}
            >
              {n}
            </button>
          ))}
        </nav>
        <button
          className="account-button"
          aria-label="Open profile"
          onClick={() => go("profile")}
        >
          <Icon name="profile" />
        </button>
      </header>
      <div className="connection-bar">
        <span className="status-dot" />
        Private development build · AI & account connections pending
      </div>
      {!online && (
        <Notice>
          You’re offline. Session notes remain available; no upload or
          transaction is submitted.
        </Notice>
      )}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="consumer-main"
      >
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {message && <Notice>{message}</Notice>}
        {content()}
      </main>
      <footer className="site-footer">
        <a className="brand" href="/">
          GLAM AI
        </a>
        <span>Understand your features. Explore your possibilities.</span>
        <div>
          <button onClick={() => go("privacy")}>Privacy</button>
          <a href="/business">Business portal</a>
          <a href="/admin">Admin</a>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="Personal navigation">
        {mobileTabs.map((n, i) => (
          <button
            key={n}
            aria-current={page === tabPage[n] ? "page" : undefined}
            onClick={() => go(tabPage[n])}
          >
            <Icon
              name={["home", "analyze", "studio", "advisor", "profile"][i]}
            />
            <span>{n}</span>
          </button>
        ))}
      </nav>
      <dialog
        ref={modalRef}
        onCancel={() => setShowSwitcher(false)}
        onClose={() => setShowSwitcher(false)}
        aria-labelledby="workspace-title"
      >
        <div className="dialog-heading">
          <h2 id="workspace-title">Switch workspace</h2>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close workspace switcher"
            onClick={() => setShowSwitcher(false)}
          >
            ×
          </button>
        </div>
        <p>
          One identity. Only approved roles appear after sign-in and
          verification.
        </p>
        <div className="workspace-personal">
          <strong>Personal</strong>
          <span>Current workspace</span>
        </div>
        <Notice>
          {capabilityReasons.account} No business workspaces are authorized.
        </Notice>
        <a className="button secondary" href="/business">
          View business tools & requirements
        </a>
      </dialog>
    </>
  );
}
