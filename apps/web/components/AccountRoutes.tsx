"use client";
import { useCallback, useEffect, useState } from "react";
import GlamApp, { pages } from "./GlamApp";
import WebLogin from "./WebLogin";
import WorkspaceAccess from "./WorkspaceAccess";
import { appPath, sectionFromPath } from "../lib/paths";
import { accountDestination } from "../lib/workspace-access";
import type { Page } from "../../../packages/product/platform";

/** Keeps the existing in-memory Auth session across sign-in and workspace handoff. */
export default function AccountRoutes({
  initialPath = "/business",
}: {
  initialPath?: string;
}) {
  const [path, setPath] = useState(initialPath);
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
    const destination = authPaths.includes(requested)
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
    return <WorkspaceAccess admin={path === "/admin"} navigate={navigate} />;
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
      <WebLogin
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
      />
    );
  }
  const page = sectionFromPath(path) as Page;
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
