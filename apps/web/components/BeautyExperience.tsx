"use client";
import {
  rememberChoice,
  undoChoice,
} from "../../../packages/product/studio-history";
import type { StudioChoice } from "../../../packages/product/studio-history";
import { useState } from "react";
import type { Page, Photo } from "../../../packages/product/platform";
import { tools } from "../../../packages/product/platform";
import {
  beautyCategories,
  beautyEdits,
  shadeFamilies,
  colorMoods,
  studioDirections,
} from "../../../packages/product/beauty";
import type { BeautyCategory } from "../../../packages/product/beauty";
import { goalJourneys } from "../../../packages/product/journey";
import type { Journey } from "../../../packages/product/journey";
export function BeautyIcon({ kind = "arrow" }: { kind?: string }) {
  const p: Record<string, string> = {
    arrow: "M5 12h14m-5-5 5 5-5 5",
    scan: "M3 8V3h5m8 0h5v5m0 8v5h-5m-8 0H3v-5M8 10h.1m8 0h.1M9 16q3 2 6 0",
    spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
    heart: "M12 20C-5 9 6-1 12 6c6-7 17 3 0 14z",
    plus: "M12 4v16M4 12h16",
    camera: "M3 7h5l2-3h4l2 3h5v13H3zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={p[kind] || p.spark} />
    </svg>
  );
}
export function BeautyPortrait({
  panel = 0,
  className = "",
}: {
  panel?: number;
  className?: string;
}) {
  return (
    <div
      className={`beauty-portrait beauty-panel-${panel} ${className}`}
      role="img"
      aria-label="Original fictional adult editorial portrait, not a personal analysis or generated makeover"
    />
  );
}
const categoryCopy: Record<
  BeautyCategory,
  { title: string; copy: string; panel: number; route: Page }
