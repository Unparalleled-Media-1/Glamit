import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GlamApp from "../apps/web/components/GlamApp";
import BusinessPortal from "../apps/web/components/BusinessPortal";
import { sectionFromPath, appPath } from "../apps/web/lib/paths";
import type { Page } from "../packages/product/platform";
import "../apps/web/app/styles.css";
import "../apps/web/app/golden-tokens.css";
import "../apps/web/app/golden-screens.css";
import "../apps/web/app/personal-results.css";
import "./preview.css";
const base = process.env.PREVIEW_SITE_BASE || "";
const tasks = [
  {
    title: "First-time visitor",
    path: "/",
    copy: "Explore the six goals. Face Analysis and Personal Stylist are immediately available.",
  },
  {
    title: "First face analysis",
    path: "/analyze",
    copy: "Choose a photo only after local-preview permission, then review its technical quality and your goals.",
  },
  {
    title: "Returning GLAM Profile",
    path: "/profile",
    copy: "Save a look and explicitly enable Remember to test returning-user memory. Edit, delete or turn it off here.",
  },
  {
    title: "Event styling",
    path: "/event",
    copy: "Describe an event, add a local invitation and shape the brief. No AI reply or official theme is fabricated.",
  },
  {
    title: "AI makeover / Studio",
    path: "/studio",
    copy: "Explore references, swatches and direction controls. Your original stays unchanged; personal generation is not connected.",
  },
  {
    title: "Live Look Builder",
    path: "/builder",
    copy: "Choose hair, makeup, clothing, accessories and services. Replacing one preserves the others.",
  },
  {
    title: "Get This Look",
    path: "/complete",
    copy: "Review your selected elements, destination and sourcing plan. No merchant, price or availability is invented.",
  },
  {
    title: "Merchant Snap & List",
    path: "/business?module=Snap%20%26%20List",
    copy: "Prepare original local product photos, manually review facts and save a session draft. Publication is gated.",
  },
  {
    title: "Workspace switching",
    path: "/profile",
    copy: "Open Switch workspace. Public business tool review does not authorize membership, inventory or staff access.",
  },
  {
    title: "Golden / Shop",
    path: "/shop",
    copy: "Editorial product studies with user-selected destination. These are not live offers.",
  },
  {
    title: "Golden / Product Detail",
    path: "/product",
    copy: "Explore an illustrative color, Studio and your saved-look reference. Purchase remains gated.",
  },
  {
    title: "Golden / Personalized Results",
    path: "/results",
    copy: "Sixth pattern: uncertainty, your corrections and Studio handoff. No personal analysis is fabricated.",
  },
  {
    title: "Destination & Weather Stylist",
    path: "/destination",
    copy: "Trip dates, activities, packing and honest weather availability. No forecast is fabricated.",
  },
  {
    title: "Cart, checkout & order status",
    path: "/cart",
    copy: "Verified variants and server quotes are required. No completed order is simulated.",
  },
];
function PreviewHub() {
  const [task, setTask] = useState(0);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [reload, setReload] = useState(0);
  const t = tasks[task];
  return (
    <div className="preview-hub">
      <header className="preview-header">
        <a href={base + "/"} className="preview-wordmark">
          ✧ GLAM <span>AI</span>
        </a>
        <span className="preview-label">INTERACTIVE DESIGN REVIEW</span>
        <a
          href="https://github.com/Unparalleled-Media-1/Glamit/tree/feat/personalized-results-journey"
          target="_blank"
          rel="noreferrer"
        >
          View source
        </a>
      </header>
      <main className="preview-main">
        <div className="preview-intro">
          <div>
            <p>THE BEAUTY EXPERIENCE</p>
            <h1>Explore GLAM AI.</h1>
          </div>
          <span className="preview-status">
            Responsive web preview · Live connections off
          </span>
        </div>
        <section className="preview-toolbar" aria-label="Preview controls">
          <label>
            Choose a journey
            <select
              aria-label="Preview journey"
              value={task}
              onChange={(e) => {
                setTask(Number(e.target.value));
                setReload((n) => n + 1);
              }}
            >
              {tasks.map((v, i) => (
                <option key={i} value={i}>
                  {String(i + 1).padStart(2, "0")} / {v.title}
                </option>
              ))}
            </select>
          </label>
          <div
            className="preview-devices"
            role="group"
            aria-label="Preview viewport"
          >
            <button
              aria-pressed={device === "phone"}
              onClick={() => setDevice("phone")}
            >
              Phone
            </button>
            <button
              aria-pressed={device === "desktop"}
              onClick={() => setDevice("desktop")}
            >
              Desktop
            </button>
          </div>
          <button
            className="preview-reload"
            onClick={() => setReload((n) => n + 1)}
          >
            Restart screen
          </button>
          <a
            className="preview-open"
            href={appPath(t.path)}
            target="_blank"
            rel="noreferrer"
          >
            Open full page
          </a>
        </section>
        <p className="preview-task" role="status">
          {t.copy}
        </p>
        <div className="preview-stage">
          <div className={"preview-frame " + device}>
            <iframe
              title="GLAM AI interactive application"
              key={task + ":" + reload}
              src={appPath(t.path)}
              allow="camera 'none'; microphone 'none'; geolocation 'none'"
            />
          </div>
        </div>
        <footer className="preview-footer">
          <p>
            Photos stay on your device. Profile text is remembered only if you
            choose it. AI, account sync, inventory, payments and bookings are
            unconnected.
          </p>
          <button
            onClick={() => {
              if (
                confirm(
                  "Clear approved GLAM profile metadata saved on this browser and restart the preview? Your original files are unchanged.",
                )
              ) {
                localStorage.removeItem("glam.approved-profile.v1");
                setReload((n) => n + 1);
              }
            }}
          >
            Clear saved preview profile
          </button>
        </footer>
      </main>
    </div>
  );
}
const isApp =
  location.pathname === base + "/app" ||
  location.pathname.startsWith(base + "/app/");
const section = sectionFromPath(location.pathname);
createRoot(document.getElementById("root")!).render(
  isApp ? (
    section === "business" ? (
      <BusinessPortal
        startModule={
          new URLSearchParams(location.search).get("module") || undefined
        }
      />
    ) : section === "admin" ? (
      <BusinessPortal admin />
    ) : (
      <GlamApp start={section as Page} />
    )
  ) : (
    <PreviewHub />
  ),
);
