"use client";
import BrandLogo from "./BrandLogo";

import PhotoCapture from "./PhotoCapture";
import { supportedPhoto } from "../lib/photo-file";
import { appPath, sectionFromPath, capabilitiesPath } from "../lib/paths";
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

import { BeautyAnalysis, BeautyStudio, BeautyColor } from "./BeautyExperience";
import { studioPart } from "../../../packages/product/beauty";
import { editorialProducts } from "../../../packages/product/editorial-products";
import GoldenCommerce from "./GoldenCommerce";
import CreatorStudio from "./CreatorStudio";
import HostedAccount, { hostedAccountConfigured } from "./HostedAccount";
import { useAccountSession } from "../lib/use-account-session";
import PersonalizedResults from "./PersonalizedResults";
import VerifiedProductDetail from "./VerifiedProductDetail";
import DestinationStylist from "./DestinationStylist";
import MarketplaceJourney from "./MarketplaceJourney";
import { usePersonalResults } from "../../../packages/product/use-personal-results";
import { useDestination } from "../../../packages/product/use-destination";
import { useMarketplace } from "../../../packages/product/use-marketplace";
import type { CompanionConnection } from "../../../packages/product/companion";
import StylingJourney from "./StylingJourney";
import {
  durableJourney,
  freshJourney,
  restoreJourney,
} from "../../../packages/product/journey";
import ContextualRecommendations from "./ContextualRecommendations";
import {
  contextualReportFields,
  analysisContexts,
} from "../../../packages/product/catalog";
import type {
  AnalysisContext,
  RequirementDraft,
} from "../../../packages/product/catalog";

