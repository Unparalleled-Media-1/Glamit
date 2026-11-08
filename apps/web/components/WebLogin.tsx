"use client";
import { useEffect, useState } from "react";
import GlamApp from "./GlamApp";
import PasswordlessSignIn from "./PasswordlessSignIn";
import { useAccountSession } from "../lib/use-account-session";
import { appPath } from "../lib/paths";
import { accountDestination } from "../lib/workspace-access";
type Props = {
  registration?: boolean;
  audience?: "personal" | "business" | "admin";
  onAuthenticated?: (path: string) => void;
  onNavigate?: (path: string) => void;
};
function Welcome({
  onReady,
  registration = false,
  audience = "personal",
  onNavigate,
}: Props & { onReady: (path: string) => void }) {
  const fallback =
    audience === "business"
      ? "/business"
      : audience === "admin"
        ? "/admin"
        : "/";
  const [destination, setDestination] = useState(fallback);
  const { session, error, retry, checking } = useAccountSession((path) => {
    setDestination(accountDestination(path, fallback));
  });
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    setDestination(accountDestination(next, fallback));
  }, [fallback, registration]);
  useEffect(() => {
    if (session && !checking) onReady(destination);
  }, [session, checking, onReady, destination]);
  const registerPath =
    audience === "business" ? "/business/register" : "/register";
  const loginPath =
    audience === "business"
      ? "/business/login"
      : audience === "admin"
        ? "/admin/login"
        : "/login";
  const modePath =
    (registration ? loginPath : registerPath) +
    (destination !== "/" ? "?next=" + encodeURIComponent(destination) : "");
  const label =
    audience === "business"
      ? "Business workspace"
      : audience === "admin"
        ? "Staff access"
        : "Your beauty. Your way.";
  return (
    <main className="auth-welcome" tabIndex={-1}>
      <div className="auth-frame">
        <a className="brand auth-wordmark" href={appPath("/")}>
          ✧ GLAM Beauty
        </a>
        <section className="auth-card">
          <p className="auth-eyebrow">{label}</p>
          <h1>
            {registration
              ? "Create your GLAM Beauty account"
              : audience === "business"
                ? "Sign in to your business workspace"
                : audience === "admin"
                  ? "Sign in to administration"
                  : "Sign in to GLAM Beauty"}
          </h1>
          {audience !== "personal" && (
            <p>
              {audience === "admin"
                ? "An existing staff account and verified permissions are required. Public registration never grants staff access."
                : "One account for your personal profile and approved business workspaces. Registration does not grant a business role."}
            </p>
          )}
          <PasswordlessSignIn
            destination={destination}
            registration={registration}
            allowCreateUser={audience !== "admin"}
          />
          {error && (
            <p role="alert">
              {error}{" "}
              <button className="text-button" onClick={() => void retry()}>
                Retry account connection
              </button>
            </p>
          )}
          {audience !== "admin" && (
            <a
              className="auth-guest"
              href={appPath(modePath)}
              onClick={(event) => {
                if (onNavigate) {
                  event.preventDefault();
                  onNavigate(modePath);
                }
              }}
            >
              {registration
                ? "Already have an account? Sign in"
                : "New to GLAM Beauty? Create an account"}
            </a>
          )}
          <a className="auth-guest" href={appPath("/")}>
            Explore GLAM Beauty as a guest
          </a>
        </section>
      </div>
    </main>
  );
}
export default function WebLogin(props: Props = {}) {
  const [ready, setReady] = useState(false);
  return ready ? (
    <GlamApp />
  ) : (
    <Welcome
      {...props}
      onReady={(path) => {
        if (props.onAuthenticated) props.onAuthenticated(path);
        else {
          history.replaceState(null, "", appPath("/"));
          setReady(true);
        }
      }}
    />
  );
}
