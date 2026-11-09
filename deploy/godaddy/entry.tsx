import React from "react";
import { createRoot } from "react-dom/client";
import AccountRoutes from "../../apps/web/components/AccountRoutes";
import { sectionFromPath } from "../../apps/web/lib/paths";
import "../../apps/web/app/styles.css";
import "../../apps/web/app/golden-tokens.css";
import "../../apps/web/app/golden-screens.css";
import "../../apps/web/app/personal-results.css";
import "../../apps/web/app/authentication.css";
import "../../apps/web/app/public-site.css";

const section = sectionFromPath(location.pathname);
createRoot(document.getElementById("root")!).render(
  <AccountRoutes initialPath={section === "home" ? "/" : "/" + section} />,
);
