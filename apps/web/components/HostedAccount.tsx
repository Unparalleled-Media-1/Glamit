"use client";

import { useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import AccountSecurity from "./AccountSecurity";
import PasswordlessSignIn from "./PasswordlessSignIn";
import { clearWebSession, webAuth } from "../lib/passwordless";

const url = "https://bkkmsbxrxkqaveymcrgi.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const hostedAccountConfigured = Boolean(key);
type Routine = {
  id: string;
  title: string;
  steps: { text: string; done: boolean }[];
  revision: number;
};
type Profile = { id: string; display_name: string | null };

export type HostedSession = {
  token: string;
  profile: Profile;
  routines: Routine[];
} | null;

/** Session lives in the app root across navigation; never in device profile or browser storage. */
export default function HostedAccount({ session, setSession }: {
  session: HostedSession;
  setSession: Dispatch<SetStateAction<HostedSession>>;
}) {
  const token = session?.token || null;
  const profile = session?.profile || null;
  const [name, setName] = useState(profile?.display_name || "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const routines = session?.routines || [];
  const setRoutines = (saved: Routine[]) =>
    setSession((current) =>
      current ? { ...current, routines: saved } : current
    );
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineStep, setRoutineStep] = useState("");
  const routineKey = useRef<string | null>(null);

  async function api(
    method: string,
    path: string,
    access: string,
    body?: unknown,
    requestKey?: string,
  ) {
    const r = await fetch(url + "/functions/v1/glam-api" + path, {
      method,
      headers: {
        apikey: key,
        Authorization: "Bearer " + access,
        "Content-Type": "application/json",
        ...(requestKey ? { "Idempotency-Key": requestKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      throw new Error(
        r.status === 401
          ? "Your session ended. Sign in again."
          : "The service could not confirm this action. Please retry.",
      );
    }
    return r.status === 204 ? undefined : r.json();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setStatus("Saving…");
    try {
      const p: Profile = await api("PATCH", "/v1/me/profile", token, {
        display_name: name,
      });
      setSession((current) => current ? { ...current, profile: p } : current);
      setStatus("Profile saved to your GLAM account.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save was not confirmed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!token) return;
    setBusy(true);
    try {
      const { error } = await webAuth().auth.signOut({ scope: "local" });
      const r = { ok: !error };
      setStatus(
        r.ok
          ? "Signed out."
          : "Local session cleared. Server sign-out was not confirmed.",
      );
    } catch {
      setStatus("Local session cleared. Server sign-out was not confirmed.");
    } finally {
      clearWebSession();
      setSession(null);
      setName("");
      setRoutineTitle("");
      setRoutineStep("");
      routineKey.current = null;
      setBusy(false);
    }
  }

  async function routineAction(
    action: "create" | "toggle" | "delete",
    routine?: Routine,
    index?: number,
  ) {
    if (!token) return;
    setBusy(true);
    setStatus("Saving routine changes…");
    try {
      if (action === "create") {
        routineKey.current ||= crypto.randomUUID();
        await api("POST", "/v1/me/routines", token, {
          title: routineTitle,
          steps: [{ text: routineStep, done: false }],
        }, routineKey.current);
        setRoutineTitle("");
        setRoutineStep("");
        routineKey.current = null;
      } else if (routine && action === "toggle") {
        await api("PUT", "/v1/me/routines/" + routine.id, token, {
          title: routine.title,
          expected_revision: routine.revision,
          steps: routine.steps.map((step, i) =>
            i === index ? { ...step, done: !step.done } : step
          ),
        });
      } else if (routine) {
        await api("DELETE", "/v1/me/routines/" + routine.id, token);
      }
      setRoutines(await api("GET", "/v1/me/routines", token));
      setStatus("Routine changes saved to your GLAM account.");
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Routine changes could not be confirmed.",
      );
      try {
        setRoutines(await api("GET", "/v1/me/routines", token));
      } catch { /* explicit retry remains */ }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Personal account</h2>
      {profile
        ? (
          <form method="post" onSubmit={save}>
            <label htmlFor="account-name">Display name</label>
            <input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              disabled={busy}
              autoComplete="nickname"
            />
            <button className="button" disabled={busy}>Save profile</button>
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={signOut}
            >
              Sign out
            </button>
          </form>
        )
        : <PasswordlessSignIn />}
      {profile && (
        <section aria-label="Account routines">
          <h3>Your saved routines</h3>
          {routines.length === 0 && (
            <p>No routines saved to this account yet.</p>
          )}
          {routines.map((routine) => (
            <div key={routine.id}>
              <h4>{routine.title}</h4>
              {routine.steps.map((step, i) => (
                <label key={i}>
                  <input
                    type="checkbox"
                    checked={step.done}
                    disabled={busy}
                    onChange={() => routineAction("toggle", routine, i)}
                  />{" "}
                  {step.text}
                </label>
              ))}
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => routineAction("delete", routine)}
              >
                Delete {routine.title}
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void routineAction("create");
            }}
          >
            <label htmlFor="routine-title">Routine title</label>
            <input
              id="routine-title"
              value={routineTitle}
              onChange={(e) => {
                setRoutineTitle(e.target.value);
                routineKey.current = null;
              }}
              maxLength={160}
              required
              disabled={busy}
            />
            <label htmlFor="routine-step">First step</label>
            <input
              id="routine-step"
              value={routineStep}
              onChange={(e) => {
                setRoutineStep(e.target.value);
                routineKey.current = null;
              }}
              maxLength={500}
              required
              disabled={busy}
            />
            <button className="button secondary" disabled={busy}>
              Save routine to account
            </button>
          </form>
        </section>
      )}
      {profile && (
        <AccountSecurity
          userId={profile.id}
          accessToken={token!}
          onSignedOut={() => setSession(null)}
        />
      )}
      <p role="status" aria-live="polite">{status}</p>
    </>
  );
}
