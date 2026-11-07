"use client";
import { useState } from "react";
import type { Page, Photo } from "../../../packages/product/platform";
import type {
  CompanionConnection,
  LookDirection,
} from "../../../packages/product/companion";
import {
  featureKeys,
  featureLabels,
} from "../../../packages/product/companion";
import type { PersonalResultsState } from "../../../packages/product/use-personal-results";
export default function PersonalizedResults({
  photo,
  personal,
  connection,
  go,
  onDirection,
}: {
  photo: Photo | null;
  personal: PersonalResultsState;
  connection?: CompanionConnection;
  go: (p: Page) => void;
  onDirection: (d: LookDirection) => void;
}) {
  const [permission, setPermission] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const p = personal,
    r = p.analysis;
  return (
    <div className="personal-results">
      <header className="personal-results-heading">
        <p className="golden-overline">
          THE SIXTH GOLDEN PATTERN / PERSONALIZED RESULTS
        </p>
        <h1>
          Your features.
          <br />
          <em>Your possibilities.</em>
        </h1>
        <p>Understanding, with room for your perspective.</p>
      </header>
      <div className="personal-results-layout">
        <aside className="personal-results-portrait">
          {photo ? (
            <img
              src={photo.uri}
              alt="Your unchanged original photo"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="personal-results-reference"
              role="img"
              aria-label="Editorial reference, not a personal analysis"
            />
          )}
          <span>
            {photo
              ? "YOUR ORIGINAL / UNCHANGED"
              : "EDITORIAL REFERENCE / NOT ANALYZED"}
          </span>
          <div>
            <h2>
              {r ? "A starting point, not a verdict." : "Start with you."}
            </h2>
            <p>
              {r
                ? "Lighting and perspective affect estimates. Your corrections stay separate from the original findings."
                : "Your own photo and a qualified analysis are needed before personal estimates can appear."}
            </p>
            <button className="button secondary" onClick={() => go("consent")}>
              {photo ? "Change my photo" : "Prepare my photo"}
            </button>
          </div>
        </aside>
        <div className="personal-results-content">
          <section
            className="personal-result-status"
            aria-label="Analysis source"
          >
            <span className="badge">
              {r ? "Provider result received" : "No personal analysis yet"}
            </span>
            <h2>{r ? "Your Results" : "A little clarity starts here."}</h2>
            <p>
              {r
                ? `${r.provider} · ${r.model} · ${new Date(r.completedAt).toLocaleString()}`
                : "No face shape, undertone or other feature has been inferred. There are no beauty scores."}
            </p>
            {!r && (
              <>
                <label className="personal-processing-permission">
                  <input
                    type="checkbox"
                    checked={permission}
                    onChange={(e) => setPermission(e.target.checked)}
                  />
                  I authorize processing this photo with the connected analysis
                  service.
                </label>
                <p className="fine">
                  {connection?.analyze
                    ? "Connected adapter available. Review its consent and retention terms before proceeding."
                    : "Analysis service is not connected. Selecting permission does not upload or analyze your photo."}
                </p>
                <button
                  className="button"
                  disabled={
                    !photo || !permission || !connection?.analyze || !!p.busy
                  }
                  onClick={() => p.run("analysis")}
                >
                  {p.busy === "analysis"
                    ? "Analyzing your photo…"
                    : connection?.analyze
                      ? "Analyze my photo"
                      : "Analysis connection required"}
                </button>
              </>
            )}
            {p.busy && (
              <div role="status" aria-live="polite">
                <p>
                  A real {p.busy === "analysis" ? "analysis" : "try-on"} request
                  is in progress.
                </p>
                <button className="text-button" onClick={p.cancel}>
                  Cancel request
                </button>
              </div>
            )}
            {p.error && <p role="alert">{p.error}</p>}
          </section>
          <div className="personal-findings">
            {featureKeys.map((key) => {
              const f = r?.findings.find((f) => f.key === key),
                value = p.corrections[key];
              return (
                <article className="personal-finding" key={key}>
                  <div>
                    <p className="golden-overline">{featureLabels[key]}</p>
                    <h3>{value?.trim() || f?.estimate || "Not computed"}</h3>
                    <span className="personal-certainty">
                      {value?.trim()
                        ? "Your correction"
                        : f?.certainty === "supported"
                          ? "Supported estimate"
                          : f?.certainty === "tentative"
                            ? "Tentative estimate"
                            : f
                              ? "Unable to estimate"
                              : "Awaiting analysis"}
                    </span>
                  </div>
                  <p>
                    {f?.uncertainty ||
                      "An estimate and its limitations will appear only after real processing."}
                  </p>
                  {f && (
                    <p className="fine">
                      Original estimate: {f.estimate || "Unavailable"}.
                      Corrections reflect your input; they do not retrain or
                      validate the model.
                    </p>
                  )}
                  <button
                    className="text-button"
                    aria-expanded={editing === key}
                    onClick={() => setEditing(editing === key ? null : key)}
                  >
                    {value?.trim()
                      ? "Edit my correction"
                      : "Add my perspective"}
                  </button>
                  {editing === key && (
                    <label>
                      Your {featureLabels[key].toLowerCase()} note
                      <textarea
                        autoFocus
                        value={value || ""}
                        maxLength={240}
                        onChange={(e) => p.correct(key, e.target.value)}
                        placeholder="How would you describe this feature?"
                      />
                      <button
                        className="text-button"
                        onClick={() => {
                          p.correct(key, "");
                          setEditing(null);
                        }}
                      >
                        Clear this note
                      </button>
                    </label>
                  )}
                </article>
              );
            })}
          </div>
          <section className="personal-look-directions">
            <p className="golden-overline">WHAT WE RECOMMEND</p>
            <h2>Explore what feels like you.</h2>
            {r?.directions.length ? (
              r.directions.map((d) => (
                <article key={d.id}>
                  <h3>{d.title}</h3>
                  <p>{d.rationale}</p>
                  <button
                    className="button"
                    onClick={() => {
                      onDirection(d);
                    }}
                  >
                    Explore {d.title} in AI Studio
                  </button>
                </article>
              ))
            ) : (
              <p>
                No AI look recommendations have been generated. You can explore
                editorial references in Studio while your personal result is
                unavailable.
              </p>
            )}
            <button className="button secondary" onClick={() => go("studio")}>
              Explore Studio references
            </button>
          </section>
          <section className="personal-result-next">
            <p className="golden-overline">WHERE TO GET IT</p>
            <h2>Your look, brought closer.</h2>
            <p>
              Find products and professionals for your selected look and
              shopping location. Organic and sponsored matches stay separate;
              availability requires verification.
            </p>
            <button className="button" onClick={() => go("complete")}>
              Find local products & professionals
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
