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
    <main
      className="narrow"
      style={{
        padding:
          "max(24px, env(safe-area-inset-top)) 20px calc(32px + env(safe-area-inset-bottom))",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <a className="brand" href={appPath("/")}>✧ GLAM AI</a>
      <section className="panel" style={{ marginTop: 24 }}>
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
      </section>
      <a className="button secondary" href={appPath("/")}>
        Explore without signing in
      </a>
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
