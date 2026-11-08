"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadAccount } from "../../../packages/auth/core";
import type { CoreAccount } from "../../../packages/auth/core";
import { finishWebOAuth, publicAuthKey, webAuth } from "./passwordless";

export function useAccountSession(onDestination?: (path: string) => void) {
  const [session, setSession] = useState<CoreAccount | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(Boolean(publicAuthKey));
  const fence = useRef(0);
  const destination = useRef(onDestination);
  destination.current = onDestination;
  const retry = useCallback(async () => {
    const ticket = ++fence.current;
    setChecking(true);
    try {
      const { data, error: failure } = await webAuth().auth.getSession();
      if (failure || !data.session) {
        if (ticket === fence.current) setSession(null);
        return;
      }
      const { data: user, error: invalid } = await webAuth().auth.getUser();
      if (invalid || user.user?.id !== data.session.user.id) {
        throw Error("Sign in again to continue.");
      }
      const loaded = await loadAccount(
        publicAuthKey,
        data.session.access_token,
        data.session.user.id,
      );
      if (ticket === fence.current) {
        setSession(loaded);
        setError("");
      }
    } catch {
      if (ticket === fence.current) {
        setSession(null);
        setError("Your account could not be loaded. Retry or sign in again.");
      }
    } finally {
      if (ticket === fence.current) setChecking(false);
    }
  }, []);
  useEffect(() => {
    if (!publicAuthKey) return;
    const auth = webAuth();
    let live = true;
    const { data } = auth.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        fence.current++;
        setSession(null);
        setError("");
        setChecking(false);
      } else if (
        [
          "SIGNED_IN",
          "TOKEN_REFRESHED",
          "USER_UPDATED",
          "INITIAL_SESSION",
        ].includes(event)
      ) {
        queueMicrotask(() => {
          if (live) void retry();
        });
      }
    });
    auth.auth.startAutoRefresh();
    void finishWebOAuth()
      .then((path) => {
        if (live && path) destination.current?.(path);
      })
      .catch(() => {
        if (live) {
          setError("Social sign-in was not completed. Please start again.");
        }
      });
    const visibility = () => {
      if (document.visibilityState === "visible") {
        auth.auth.startAutoRefresh();
        void retry();
      } else auth.auth.stopAutoRefresh();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      live = false;
      fence.current++;
      data.subscription.unsubscribe();
      auth.auth.stopAutoRefresh();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [retry]);
  return { session, setSession, error, retry, checking };
}
