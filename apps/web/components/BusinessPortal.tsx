"use client";
import { appPath } from "../lib/paths";
import MerchantSnapList from "./MerchantSnapList";
import type { MerchantDraft } from "../../../packages/product/catalog";
import { useState } from "react";
import {
  adminModules,
  adminRoles,
  campaignSteps,
  workspaces,
} from "../../../packages/product/platform";
import type { Role } from "../../../packages/product/platform";

/** Public task inventory and session drafts. Actual tenant records require the canonical API. */
export default function BusinessPortal({
  admin = false,
  startModule,
}: {
  admin?: boolean;
  startModule?: string;
}) {
  const [catalogDrafts, setCatalogDrafts] = useState<MerchantDraft[]>([]);
  const [role, setRole] = useState<Role>("merchant");
  const [module, setModule] = useState(() =>
    Math.max(
      0,
      workspaces.merchant.modules.findIndex((m) => m.name === startModule),
    ),
  );
  const [drafts, setDrafts] = useState<
    { id: string; title: string; notes: string }[]
  >([]);
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(0);
  const [discard, setDiscard] = useState<Role | null>(null);
  const [adminRole, setAdminRole] = useState("Support");
  const config = workspaces[role];
  const current = config.modules[module];
  const visibleAdmin =
    adminRole === "Support"
      ? adminModules.filter((n) =>
          ["User Management", "Trust & Safety", "Privacy"].includes(n),
        )
      : adminRole === "Finance"
        ? adminModules.filter((n) => ["Commerce", "Subscriptions"].includes(n))
        : adminRole === "AI Operations"
          ? ["AI Operations"]
          : adminRole === "Regional Operations"
            ? ["Regional Operations"]
            : adminRole === "Compliance"
              ? ["Privacy", "Trust & Safety"]
              : adminRole === "Content Moderation"
                ? ["Beauty Content", "Creators & Partners"]
                : adminRole === "Trust & Safety"
                  ? ["Trust & Safety"]
                  : adminModules;
  function switchRole(next: Role) {
    if (
      (title.trim() || Object.values(values).some(Boolean)) &&
      !confirm(
        "Discard unsaved planning fields before reviewing another workspace?",
      )
    ) {
      setDiscard(next);
      return;
    }
    setDiscard(null);
    setRole(next);
    setCatalogDrafts([]);
    setModule(0);
    setTitle("");
    setValues({});
    setDrafts([]);
    setMessage(
      "Workspace task inventory changed. No business session or privileges were activated.",
    );
    setStep(0);
  }
  function chooseModule(i: number) {
    setModule(i);
    setValues({});
    setTitle("");
    setStep(0);
    setMessage("");
  }
  return (
    <>
      <a className="skip-link" href="#workspace-content">
        Skip to workspace
      </a>
      <div className="business-shell">
        <aside className="business-sidebar">
          <a className="brand" href={appPath("/")}>
            ✧ GLAM <span>Beauty</span>
          </a>
          <p className="eyebrow">
            {admin ? "Restricted administration" : "Unified business portal"}
          </p>
          {!admin && (
            <label>
              Review workspace tools
              <select
                aria-label="Review workspace tools"
                value={role}
                onChange={(e) => switchRole(e.target.value as Role)}
              >
                {Object.entries(workspaces).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {admin && (
            <label>
              Review role layout
              <select
                aria-label="Review admin role layout"
                value={adminRole}
                onChange={(e) => {
                  setAdminRole(e.target.value);
                  setModule(0);
                }}
              >
                {adminRoles.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          )}
          <nav aria-label={admin ? "Admin modules" : "Workspace modules"}>
            {(admin ? visibleAdmin : config.modules.map((n) => n.name)).map(
              (name, i) => (
                <button
                  key={name}
                  aria-current={module === i ? "page" : undefined}
                  onClick={() => chooseModule(i)}
                >
                  <span aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {name}
                </button>
              ),
            )}
          </nav>
          <a href={appPath("/profile")} className="personal-link">
            ← Return to Personal
          </a>
          <p className="fine">
            No authenticated workspace.
            <br />
            Navigation does not grant access.
          </p>
        </aside>
        <main id="workspace-content" className="business-main" tabIndex={-1}>
          <header className="workspace-header">
            <span>
              {admin ? "Admin" : config.title} /{" "}
              {admin ? visibleAdmin[module] : current.name}
            </span>
            <span className="badge">Connection pending</span>
          </header>
          <p className="eyebrow">
            {admin
              ? "Internal authority required"
              : "One identity. Your approved organizations."}
          </p>
          <h1>{admin ? visibleAdmin[module] : current.name}</h1>
          {!admin && role === "creator" && <a className="button secondary" href={appPath("/profile") + "#creator-title"}>Open private Creator Studio</a>}
          <p className="intro">
            {admin
              ? "Platform-wide governance, including mobile apps. Private consumer photos and reports are never general dashboard data."
              : "Your role-specific tools, without leaving GLAM Beauty. Review the requirements and prepare session-only planning notes."}
          </p>
          <div className="notice">
            {admin
              ? "Access denied until staff authentication, privileged assurance and server permissions are connected. This public page is a module inventory only; it exposes no operational data or privileged controls."
              : "Google / Supabase is not connected. No approved organization is active. Your session notes are not business records and cannot publish, launch, charge, book or pay out."}
          </div>
          {discard && (
            <div className="notice">
              Switch cancelled; unsaved fields were retained. Choose the
              workspace again when ready.
            </div>
          )}
          {message && (
            <div role="status" className="notice">
              {message}
            </div>
          )}
          {admin ? (
            <>
              <div className="metric-grid">
                {["Qualified users", "Service health", "Open exceptions"].map(
                  (n) => (
                    <section className="panel" key={n}>
                      <h2>{n}</h2>
                      <strong className="metric">—</strong>
                      <p>Verified data not connected</p>
                    </section>
                  ),
                )}
              </div>
              <div className="split">
                <section className="panel">
                  <h2>Authority before action</h2>
                  <ul className="list">
                    {[
                      "Scoped staff role and organization / region",
                      "Mandatory privileged verification",
                      "Evidence, reason and approval",
                      "Append-only audit / rollback",
                    ].map((n) => (
                      <li key={n}>
                        {n}
                        <span>Required</span>
                      </li>
                    ))}
                  </ul>
                  <button className="button" disabled>
                    Privileged controls unavailable
                  </button>
                </section>
                <section className="panel">
                  <h2>Every surface, one policy</h2>
                  <p>
                    Consumer mobile and web, merchant, advertiser, professional,
                    creator and affiliate capabilities use the same canonical
                    backend and policies.
                  </p>
                  <p>
                    Changing this role layout never changes a real permission.
                    Restricted users cannot access finance or private-image data
                    through a sidebar.
                  </p>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="metric-grid">
                {[
                  "Source evidence",
                  "Qualified activity",
                  "Recognized earnings",
                ].map((n) => (
                  <section className="panel" key={n}>
                    <h2>{n}</h2>
                    <strong className="metric">—</strong>
                    <p>No verified data connection</p>
                  </section>
                ))}
              </div>
              {role === "merchant" &&
              [
                "Snap & List",
                "My Products",
                "Draft Listings",
                "Catalog Health",
              ].includes(current.name) ? (
                <MerchantSnapList
                  drafts={catalogDrafts}
                  setDrafts={setCatalogDrafts}
                  view={current.name}
                />
              ) : (
                <div className="workspace-columns">
                  <section className="panel">
                    <p className="eyebrow">Session planning only</p>
                    <h2>{current.name} planning draft</h2>
                    {role === "advertiser" &&
                    current.name === "Create Campaign" ? (
                      <>
                        <ol className="stepper">
                          {campaignSteps.map((n, i) => (
                            <li
                              key={n}
                              aria-current={step === i ? "step" : undefined}
                            >
                              {n}
                            </li>
                          ))}
                        </ol>
                        <h3>{campaignSteps[step]}</h3>
                        {step < 5 && (
                          <label>
                            {campaignSteps[step]} planning note
                            <input
                              value={values[campaignSteps[step]] || ""}
                              maxLength={500}
                              onChange={(e) =>
                                setValues({
                                  ...values,
                                  [campaignSteps[step]]: e.target.value,
                                })
                              }
                            />
                          </label>
                        )}
                        {step >= 5 && (
                          <>
                            <dl>
                              {campaignSteps.slice(0, 5).map((n) => (
                                <div key={n}>
                                  <dt>{n}</dt>
                                  <dd>{values[n] || "Not supplied"}</dd>
                                </div>
                              ))}
                            </dl>
                            <p>
                              Eligible offers, spend caps, creative rights,
                              brand safety and billing require verified server
                              evidence.
                            </p>
                          </>
                        )}
                        <div className="actions">
                          {step > 0 && (
                            <button
                              className="button secondary"
                              onClick={() => setStep(step - 1)}
                            >
                              Back
                            </button>
                          )}
                          {step < 6 ? (
                            <button
                              className="button"
                              onClick={() => setStep(step + 1)}
                            >
                              Next: {campaignSteps[step + 1]}
                            </button>
                          ) : (
                            <button className="button" disabled>
                              Launch unavailable
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const notes = current.fields
                            .map((n) => `${n}: ${values[n] || "Not supplied"}`)
                            .join("\n");
                          setDrafts([
                            ...drafts,
                            {
                              id: crypto.randomUUID(),
                              title: title.trim(),
                              notes,
                            },
                          ]);
                          setMessage(
                            "Planning draft saved in this browser session only. No server write or publication occurred.",
                          );
                          setTitle("");
                          setValues({});
                        }}
                      >
                        <label>
                          Draft title
                          <input
                            value={title}
                            required
                            maxLength={160}
                            onChange={(e) => setTitle(e.target.value)}
                          />
                        </label>
                        {current.fields.map((n) => (
                          <label key={n}>
                            {n}
                            <input
                              maxLength={500}
                              value={values[n] || ""}
                              onChange={(e) =>
                                setValues({ ...values, [n]: e.target.value })
                              }
                            />
                          </label>
                        ))}
                        <button className="button" disabled={!title.trim()}>
                          Save session planning draft
                        </button>
                        <p className="fine">
                          No private customer photos, payment information or
                          verification documents.
                        </p>
                      </form>
                    )}
                  </section>
                  <aside>
                    <section className="panel">
                      <h2>Session planning notes</h2>
                      {drafts.length ? (
                        drafts.map((d) => (
                          <article className="draft" key={d.id}>
                            <h3>{d.title}</h3>
                            <p style={{ whiteSpace: "pre-line" }}>{d.notes}</p>
                            <button
                              className="text-button"
                              onClick={() =>
                                setDrafts(drafts.filter((n) => n.id !== d.id))
                              }
                            >
                              Delete planning draft
                            </button>
                          </article>
                        ))
                      ) : (
                        <p>
                          No planning drafts for this review session. Switching
                          workspace clears these notes.
                        </p>
                      )}
                      <button className="button secondary" disabled>
                        Load authorized organization records
                      </button>
                    </section>
                    <section className="panel">
                      <h2>Activation checklist</h2>
                      <ul className="list">
                        {[
                          "Verified identity & eligible account",
                          "Active organization membership",
                          "Approved capability & scoped role",
                          "Source facts / rights / audit",
                        ].map((n) => (
                          <li key={n}>
                            {n}
                            <span>Required</span>
                          </li>
                        ))}
                      </ul>
                      <a
                        href={appPath("/profile")}
                        className="button secondary"
                      >
                        Account & workspace switching
                      </a>
                    </section>
                  </aside>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
