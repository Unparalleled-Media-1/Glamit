import { createAuthClient, safeDestination } from "../../../packages/auth/core";
import type { SupportedStorage } from "../../../packages/auth/core";

export const publicAuthKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const memory = new Map<string, string>();
const flowPrefix = "glam.pkce.";
// Only short-lived PKCE proof survives an OAuth redirect. Session/refresh tokens never enter web storage.
const storage: SupportedStorage = {
  getItem(key) {
    if (!key.endsWith("-code-verifier")) return memory.get(key) || null;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(flowPrefix + key) || "null",
      );
      if (saved?.until > Date.now() && typeof saved.value === "string") {
        return saved.value;
      }
      sessionStorage.removeItem(flowPrefix + key);
    } catch {
      /* Storage disabled: OAuth fails closed without redirect proof. */
    }
    return null;
  },
  setItem(key, value) {
    if (!key.endsWith("-code-verifier")) {
      memory.set(key, value);
      return;
    }
    sessionStorage.setItem(
      flowPrefix + key,
      JSON.stringify({ value, until: Date.now() + 600000 }),
    );
  },
  removeItem(key) {
    memory.delete(key);
    if (key.endsWith("-code-verifier")) {
      sessionStorage.removeItem(flowPrefix + key);
    }
  },
};
let instance: ReturnType<typeof createAuthClient> | undefined;
export function webAuth() {
  if (!publicAuthKey) throw Error("Account connection is unavailable.");
  return instance ||= createAuthClient(publicAuthKey, storage);
}
export const callbackUrl = () => window.location.origin + "/auth/callback";
export function rememberDestination(path: string) {
  sessionStorage.setItem(
    "glam.auth.return",
    JSON.stringify({ path: safeDestination(path), until: Date.now() + 600000 }),
  );
}
async function completeWebOAuth(): Promise<string | null> {
  if (window.location.pathname.replace(/\/+$/, "") !== "/auth/callback") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  let saved: { path?: string; until?: number } | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem("glam.auth.return") || "null");
  } catch { /* Reject unknown destinations. */ }
  sessionStorage.removeItem("glam.auth.return");
  // Remove authorization codes and provider error text before rendering, analytics or further navigation.
  const destination = safeDestination(
    saved?.until && saved.until > Date.now() ? saved.path : null,
  );
  history.replaceState(null, "", destination);
  if (params.has("error") || !code) {
    throw Error("Social sign-in was not completed. Please try again.");
  }
  const { error } = await webAuth().auth.exchangeCodeForSession(code);
  if (error) {
    throw Error("Social sign-in could not be verified. Please start again.");
  }
  return destination;
}

export function clearWebSession() {
  instance?.auth.stopAutoRefresh();
  memory.clear();
  try {
    sessionStorage.removeItem(flowPrefix + "glam-auth-v1-code-verifier");
    sessionStorage.removeItem("glam.auth.return");
  } catch {
    /* Memory session is cleared even if browser storage is unavailable. */
  }
}

let oauthCompletion: Promise<string | null> | undefined;
export function finishWebOAuth(): Promise<string | null> {
  if (oauthCompletion) return oauthCompletion;
  if (window.location.pathname.replace(/\/+$/, "") !== "/auth/callback") {
    return Promise.resolve(null);
  }
  oauthCompletion = completeWebOAuth().finally(() => {
    oauthCompletion = undefined;
  });
  return oauthCompletion;
}
