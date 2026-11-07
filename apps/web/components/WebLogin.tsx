"use client";
import { useEffect, useState } from "react";
import GlamApp from "./GlamApp";
import PasswordlessSignIn from "./PasswordlessSignIn";
import { useAccountSession } from "../lib/use-account-session";
import { appPath } from "../lib/paths";
function Welcome({ onReady }: { onReady: () => void }) {
  const { session, error, retry } = useAccountSession();
  useEffect(() => {
    if (session) onReady();
  }, [session, onReady]);
  return (
    <main className="auth-welcome">
      <div className="auth-frame">
        <a className="brand auth-wordmark" href={appPath("/")}>✧ GLAM AI</a>
        <section className="auth-card">
          <p className="auth-eyebrow">Your beauty. Your way.</p>
          <h1>Sign in to GLAM AI</h1>
          <PasswordlessSignIn />
          {error && (
            <p role="alert">
              {error}{" "}
              <button className="text-button" onClick={() => void retry()}>
                Retry account connection
              </button>
            </p>
          )}
          <a className="auth-guest" href={appPath("/")}>
            Explore GLAM AI as a guest
          </a>
        </section>
      </div>
    </main>
  );
}
export default function WebLogin() {
  const [ready, setReady] = useState(false);
  return ready ? <GlamApp /> : (
    <Welcome
      onReady={() => {
        history.replaceState(null, "", appPath("/"));
        setReady(true);
      }}
    />
  );
}
