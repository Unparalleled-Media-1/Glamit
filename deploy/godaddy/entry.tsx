import React from "react";
import { createRoot } from "react-dom/client";
import WebLogin from "../../apps/web/components/WebLogin";
import GlamApp from "../../apps/web/components/GlamApp";
import BusinessPortal from "../../apps/web/components/BusinessPortal";
import { sectionFromPath } from "../../apps/web/lib/paths";
import type { Page } from "../../packages/product/platform";
import "../../apps/web/app/styles.css";
import "../../apps/web/app/golden-tokens.css";
import "../../apps/web/app/golden-screens.css";
import "../../apps/web/app/personal-results.css";

const section = location.pathname.replace(/\/+$/, "") === "/auth/callback"
  ? "home"
  : sectionFromPath(location.pathname);
createRoot(document.getElementById("root")!).render(
  section === "login" ? <WebLogin /> : section === "business"
    ? (
      <BusinessPortal
        startModule={new URLSearchParams(location.search).get("module") ||
          undefined}
      />
    )
    : section === "admin"
    ? <BusinessPortal admin />
    : <GlamApp start={section as Page} />,
);
