import { useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import { loadAccount, sessionMarker } from "../../../packages/auth/core";
import type { CoreAccount, Session } from "../../../packages/auth/core";
import {
  biometricEnabled,
  clearNativeMemory,
  createNativeAuth,
  forgetBiometricSession,
  rotateBiometricSession,
  unlockBiometricSession,
} from "./secure-session";

export const nativePublicKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
export function useNativeAccount() {
  const ref = useRef<ReturnType<typeof createNativeAuth> | null>(null);
  const [account, setAccount] = useState<CoreAccount | null>(null),
    [locked, setLocked] = useState(false),
    [remembered, setRememberedState] = useState(false),
    [message, setMessage] = useState("");
  const fence = useRef(0),
    active = useRef(AppState.currentState === "active"),
    unlocked = useRef(false),
    approved = useRef<string | null>(null),
    rememberedRef = useRef(false);
  function setRemembered(value: boolean) {
    rememberedRef.current = value;
    setRememberedState(value);
  }
  const client = () => {
    if (!nativePublicKey) throw Error("Account connection is unavailable.");
    return ref.current ||= createNativeAuth(nativePublicKey);
  };
  async function acceptSignIn(session: Session) {
    const marker = sessionMarker(session);
    if (!marker) {
      throw Error("Session validation is incomplete. Sign in again.");
    }
    const ticket = ++fence.current;
    const { data, error } = await client().auth.getUser(session.access_token);
    if (error || data.user?.id !== session.user.id) {
      throw Error("Your session could not be revalidated.");
    }
    const loaded = await loadAccount(
      nativePublicKey,
      session.access_token,
      session.user.id,
    );
    if (ticket !== fence.current || !active.current) return;
    approved.current = marker;
    unlocked.current = true;
    setAccount(loaded);
    setLocked(false);
    setMessage("");
    client().auth.startAutoRefresh();
  }
  useEffect(() => {
    if (!nativePublicKey) return;
    const auth = client();
    let live = true;
    void biometricEnabled().then((v) => {
      if (live) {
        setRemembered(v);
        setLocked(v);
      }
    }).catch(() => {
      if (live) {
        setLocked(true);
        setMessage(
          "Saved device preferences could not be checked. Use a fresh sign-in.",
        );
      }
    });
    const { data } = auth.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        fence.current++;
        approved.current = null;
        unlocked.current = false;
        setAccount(null);
        return;
      }
      // New OTP/OAuth/BIO sessions are accepted only by their completed explicit proof flow below.
      if (
        !session || !active.current || !unlocked.current ||
        sessionMarker(session) !== approved.current
      ) return;
      queueMicrotask(() => {
        void (async () => {
          try {
            await acceptSignIn(session);
            if (active.current && unlocked.current && rememberedRef.current) {
              await rotateBiometricSession(session.refresh_token);
            }
          } catch {
            if (live) {
              setMessage(
                "Session refresh could not be confirmed. Use a fresh sign-in.",
              );
            }
          }
        })();
      });
    });
    const subscription = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
      if (state === "background") {
        fence.current++;
        unlocked.current = false;
        approved.current = null;
        auth.auth.stopAutoRefresh();
        clearNativeMemory();
        setAccount(null);
        setLocked(true);
      }
    });
    // Cold OAuth returns use the same SDK PKCE verifier kept in secure OS storage.
    void Linking.getInitialURL().then(async (value) => {
      if (!live || !value) return;
      const url = new URL(value);
      if (
        url.protocol !== "glamai:" || url.hostname !== "auth" ||
        url.pathname !== "/callback"
      ) return;
      const code = url.searchParams.get("code");
      if (!code || url.searchParams.has("error")) {
        throw Error("OAuth return was not confirmed.");
      }
      const { data, error } = await auth.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        throw Error("OAuth return could not be verified.");
      }
      if (live) await acceptSignIn(data.session);
    }).catch(() => {
      if (live) {
        setMessage("Social sign-in was not completed. Please start again.");
      }
    });
    return () => {
      live = false;
      fence.current++;
      data.subscription.unsubscribe();
      auth.auth.stopAutoRefresh();
      clearNativeMemory();
      subscription.remove();
    };
  }, []);
  async function freshLogin() {
    fence.current++;
    unlocked.current = false;
    approved.current = null;
    client().auth.stopAutoRefresh();
    let removed = true;
    try {
      await forgetBiometricSession();
    } catch {
      removed = false;
    }
    clearNativeMemory();
    setRemembered(false);
    setAccount(null);
    setLocked(false);
    setMessage(
      removed
        ? ""
        : "Saved device-secret removal was not confirmed. Use a fresh sign-in.",
    );
  }
  async function unlock() {
    let token: string | null;
    try {
      token = await unlockBiometricSession();
    } catch {
      setMessage(
        "Unlock was cancelled or unavailable. Retry biometrics or use a fresh sign-in.",
      );
      return;
    }
    if (!token) {
      await freshLogin();
      setMessage("Your saved session is unavailable. Sign in again.");
      return;
    }
    try {
      const { data, error } = await client().auth.refreshSession({
        refresh_token: token,
      });
      if (error || !data.session) throw Error("Invalid session");
      await acceptSignIn(data.session);
      if (active.current && unlocked.current) {
        await rotateBiometricSession(data.session.refresh_token);
      }
    } catch {
      await freshLogin();
      setMessage(
        "Your session ended or could not be revalidated. Sign in again with SMS or a linked account.",
      );
    }
  }
  async function logout(all = false) {
    fence.current++;
    unlocked.current = false;
    approved.current = null;
    client().auth.stopAutoRefresh();
    let confirmed = false;
    try {
      const result = await client().auth.signOut({
        scope: all ? "global" : "local",
      });
      confirmed = !result.error;
    } catch { /* No false server-revocation claim. */ }
    await freshLogin();
    setMessage(
      confirmed
        ? "Signed out."
        : "Memory session cleared. Server revocation could not be confirmed.",
    );
  }
  async function authorizedSession() {
    const { data, error } = await client().auth.getSession();
    if (
      error || !data.session || !unlocked.current ||
      sessionMarker(data.session) !== approved.current
    ) throw Error("Unlock or sign in again before saving device settings.");
    return data.session;
  }
  return {
    account,
    setAccount,
    client,
    acceptSignIn,
    authorizedSession,
    locked,
    remembered,
    setRemembered,
    message,
    setMessage,
    unlock,
    logout,
    freshLogin,
  };
}