> = {
  Makeup: {
    title: "Meet your\nsignature glow.",
    copy: "Makeup that starts with you.",
    panel: 0,
    route: "analyze",
  },
  Hair: {
    title: "A fresh take.\nStill all you.",
    copy: "Explore your next hair direction.",
    panel: 1,
    route: "studio",
  },
  Skincare: {
    title: "Your skin.\nA little clarity.",
    copy: "Understand appearance, explore care.",
    panel: 2,
    route: "skin",
  },
  Clothing: {
    title: "Wear your\npoint of view.",
    copy: "Style the occasion. Keep your identity.",
    panel: 3,
    route: "event",
  },
};
export function BeautyHome({
  data: s,
  go,
  setup,
}: {
  data: Journey;
  go: (p: Page) => void;
  setup: () => void;
}) {
  const [category, setCategory] = useState<BeautyCategory>("Makeup");
  const c = categoryCopy[category];
  return (
    <div className="beauty-home">
      <div className="beauty-welcome">
        <div>
          <span className="beauty-kicker">YOUR DAILY DOSE OF YOU</span>
          <h1>
            {s.onboarded
              ? "Welcome back" + (s.name ? ", " + s.name : "") + "."
              : "Your next look."}
          </h1>
        </div>
        <span className="beauty-mark">
          <BeautyIcon kind="spark" />
        </span>
      </div>
      <div className="beauty-entry">
        <button className="beauty-primary" onClick={() => go("analyze")}>
          <BeautyIcon kind="scan" />
          Analyze My Face
          <BeautyIcon />
        </button>
        <button className="beauty-outline" onClick={() => go("advisor")}>
          <BeautyIcon kind="spark" />
          Ask My Personal Stylist
          <BeautyIcon />
        </button>
      </div>
      <div className="beauty-feature-layout">
        <section className="beauty-feature">
          <div
            className="beauty-category"
            aria-label="Explore a beauty category"
          >
            {beautyCategories.map((n) => (
              <button
                key={n}
                aria-pressed={category === n}
                onClick={() => setCategory(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="beauty-campaign">
            <BeautyPortrait panel={c.panel} />
            <span className="campaign-tag">
              THE GLAM EDIT <span>01 / 04</span>
            </span>
            <div className="campaign-copy">
              <p>BEAUTY, ON YOUR TERMS</p>
              <h2>{c.title}</h2>
              <span>{c.copy}</span>
              <button className="beauty-primary" onClick={() => go(c.route)}>
                {category === "Makeup"
                  ? "Begin analysis"
                  : "Explore " + category.toLowerCase()}
                <BeautyIcon />
              </button>
            </div>
            <span className="editorial-credit">Editorial inspiration</span>
          </div>
        </section>
        <section className="beauty-side">
          <div className="beauty-side-title">
            <span className="beauty-kicker">MORE THAN A FILTER</span>
            <h2>
              Your own kind
              <br />
              <em>of beautiful.</em>
            </h2>
            <p>
              Understand your features. Try a direction. Bring your look to
              life.
            </p>
          </div>
          <button className="palette-teaser" onClick={() => go("color")}>
            <div className="teaser-orbit">
              <BeautyPortrait panel={2} />
            </div>
            <div>
              <span>FIND YOUR COLOR STORY</span>
              <h3>
                A palette with
                <br />
                possibility.
              </h3>
              <span className="teaser-arrow">
                <BeautyIcon />
              </span>
            </div>
          </button>
          <button className="stylist-teaser" onClick={() => go("event")}>
            <BeautyIcon kind="spark" />
            <span>
              <small>AN OCCASION COMING UP?</small>
              <strong>Let’s style the moment.</strong>
            </span>
            <BeautyIcon />
          </button>
        </section>
      </div>
      <section className="beauty-edit-section">
        <div className="beauty-section-heading">
          <div>
            <span className="beauty-kicker">THE INSPIRATION ROOM</span>
            <h2>Find a feeling. Make it yours.</h2>
          </div>
          <button onClick={() => go("studio")}>
            Explore Studio <BeautyIcon />
          </button>
        </div>
        <div className="beauty-edit-row">
          {beautyEdits.map((v, i) => (
            <button
              className="beauty-edit-card"
              key={v.name}
              onClick={() => go("studio")}
            >
              <div className="beauty-edit-image">
                <BeautyPortrait panel={v.panel} />
                <span>0{i + 1}</span>
                <span className="edit-open">
                  <BeautyIcon />
                </span>
              </div>
              <h3>{v.name}</h3>
              <p>{v.detail}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="beauty-goals">
        <div className="beauty-section-heading">
          <div>
            <span className="beauty-kicker">START WITH WHAT YOU NEED</span>
            <h2>A little direction. A whole look.</h2>
          </div>
        </div>
        <div className="beauty-goal-grid">
          {goalJourneys.map((v, i) => (
            <button key={v.title} onClick={() => go(v.page)}>
              <span>0{i + 1}</span>
              <strong>{v.title}</strong>
              <BeautyIcon />
            </button>
          ))}
        </div>
      </section>
      <section className="beauty-memory">
        <BeautyIcon kind="heart" />
        <div>
          <span className="beauty-kicker">YOUR GLAM SPACE</span>
          <h2>{s.onboarded ? s.look.title : "Good style gets personal."}</h2>
          <p>
            {s.onboarded
              ? `${s.saved.length} saved looks · ${s.wardrobe.length} wardrobe items`
              : "Keep the looks you love. Build on what you own."}
          </p>
        </div>
        <button
          className="beauty-outline"
          onClick={() => (s.onboarded ? go("builder") : setup())}
        >
          {s.onboarded ? "Continue my look" : "Set up my GLAM Profile"}
          <BeautyIcon />
        </button>
      </section>
    </div>
  );
}
export function BeautyAnalysis({ go }: { go: (p: Page) => void }) {
  const [focus, setFocus] = useState("Features");
  return (
    <div className="beauty-analysis">
      <header className="beauty-page-header">
        <span className="beauty-kicker">
          A NEW WAY TO SEE YOUR POSSIBILITIES
        </span>
        <h1>
          Beauty begins
          <br />
          with <em>understanding.</em>
        </h1>
        <p>Your features are a starting point, never a score.</p>
      </header>
      <div className="beauty-analysis-layout">
        <section className="capture-preview">
          <BeautyPortrait panel={2} />
          <div className="capture-label">
            <span className="tiny-dot" />
            LOCAL PHOTO PREPARATION
          </div>
          <div className="face-framing" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="capture-caption">
            Your own photo comes next.
            <br />
            This is editorial inspiration.
          </span>
          <button
            className="capture-shutter"
            aria-label="Start Face Analysis"
            onClick={() => go("consent")}
          >
            <BeautyIcon kind="camera" />
          </button>
        </section>
        <section className="analysis-detail">
          <span className="beauty-kicker">PERSONAL, WITHOUT THE PRESSURE</span>
          <h2>
            Your face.
            <br />A world of possibility.
          </h2>
          <div className="analysis-focus" aria-label="Explore analysis topics">
            {["Features", "Colors", "Your guide"].map((n) => (
              <button
                key={n}
                aria-pressed={focus === n}
                onClick={() => setFocus(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="focus-explanation">
            <BeautyIcon kind={focus === "Features" ? "scan" : "spark"} />
            <h3>
              {focus === "Features"
                ? "Understand your starting point"
                : focus === "Colors"
                  ? "Explore what color can do"
                  : "Turn insight into a routine"}
            </h3>
            <p>
              {focus === "Features"
                ? "Face shape, eyes, brows and lips — with room for uncertainty and your own corrections."
                : focus === "Colors"
                  ? "Explore palettes and undertones. Personal color findings require a completed analysis."
                  : "Practical steps, from the tools you already own to techniques you want to learn."}
            </p>
          </div>
          <ol className="capture-steps">
            <li>
              <span>01</span>Choose your photo
              <small>Permission first. Private by default.</small>
            </li>
            <li>
              <span>02</span>Tell us your goals
              <small>You decide what you want to explore.</small>
            </li>
            <li>
              <span>03</span>Make the guidance yours
              <small>Personal findings require connected analysis.</small>
            </li>
          </ol>
          <button className="beauty-primary" onClick={() => go("consent")}>
            Choose my photo <BeautyIcon />
          </button>
          <button className="beauty-text" onClick={() => go("goals")}>
            Explore without a photo
          </button>
          <p className="beauty-fine">
            No facial recognition. No attractiveness ranking. Analysis is not
            connected yet.
          </p>
          <div className="analysis-other">
            {[
              ["Hair Analysis", "hair"],
              ["Skin Appearance Analysis", "skin"],
              ["Body & Fit Styling", "body-fit"],
              ["Open Color Analysis", "color"],
            ].map(([label, p]) => (
              <button key={p} onClick={() => go(p as Page)}>
                {label}
                <BeautyIcon />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
import type { PersonalResultsState } from "../../../packages/product/use-personal-results";
import type { CompanionConnection } from "../../../packages/product/companion";
type StudioProps = {
  personal?: PersonalResultsState;
  connection?: CompanionConnection;
  photo: Photo | null;
  tool: string;
  style: string;
  intensity: number;
  compare: number;
  onTool: (s: string) => void;
  onStyle: (s: string) => void;
  onIntensity: (s: number) => void;
  onCompare: (s: number) => void;
  reset: () => void;
  carry: (value: string) => void;
  go: (p: Page) => void;
};
export function BeautyStudio(p: StudioProps) {
  const [processingPermission, setProcessingPermission] = useState(false);
  const [family, setFamily] = useState<keyof typeof shadeFamilies>("Rose");
  const [shade, setShade] = useState(2);
  const [preset, setPreset] = useState(0);
  const [saved, setSaved] = useState(false);
  const [choiceHistory, setChoiceHistory] = useState<StudioChoice[]>([]);
  const [actionNotice, setActionNotice] = useState("");
  const remember = () =>
    setChoiceHistory((h) =>
      rememberChoice(h, {
        tool: p.tool,
        style: p.style,
        intensity: p.intensity,
        family,
        shade,
        preset,
        marked: saved,
      }),
    );
  function restorePrevious() {
    const previous = undoChoice(choiceHistory);
    if (!previous.choice) return;
    const c = previous.choice;
    setChoiceHistory(previous.history);
    p.onTool(c.tool);
    p.onStyle(c.style);
    p.onIntensity(c.intensity);
    setFamily(c.family);
    setShade(c.shade);
    setPreset(c.preset);
    setSaved(c.marked);
    setActionNotice(
      "Previous choices restored. Your original photo is unchanged.",
    );
  }
  function resetChoices() {
    remember();
    p.reset();
    setFamily("Rose");
    setShade(2);
    setPreset(0);
    setSaved(false);
    setActionNotice("Choices reset. Your original photo was never changed.");
  }
  async function copyBrief() {
    const text = `My GLAM styling brief: ${p.tool}; ${p.style}; ${family} reference color ${shade + 1}; intensity request ${p.intensity}%. No generated preview or product compatibility is implied.`;
    try {
      await navigator.clipboard.writeText(text);
      setActionNotice(
        "Styling brief copied. No photo or private analysis was included.",
      );
    } catch {
      setActionNotice(
        "Clipboard is unavailable. Your choices remain in this editor; no photo or message was shared.",
      );
    }
  }

  return (
    <div className="beauty-studio">
      <header className="studio-title-row">
        <div>
          <span className="beauty-kicker">YOUR EXPRESSION LAB</span>
          <h1>
            Make it <em>your own.</em>
          </h1>
        </div>
        <button className="beauty-outline" onClick={() => p.go("consent")}>
          <BeautyIcon kind="plus" />
          Your photo
        </button>
      </header>
      <div className="beauty-editor">
        <aside className="editor-tools">
          <span className="beauty-kicker">MAKE IT YOURS</span>
          {tools.map((v, i) => (
            <button
              key={v}
              aria-pressed={p.tool === v}
              onClick={() => {
                remember();
                p.onTool(v);
                p.onStyle("Natural");
              }}
            >
              <BeautyIcon kind={i === 1 ? "scan" : "spark"} />
              <span>{v}</span>
              <BeautyIcon />
            </button>
          ))}
          <div className="editor-note">
            <strong>Your original stays yours.</strong>
            <p>
              Every reference here is inspiration. A personal transformation
              needs connected generation.
            </p>
          </div>
        </aside>
        <section className="editor-stage">
          {p.photo ? (
            <img
              className="editor-original"
              src={p.photo.uri}
              alt="Your unchanged local original. No makeover generated."
            />
          ) : (
            <BeautyPortrait panel={beautyEdits[preset].panel} />
          )}
          <div className="editor-topline">
            <span className="canvas-label">
              {p.photo
                ? "Original · Unchanged"
                : "Editorial reference · Not your result"}
            </span>
            <button
              aria-label={
                saved
                  ? "Remove session inspiration favorite"
                  : "Favorite this inspiration for this session"
              }
              aria-pressed={saved}
              onClick={() => {
                remember();
                setSaved(!saved);
              }}
              className={saved ? "editor-heart favorited" : "editor-heart"}
            >
              <BeautyIcon kind="heart" />
            </button>
          </div>
          <div className="editor-stage-caption">
            <span>{p.tool.toUpperCase()}</span>
            <h2>{beautyEdits[preset].name}</h2>
            <p>
              {p.photo
                ? "Your original photo has not been edited."
                : "Reference portrait — not a generated preview."}
            </p>
          </div>
          <span className="editor-side-label">
            GLAM STUDIO / {String(preset + 1).padStart(2, "0")}
          </span>
        </section>
        <section className="editor-drawer">
          <div className="drawer-heading">
            <div>
              <span className="beauty-kicker">THE FINISHING TOUCHES</span>
              <h2>Pick your direction.</h2>
            </div>
            <span>01 / 03</span>
          </div>
          <div className="golden-studio-toolbar">
            <button disabled={!choiceHistory.length} onClick={restorePrevious}>
              Undo choice
            </button>
            <button onClick={resetChoices}>Reset to original</button>
            <button onClick={copyBrief}>Copy my brief</button>
          </div>
          <div className="inspiration-thumbs" aria-label="Editorial references">
            {beautyEdits.map((v, i) => (
              <button
                aria-label={v.name}
                className={preset === i ? "active" : ""}
                aria-pressed={preset === i}
                key={v.name}
                onClick={() => {
                  remember();
                  setPreset(i);
                }}
              >
                <BeautyPortrait panel={v.panel} />
                <span>{v.name}</span>
              </button>
            ))}
          </div>
          <div className="shade-heading">
            <h3>Color mood</h3>
            <span>Illustrative swatches</span>
          </div>
          <div className="shade-families">
            {Object.keys(shadeFamilies).map((v) => (
              <button
                key={v}
                aria-pressed={family === v}
                onClick={() => {
                  remember();
                  setFamily(v as keyof typeof shadeFamilies);
                  setShade(2);
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="beauty-swatches">
            {shadeFamilies[family].map((c, i) => (
              <button
                key={c}
                style={{ "--swatch": c } as React.CSSProperties}
                aria-label={`${family} swatch ${i + 1}`}
                aria-pressed={shade === i}
                onClick={() => {
                  remember();
                  setShade(i);
                }}
              />
            ))}
          </div>
          <p className="shade-description">
            {family} / {String(shade + 1).padStart(2, "0")} · Reference color,
            not a verified product shade
          </p>
          <label>
            Style direction
            <select
              value={p.style}
              onChange={(e) => {
                remember();
                p.onStyle(e.target.value);
              }}
            >
              {studioDirections(p.tool).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Requested intensity: {p.intensity}%
            <input
              aria-label="Requested intensity"
              type="range"
              min="0"
              max="100"
              value={p.intensity}
              onChange={(e) => {
                remember();
                p.onIntensity(Number(e.target.value));
              }}
            />
          </label>
          <label>
            Comparison handle
            <input
              aria-label="Comparison handle"
              type="range"
              min="0"
              max="100"
              value={p.compare}
              disabled
              title="A qualified generated preview is required before comparison."
              onChange={(e) => p.onCompare(Number(e.target.value))}
            />
          </label>
          {p.personal?.direction && (
            <section className="personal-preview-panel">
              <h2>{p.personal.direction.title}</h2>
              <p>{p.personal.direction.rationale}</p>
              <p>
                Your corrections accompany this request. The original photo
                stays unchanged.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={processingPermission}
                  onChange={(e) => setProcessingPermission(e.target.checked)}
                />
                I authorize virtual try-on processing with the connected
                service.
              </label>
              <button
                className="beauty-primary"
                disabled={
                  !p.connection?.tryOn ||
                  !processingPermission ||
                  !!p.personal.busy
                }
                onClick={() => p.personal?.run("preview")}
              >
                {p.personal.busy === "preview"
                  ? "Generating your preview…"
                  : p.connection?.tryOn
                    ? "Generate my chosen look"
                    : "Try-on connection required"}
              </button>
              {p.personal.error && <p role="alert">{p.personal.error}</p>}
              {p.personal.preview && p.photo && (
                <>
                  <p>
                    Generated by {p.personal.preview.provider}. A visualization,
                    not a fit or product-availability guarantee.
                  </p>
                  <div className="personal-actual-comparison">
                    <img
                      src={p.personal.preview.imageUrl}
                      alt="Qualified personal virtual try-on"
                      referrerPolicy="no-referrer"
                    />
                    <img
                      src={p.photo.uri}
                      alt="Your unchanged original"
                      style={{ clipPath: `inset(0 ${100 - p.compare}% 0 0)` }}
                    />
                    <span>Original</span>
                    <span>Try-on</span>
                    <input
                      type="range"
                      aria-label="Personal preview comparison"
                      value={p.compare}
                      onChange={(e) => p.onCompare(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </section>
          )}
          {!p.personal?.direction && (
            <>
              <div className="golden-compare-pending">
                <strong>Before / after unlocks with a real preview.</strong>
                <p>
                  No generated comparison yet. Intensity prepares a request, not
                  a live effect. Your original stays unchanged.
                </p>
              </div>
              <button className="beauty-primary" disabled>
                Generate — connection required <BeautyIcon kind="spark" />
              </button>
            </>
          )}
          <div className="golden-studio-actions-primary">
            <button
              className="beauty-primary"
              onClick={() =>
                p.carry(
                  p.tool === "Makeup Match"
                    ? `${p.style} · ${family} color mood ${String(shade + 1).padStart(2, "0")} (illustrative)`
                    : p.style,
                )
              }
            >
              Use direction in my look <BeautyIcon />
            </button>
            <button className="beauty-outline" onClick={() => p.go("complete")}>
              Get This Look
              <BeautyIcon />
            </button>
          </div>
          {actionNotice && (
            <p role="status" className="golden-studio-live-status">
              {actionNotice}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
export function BeautyColor({ photo }: { photo: Photo | null }) {
  const [mood, setMood] = useState<keyof typeof colorMoods>("Warm neutrals");
  const [color, setColor] = useState(0);
  return (
    <section className="beauty-color-explorer">
      <div className="color-explorer-copy">
        <span className="beauty-kicker">PLAY WITH POSSIBILITY</span>
        <h2>
          A little color.
          <br />A different feeling.
        </h2>
        <p>
          Explore a color story before your personal analysis. These palettes
          are inspiration, not a season or undertone result.
        </p>
        <div className="color-mood-tabs">
          {Object.keys(colorMoods).map((v) => (
            <button
              key={v}
              aria-pressed={mood === v}
              onClick={() => {
                setMood(v as keyof typeof colorMoods);
                setColor(0);
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="beauty-swatches">
          {colorMoods[mood].map((c, i) => (
            <button
              style={{ "--swatch": c } as React.CSSProperties}
              aria-label={`${mood} color ${i + 1}`}
              aria-pressed={color === i}
              key={c}
              onClick={() => setColor(i)}
            />
          ))}
        </div>
        <span className="beauty-fine">
          Selected reference: {colorMoods[mood][color]} · Photo remains
          unchanged
        </span>
      </div>
      <div
        className="color-wheel"
        style={
          { "--selected-color": colorMoods[mood][color] } as React.CSSProperties
        }
      >
        {photo ? (
          <img
            src={photo.uri}
            alt="Your unchanged local photo in an illustrative color frame"
          />
        ) : (
          <BeautyPortrait panel={2} />
        )}
        <span>COLOR, WITHOUT LIMITS</span>
      </div>
    </section>
  );
}
