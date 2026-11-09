"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import GlamApp, { pages } from "./GlamApp";
import WebLogin from "./WebLogin";
import WorkspaceAccess from "./WorkspaceAccess";
import { appPath, sectionFromPath } from "../lib/paths";
import { accountDestination } from "../lib/workspace-access";
import type { Page } from "../../../packages/product/platform";
import SiteFooter from "./SiteFooter";
import PublicInformationPage from "./PublicInformationPage";
import { isPublicPage } from "../../../packages/product/public-site";

/** Keeps the existing in-memory Auth session across sign-in and workspace handoff. */
export default function AccountRoutes({
  initialPath = "/business",
}: {
  initialPath?: string;
}) {
  const [path, setPath] = useState(initialPath);
  const previousPath = useRef(initialPath);
  useEffect(() => {
    if (previousPath.current === path) return;
    previousPath.current = path;
    const main = document.querySelector<HTMLElement>("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  const navigate = useCallback((next: string, replace = false) => {
    const [requested, query] = next.split("?", 2);
    const authPaths = [
      "/business",
      "/admin",
      "/login",
      "/register",
      "/business/login",
      "/business/register",
      "/admin/login",
    ];
    const destination = authPaths.includes(requested) || isPublicPage(requested.replace(/^\//,""))
      ? requested
      : accountDestination(requested);
    const returnTo = accountDestination(new URLSearchParams(query).get("next"));
    const search =
      authPaths.includes(destination) && returnTo !== "/"
        ? "?next=" + encodeURIComponent(returnTo)
        : "";
    history[replace ? "replaceState" : "pushState"](
      null,
      "",
      appPath(destination) + search,
    );
    setPath(destination);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => document.querySelector("main")?.focus());
  }, []);
  useEffect(() => {
    const pop = () => setPath("/" + sectionFromPath(location.pathname));
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  if (path === "/business" || path === "/admin")
    return <><WorkspaceAccess admin={path === "/admin"} navigate={navigate} /><SiteFooter onNavigate={navigate} showBusinessRegistration={path !== "/admin"}/></>;
  if (
    [
      "/login",
      "/register",
      "/business/login",
      "/business/register",
      "/admin/login",
      "/auth/callback",
    ].includes(path)
  ) {
    return (
      <><WebLogin
        registration={path.endsWith("register")}
        audience={
          path.startsWith("/business")
            ? "business"
            : path.startsWith("/admin")
              ? "admin"
              : "personal"
        }
        onNavigate={navigate}
        onAuthenticated={(next) => navigate(next, true)}
      /><SiteFooter onNavigate={navigate} showBusinessRegistration={!path.startsWith("/admin")}/></>
    );
  }
  const page = sectionFromPath(path) as Page;
  const publicSection = sectionFromPath(path);
  if (isPublicPage(publicSection)) return <PublicInformationPage section={publicSection} onNavigate={navigate}/>;
  return (
    <GlamApp
      start={
        (
          [
            ...pages,
            "explore",
            "complete",
            "screenshot",
            "budget",
            "booking",
            "wardrobe",
            "calendar",
            "groups",
            "agent",
          ] as string[]
        ).includes(page)
          ? page
          : "home"
      }
      onAccountNavigate={navigate}
    />
  );
}
