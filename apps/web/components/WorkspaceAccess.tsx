"use client";
import { useEffect, useRef, useState } from "react";
import BusinessPortal from "./BusinessPortal";
import { useAccountSession } from "../lib/use-account-session";
import {
  approvedWorkspaces,
  approvedStaffModules,
} from "../lib/workspace-access";
import { appPath } from "../lib/paths";
import { clearWebSession, publicAuthKey, webAuth } from "../lib/passwordless";
import { AUTH_URL } from "../../../packages/auth/core";

export default function WorkspaceAccess({
  admin = false,
  navigate,
}: {
  admin?: boolean;
  navigate: (path: string) => void;
}) {
  const { session, setSession, error, retry, checking } = useAccountSession();
  const [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);
  const organizationRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => organizationRequest.current?.abort(),
    [session?.profile.id],
  );
  const idempotency = useRef<{ name: string; key: string } | null>(null);
  const [staff, setStaff] = useState<{
    token: string;
    modules: string[];
  } | null>(null);
  const [staffError, setStaffError] = useState("");
  useEffect(() => {
    setCreated(false);
    setName("");
    setMessage("");
    idempotency.current = null;
  }, [session?.profile.id]);
  useEffect(() => {
    const abort = new AbortController();
    setStaff(null);
    setStaffError("");
    if (admin && session && !checking) {
      void fetch(AUTH_URL + "/functions/v1/glam-api/v1/admin/context", {
        headers: {
          apikey: publicAuthKey,
          Authorization: "Bearer " + session.token,
        },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: abort.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw Error();
          const value = await response.json();
          if (
            !Array.isArray(value.roles) ||
            !value.roles.length ||
            !Array.isArray(value.modules) ||
            !value.modules.length ||
            value.modules.some((m: unknown) => typeof m !== "string")
          )
            throw Error();
          const modules = approvedStaffModules(value.modules);
          if (!modules.length) throw Error();
          if (!abort.signal.aborted)
            setStaff({ token: session.token, modules });
        })
        .catch(() => {
          if (!abort.signal.aborted)
            setStaffError(
              "Staff access could not be verified. Access remains restricted. Retry or contact your organization administrator.",
            );
        });
    }
    return () => abort.abort();
  }, [admin, session?.token, checking]);
  async function signOut() {
    organizationRequest.current?.abort();
    try {
      const { error: failure } = await webAuth().auth.signOut();
      if (failure) throw Error();
    } catch {
      setMessage(
        "Server sign-out could not be confirmed. This browser session has been cleared.",
      );
    } finally {
      clearWebSession();
      setSession(null);
      navigate(admin ? "/admin/login" : "/business/login");
    }
  }
  async function registerOrganization(event: React.FormEvent) {
    event.preventDefault();
    if (!session || busy || created) return;
    const organization = name.trim();
    if (!organization || organization.length > 160) {
      setMessage("Enter an organization name between 1 and 160 characters.");
      return;
    }
    if (idempotency.current?.name !== organization)
      idempotency.current = { name: organization, key: crypto.randomUUID() };
    organizationRequest.current?.abort();
    const controller = new AbortController();
    organizationRequest.current = controller;
    setBusy(true);
    setMessage("");
    const actor = session.profile.id,
      token = session.token;
    try {
      const response = await fetch(
        AUTH_URL + "/functions/v1/glam-api/v1/organizations",
        {
          method: "POST",
          headers: {
            apikey: publicAuthKey,
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotency.current.key,
          },
          body: JSON.stringify({ name: organization }),
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
        },
      );
      if (!response.ok) throw Error();
      const result = await response.json();
      if (typeof result.id !== "string" || result.name !== organization)
        throw Error();
      if (controller.signal.aborted || actor !== currentActor.current) return;
      setCreated(true);
      setMessage(
        "Your organization was registered. Business tools remain unavailable until eligibility and workspace verification are approved.",
      );
    } catch {
      if (!controller.signal.aborted && actor === currentActor.current)
        setMessage(
          "Registration could not be confirmed. Retry with the same details; duplicate requests use the same reference.",
        );
    } finally {
      if (actor === currentActor.current) setBusy(false);
    }
  }
  const currentActor = useRef(session?.profile.id);
  currentActor.current = session?.profile.id;
  const approved = approvedWorkspaces(session?.workspaces);
  if (session && !checking && !admin && approved.length)
    return (
      <BusinessPortal
        key={session.profile.id}
        access={{
          workspaces: approved,
          displayName: session.profile.display_name || "Your account",
          onSignOut: () => void signOut(),
          onNavigate: navigate,
        }}
      />
    );
  if (session && !checking && admin && staff?.token === session.token)
    return (
      <BusinessPortal
        key={session.profile.id}
        admin
        access={{
          workspaces: [],
          displayName: session.profile.display_name || "Staff account",
          onSignOut: () => void signOut(),
          onNavigate: navigate,
          staffModules: staff.modules,
        }}
      />
    );
  return (
    <>
      <a className="skip-link" href="#workspace-content">
        Skip to workspace
      </a>
      <main id="workspace-content" tabIndex={-1} className="auth-welcome">
        <div className="auth-frame">
          <a className="brand auth-wordmark" href={appPath("/")}>
            ✧ GLAM Beauty
          </a>
          <section className="auth-card">
            <p className="auth-eyebrow">
              {admin ? "Restricted administration" : "GLAM Beauty for business"}
            </p>
            <h1>
              {checking
                ? "Checking your access…"
                : !session
                  ? admin
                    ? "Staff sign-in required"
                    : "Your business workspace starts here"
                  : admin
                    ? "Staff access required"
                    : "No approved workspace yet"}
            </h1>
            {checking ? (
              <p role="status">
                Verifying your account and current permissions.
              </p>
            ) : !session ? (
              <>
                <p>
                  {admin
                    ? "Sign in with an existing staff account. Public registration does not grant administrative access."
                    : "Sign in or create one GLAM Beauty account to register your organization and access approved merchant, professional, creator, advertiser or partner tools."}
                </p>
                <div className="auth-surface">
                  <a
                    className="button"
                    href={appPath(admin ? "/admin/login" : "/business/login")}
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(admin ? "/admin/login" : "/business/login");
                    }}
                  >
                    Sign in
                  </a>
                  {!admin && (
                    <a
                      className="button secondary"
                      href={appPath("/business/register")}
                      onClick={(event) => {
                        event.preventDefault();
                        navigate("/business/register");
                      }}
                    >
                      Register your business account
                    </a>
                  )}
                </div>
              </>
            ) : admin ? (
              <p role="status">
                {staffError || "Verifying staff permissions…"}
              </p>
            ) : (
              <>
                <p>
                  Your account is signed in. Workspace access requires verified
                  eligibility, organization membership and an approved business
                  capability.
                </p>
                <form className="auth-surface" onSubmit={registerOrganization}>
                  <label htmlFor="organization-name">Organization name</label>
                  <input
                    id="organization-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={160}
                    required
                    disabled={busy || created}
                  />
                  <button className="button" disabled={busy || created}>
                    {busy
                      ? "Registering…"
                      : created
                        ? "Organization registered"
                        : "Register organization"}
                  </button>
                </form>
                <p>
                  Registration creates your organization record; it does not
                  grant a role, publish listings or activate payments. Existing
                  organizations need an approved invitation and workspace
                  verification.
                </p>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}
            {!checking && (error || session) && (
              <button className="text-button" onClick={() => void retry()}>
                Refresh access
              </button>
            )}
            {session && (
              <button className="text-button" onClick={() => void signOut()}>
                Sign out
              </button>
            )}
            <a className="auth-guest" href={appPath("/")}>
              Return to Personal
            </a>
          </section>
        </div>
      </main>
    </>
  );
}