export const pages: Page[] = [
  "offer",
  "results",
  "destination",
  "cart",
  "checkout",
  "orders",
  "shop",
  "product",
  "home",
  "event",
  "builder",
  "analyze",
  "hair",
  "skin",
  "body-fit",
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
export default function GlamApp({
  start = "home",
  connection,
  onAccountNavigate,
}: {
  start?: Page;
  connection?: CompanionConnection;
  onAccountNavigate?: (path: string) => void;
}) {
  const {session:hostedSession,setSession:setHostedSession,error:accountError,retry:retryAccount}=useAccountSession(path=>{const next=sectionFromPath(path) as Page;if(pages.includes(next))go(next);});
  const [journey, setJourney] = useState(freshJourney);
  const [memoryReady, setMemoryReady] = useState(false);
  const [memoryError, setMemoryError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("glam.approved-profile.v1");
      if (raw) setJourney(restoreJourney(raw));
    } catch {
      setMemoryError(
        "Browser memory is unavailable. Your plan remains session-only.",
      );
    }
    setMemoryReady(true);
  }, []);
  useEffect(() => {
    if (!memoryReady) return;
    try {
      if (journey.remember)
        localStorage.setItem(
          "glam.approved-profile.v1",
          durableJourney(journey),
        );
      else localStorage.removeItem("glam.approved-profile.v1");
      setMemoryError("");
    } catch {
      setMemoryError(
        "Your changes could not be remembered. Keep this tab open; browser storage may be full or restricted.",
      );
    }
  }, [journey, memoryReady]);
  const [state, dispatch] = useReducer(personalReducer, {
    ...initialPersonal,
    page: start,
  });
  const [savedRequirements, setSavedRequirements] = useState<
    RequirementDraft[]
  >([]);
  const [editorialProduct, setEditorialProduct] = useState(0);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const personal = usePersonalResults(connection, photo?.uri, state.goals);
  const trip = useDestination(connection);
  const marketplace = useMarketplace(connection, journey);
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
  const [activeWorkspace,setActiveWorkspace]=useState<string|null>(null);
  useEffect(()=>{if(!hostedSession?.workspaces?.some(w=>w.organization_id+':'+w.workspace===activeWorkspace))setActiveWorkspace(null);},[hostedSession,activeWorkspace]);
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const switchButton = useRef<HTMLButtonElement>(null);
  const page = state.page;
  const recommendationContext: AnalysisContext =
    state.page === "hair"
      ? "hair"
      : state.page === "skin"
        ? "skin"
        : state.page === "body-fit"
          ? "body-fit"
          : state.page === "color"
            ? "color"
            : state.page === "guide"
              ? "routine"
              : state.page === "studio"
                ? state.tool === "Makeup Match"
                  ? "makeup-match"
                  : "makeover"
                : "face";

  useEffect(() => {
    const pop = () => {
      const p = sectionFromPath(location.pathname);
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
    history.pushState(null, "", appPath(next === "home" ? "/" : "/" + next));
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
  async function preparePhoto(file: File) {
    const ticket = ++selection.current;
    setError("");
    if (!consent) {
      setError("Choose local-preview permission first.");
      return;
    }
    if (file.size > 10485760) {
      setError("Choose a JPEG, PNG or WebP image smaller than 10 MB.");
      return;
    }
    setPhotoBusy(true);
    let uri: string | null = null;
    try {
      const supported = await supportedPhoto(file);
      if (ticket !== selection.current) return;
      if (!supported) {
        setError("Choose a JPEG, PNG or WebP image. HEIC files must be exported as JPEG first.");
        return;
      }
      uri = URL.createObjectURL(file);
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
        return;
      }
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.uri);
      photoRef.current = candidate;
      setPhoto(candidate);
      go("quality");
    } catch {
      if (uri) URL.revokeObjectURL(uri);
      if (ticket === selection.current)
        setError("This image could not be opened. Try another image.");
    } finally {
      if (ticket === selection.current) setPhotoBusy(false);
    }
  }
  async function choosePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await preparePhoto(file);
  }
  async function checkAnalysis() {
    if (checking) return;
    setChecking(true);
    setError("");
    setMessage(
      "Checking service availability only. No analysis job is running.",
    );
    try {
      const r = await fetch(capabilitiesPath(), { cache: "no-store" });
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
      hostedAccountConfigured
        ? "Routine saved for this session. To save an account routine, sign in from Profile."
        : "Routine saved for this session. Account sync is not connected.",
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
    if (page === "offer")
      return <VerifiedProductDetail market={marketplace} go={go} />;
    if (page === "results")
      return (
        <PersonalizedResults
          photo={photo}
          personal={personal}
          connection={connection}
          go={go}
          onDirection={(d) => {
            personal.choose(d);
            dispatch({ type: "tool", value: d.tool });
            dispatch({ type: "style", value: d.style });
            go("studio");
          }}
        />
      );
    if (page === "destination")
      return <DestinationStylist trip={trip} connection={connection} go={go} />;
    if (["cart", "checkout", "orders"].includes(page))
      return (
        <MarketplaceJourney
          page={page}
          market={marketplace}
          connection={connection}
          go={go}
        />
      );
    if (page === "shop" || page === "product")
      return (
        <GoldenCommerce
          page={page}
          data={journey}
          setData={setJourney}
          selected={editorialProduct}
          select={setEditorialProduct}
          go={go}
          studio={() => {
            dispatch({
              type: "tool",
              value:
                editorialProducts[editorialProduct].category === "Hair"
                  ? "Hair Try-On"
                  : editorialProducts[editorialProduct].category === "Skincare"
                    ? "Glow-Up Preview"
                    : "Makeup Match",
            });
            dispatch({ type: "style", value: styles[0] });
            go("studio");
          }}
        />
      );
    if (
      [
        "home",
        "advisor",
        "event",
        "screenshot",
        "builder",
        "complete",
        "wardrobe",
      ].includes(page)
    )
      return (
        <StylingJourney
          page={page}
          data={journey}
          setData={setJourney}
          go={go}
        />
      );
    switch (page) {
      case "analyze":
        return <BeautyAnalysis go={go} />;
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
              <p id="photo-consent-help" className="fine">{consent ? "Choose a file or open your camera for a private preview." : "Tick the permission checkbox above to choose or take a photo."}</p>
              <div className="actions">
                <button type="button" className="button" disabled={!consent || photoBusy} onClick={() => inputRef.current?.click()} aria-describedby="photo-consent-help">Choose a photo</button>
                <PhotoCapture allowed={consent && !photoBusy} onPhoto={file => void preparePhoto(file)} />
              </div>
              <input ref={inputRef} data-testid="photo-input" aria-label="Choose a photo file" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={!consent || photoBusy} onChange={choosePhoto} />
              {error && <p className="error" role="alert">{error}</p>}
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
              {btn("Open Personalized Results", "results", true)}
            </section>
          </>
        );
      case "hair":
      case "skin":
      case "body-fit":
      case "report":
        return (
          <div
            className={page === "report" ? "golden-analysis-report" : undefined}
          >
            {heading(
              recommendationContext === "face"
                ? "Your personal analysis."
                : analysisContexts.find((n) => n.id === recommendationContext)!
                    .title,
              "A report will explain estimates, their limits and practical options. There is no analysis result yet.",
            )}
            {page === "report" && (
              <div className="golden-report-progress">
                <span>
                  01 / Photo{" "}
                  <strong>
                    {photo ? "Local preview only" : "Not selected"}
                  </strong>
                </span>
                <span>
                  02 / Goals{" "}
                  <strong>
                    {state.goals.length ? "Your choices" : "Choose your goals"}
                  </strong>
                </span>
                <span>
                  03 / Analysis <strong>Not computed</strong>
                </span>
              </div>
            )}
            {btn("Open Personalized Results", "results", true)}
            <h2>Your Results</h2>
            <div className="report-layout">
              <section className="panel report-visual">
                <Icon name="analyze" />
                <h2>No photo analyzed</h2>
                <p>
                  Your image stays on this device until you explicitly authorize
                  a qualified service.
                </p>
                {photo ? (
                  <img src={photo.uri} alt="Unanalyzed local original" />
                ) : page === "report" ? (
                  <div
                    className="golden-report-reference"
                    role="img"
                    aria-label="Editorial portrait guide, not a personal analysis"
                  />
                ) : null}
                {btn("Prepare a photo", "consent", true)}
              </section>
              <div className="report-fields">
                {contextualReportFields[recommendationContext].map((n) => (
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
          </div>
        );
      case "color":
        return (
          <>
            {heading(
              "Find your colors.",
              "Personal color suggestions depend on lighting, camera and a qualified analysis. They are not rules about what you can wear.",
            )}
            <BeautyColor photo={photo} />
            <h2>Your Results</h2>
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
            <h2>Your Results</h2>
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
          <BeautyStudio
            photo={photo}
            tool={state.tool}
            style={state.style}
            intensity={state.intensity}
            compare={compare}
            onTool={(value) => dispatch({ type: "tool", value })}
            onStyle={(value) => dispatch({ type: "style", value })}
            onIntensity={(value) => dispatch({ type: "intensity", value })}
            onCompare={setCompare}
            reset={() => {
              dispatch({ type: "style", value: styles[0] });
              dispatch({ type: "intensity", value: 35 });
              setCompare(50);
              setMessage(
                "Controls reset. The original image was never changed.",
              );
            }}
            carry={(value) => {
              setJourney((p) => ({
                ...p,
                look: {
                  ...p.look,
                  parts: {
                    ...p.look.parts,
                    [studioPart(state.tool)]: value,
                  },
                },
              }));
              go("builder");
            }}
            go={go}
            personal={personal}
            connection={connection}
          />
        );
      case "profile":
        return (
          <>
            {heading(
              "Your space. Your choices.",
              "Your goals, private routines, saved results and authorized workspaces.",
            )}
            <StylingJourney
              page="profile"
              accountAvailable={hostedAccountConfigured}
              data={journey}
              setData={setJourney}
              go={go}
            />
            <div className="split">
              <section className="panel">
                {accountError && <p role="alert">{accountError} <button className="text-button" onClick={()=>retryAccount()}>Retry account connection</button></p>}
                <HostedAccount session={hostedSession} setSession={setHostedSession} />
                <CreatorStudio key={hostedSession?.profile.id || "guest"} token={hostedSession?.token} />
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
                  {hostedAccountConfigured
                    ? "Account details & routines"
                    : "Account sync"}
                  <span>
                    {hostedAccountConfigured
                      ? (hostedSession ? "Signed in" : "Sign in required")
                      : "Not connected"}
                  </span>
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
                  setSavedRequirements([]);
                  setJourney(freshJourney());
                  setMessage(
                    "All app-session photo previews, interests and routines cleared.",
                  );
                  history.replaceState(null, "", appPath("/"));
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
    <div
      className={
        ["home", "analyze", "studio"].includes(page)
          ? "beauty-shell"
          : "app-shell"
      }
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <a href={appPath("/")} className="brand" aria-label="GLAM Beauty home">
          <BrandLogo />
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
          className="market-trigger"
          onClick={() => go("complete")}
          aria-label="Change shopping location"
        >
          {journey.city || journey.country || "Shopping destination"} ·{" "}
          {journey.currency}
        </button>
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
        {hostedAccountConfigured
          ? `${hostedSession ? "Signed in" : "Sign-in available"} · AI and shopping connections pending`
          : "Interactive preview · AI, account & commerce connections pending"}
      </div>
      {accountError && !hostedSession && <Notice>{accountError} <button className="text-button" onClick={()=>go("profile")}>Choose a sign-in method</button></Notice>}
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
        {error && page !== "consent" && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {message && <Notice>{message}</Notice>}
        {memoryError && (
          <div role="alert" className="error">
            {memoryError}
          </div>
        )}
        {memoryReady ? (
          content()
        ) : (
          <p role="status" className="inline-status">
            Opening your private GLAM space…
          </p>
        )}
        {page === "complete" && (
          <div className="companion-link-row">
            <button className="button secondary" onClick={() => go("cart")}>
              Open my cart
            </button>
            <button className="button secondary" onClick={() => go("orders")}>
              Check order status
            </button>
          </div>
        )}
        {["report", "hair", "skin", "body-fit", "color", "guide"].includes(
          page,
        ) && (
          <div className="result-next">
            <span>Keep your journey connected.</span>
            {btn("Shape my complete look", "builder", true)}
            {btn("Get This Look", "complete")}
          </div>
        )}
        {[
          "results",
          "complete",
          "report",
          "hair",
          "skin",
          "body-fit",
          "color",
          "guide",
          "studio",
        ].includes(page) && (
          <ContextualRecommendations
            key={recommendationContext}
            context={recommendationContext}
            saved={savedRequirements}
            onSave={(r) => setSavedRequirements([...savedRequirements, r])}
            onDelete={(id) =>
              setSavedRequirements(savedRequirements.filter((r) => r.id !== id))
            }
            onComplete={() => go("complete")}
            connection={connection}
            location={journey}
            onLocation={(location) =>
              setJourney((s) => ({ ...s, ...location }))
            }
            onReview={async (match, requirement) => {
              go("cart");
              await marketplace.request("offer", match, requirement);
            }}
          />
        )}
      </main>
      <footer className="site-footer">
        <a className="brand" href={appPath("/")}>
          <BrandLogo />
        </a>
        <span>Understand your features. Explore your possibilities.</span>
        <div>
          <button onClick={() => go("privacy")}>Privacy</button>
          <a href={appPath("/business")} onClick={event => { if(onAccountNavigate){event.preventDefault();onAccountNavigate("/business");} }}>Business portal</a>
          <a href={appPath("/admin")} onClick={event => { if(onAccountNavigate){event.preventDefault();onAccountNavigate("/admin");} }}>Admin</a>
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
          <span>{activeWorkspace ? "Available personal workspace" : "Current workspace"}</span>
          {hostedSession && <button className="text-button" onClick={()=>{setActiveWorkspace(null);setShowSwitcher(false);}}>Use Personal</button>}
        </div>
        {hostedSession?.workspaces?.map(w=><button className="button secondary" key={w.organization_id+':'+w.workspace} aria-pressed={activeWorkspace===w.organization_id+':'+w.workspace} onClick={()=>{setActiveWorkspace(w.organization_id+':'+w.workspace);setShowSwitcher(false);setMessage(`Active workspace: ${w.name} · ${w.workspace}. Permissions are checked by the server.`);}}>{w.name} · {w.workspace}</button>)}
        <Notice>
          {hostedAccountConfigured
            ? hostedSession
              ? (hostedSession.workspaces?.length ? "Only server-authorized workspaces are shown. Business execution still depends on its connected services." : "No verified business workspace is available for this account.")
              : "Sign in to load your authorized workspaces. Signing in does not grant business permissions."
            : `${capabilityReasons.account} No business workspaces are authorized.`}
        </Notice>
        <a className="button secondary" href={appPath("/business")} onClick={event => { if(onAccountNavigate){event.preventDefault();onAccountNavigate("/business");} }}>
          View business tools & requirements
        </a>
      </dialog>
    </div>
  );
}
