"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  authMessage,
  availability,
  countryChoices,
  phoneE164,
  providers,
  unavailableAuth,
} from "../../../packages/auth/core";
import type { CountryCode, SocialProvider } from "../../../packages/auth/core";
import {
  callbackUrl,
  publicAuthKey,
  rememberDestination,
  webAuth,
} from "../lib/passwordless";
import AuthProviderButton from "./AuthProviderButton";
import { appPath } from "../lib/paths";

export default function PasswordlessSignIn() {
  const [available, setAvailable] = useState(unavailableAuth);
  const [country, setCountry] = useState<CountryCode>("ZA");
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState("");
  const [otp, setOtp] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [legacy, setLegacy] = useState(false);
  const wait = Math.max(0, 60 - Math.floor((now - sentAt) / 1000));
  useEffect(() => {
    let live = true;
    void availability(publicAuthKey).then((v) => {
      if (live) setAvailable(v);
    }).catch(() => {
      if (live) {
        setMessage("Sign-in availability could not be checked. Please retry.");
      }
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!sentAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt]);
  useEffect(() => {
    if (!target || !("OTPCredential" in window) || !navigator.credentials) {
      return;
    }
    const abort = new AbortController();
    void navigator.credentials.get(
      {
        otp: { transport: ["sms"] },
        signal: abort.signal,
      } as CredentialRequestOptions,
    ).then((value) => {
      const code = (value as Credential & { code?: string } | null)?.code;
      if (!abort.signal.aborted && code && /^\d{6}$/.test(code)) setOtp(code);
    }).catch(
      () => {
        /* Unsupported, denied or cancelled: manual entry remains available. */
      },
    );
    return () => abort.abort();
  }, [target]);
  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    if (busy || !available.phone || wait > 0) return;
    setBusy(true);
    setMessage("");
    try {
      const number = target || phoneE164(phone, country);
      const { error } = await webAuth().auth.signInWithOtp({
        phone: number,
        options: { shouldCreateUser: true },
      });
      if (error) throw Error(authMessage(error));
      setTarget(number);
      setOtp("");
      setSentAt(Date.now());
      setNow(Date.now());
      setMessage(
        "Code requested. Enter the code from your SMS. Delivery can take a moment.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "The code request could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    if (busy || !/^\d{6}$/.test(otp)) return;
    setBusy(true);
    setMessage("Verifying your code…");
    try {
      const { error } = await webAuth().auth.verifyOtp({
        phone: target,
        token: otp,
        type: "sms",
      });
      setOtp("");
      if (error) throw Error(authMessage(error));
      setMessage("Signed in. Loading your account…");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "The code could not be verified.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: SocialProvider) {
    if (busy || !available[provider]) return;
    setBusy(true);
    setMessage("Opening secure sign-in…");
    try {
      rememberDestination(window.location.pathname);
      const { data, error } = await webAuth().auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl(), skipBrowserRedirect: true },
      });
      if (error || !data.url) throw Error(authMessage(error));
      const url = new URL(data.url);
      if (url.origin !== "https://bkkmsbxrxkqaveymcrgi.supabase.co") {
        throw Error("Sign-in redirect was not verified.");
      }
      window.location.assign(data.url);
    } catch (e) {
      setBusy(false);
      setMessage(
        e instanceof Error ? e.message : "Social sign-in is unavailable.",
      );
    }
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("Signing in…");
    const form = e.currentTarget, data = new FormData(form);
    try {
      const { error } = await webAuth().auth.signInWithPassword({
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      form.reset();
      if (error) throw Error(authMessage(error));
      setMessage("Signed in. Loading your account…");
    } catch (e) {
      form.reset();
      setMessage(
        e instanceof Error ? e.message : "Sign-in could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-surface" aria-label="Sign in to GLAM Beauty">
      <p className="auth-intro">
        Your personal beauty and style journey starts here.
      </p>

      {available.phone || target
        ? (!target
          ? (
            <form method="post" onSubmit={requestCode}>
              <label htmlFor="login-country">Country calling code</label>
              <select
                id="login-country"
                value={country}
                disabled={busy}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
              >
                {countryChoices.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.name} +{c.callingCode}
                  </option>
                ))}
              </select>
              <label htmlFor="login-phone">Mobile number</label>
              <input
                id="login-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={80}
                required
                disabled={busy}
              />
              <button className="button" disabled={busy || !available.phone}>
                {busy ? "Please wait…" : "Continue with SMS"}
              </button>
              {!available.phone && (
                <p className="fine">
                  SMS sign-in is awaiting provider setup. No code will be sent.
                </p>
              )}
            </form>
          )
          : (
            <form method="post" onSubmit={verify}>
              <label htmlFor="login-code">Verification code</label>
              <input
                id="login-code"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                disabled={busy}
              />
              <p className="fine">
                Enter the six-digit code requested for{" "}
                {target}. Codes expire; request a new one if needed.
              </p>
              <button className="button" disabled={busy || otp.length !== 6}>
                Verify code
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy || wait > 0}
                onClick={() => requestCode()}
              >
                {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setTarget("");
                  setOtp("");
                  setMessage("");
                }}
              >
                Change number
              </button>
            </form>
          ))
        : (
          <p className="auth-unavailable" role="status">
            SMS sign-in isn’t available right now. You can explore as a guest or
            use an existing email account.
          </p>
        )}
      {providers.some((p) => available[p]) && (
        <>
          <div className="auth-divider">
            <span>Or continue with</span>
          </div>
          <div className="auth-provider-list">
            {providers.filter((p) => available[p]).map((provider) => (
              <AuthProviderButton
                key={provider}
                provider={provider}
                disabled={busy}
                onClick={() => void social(provider)}
              />
            ))}
          </div>
        </>
      )}
      <button
        className="text-button"
        type="button"
        onClick={() => setLegacy(!legacy)}
        disabled={busy}
      >
        Use an existing email and password
      </button>
      {legacy && (
        <form method="post" onSubmit={password}>
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={busy}
          />
          <label htmlFor="account-password">Password</label>
          <input
            id="account-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
          />
          <button className="button" disabled={busy}>Sign in</button>
        </form>
      )}
      <p className="fine">
        <a href={appPath("/privacy")}>Privacy</a> ·{" "}
        <a href="https://www.glamit.beauty/terms">Terms</a>
      </p>
      {!available.phone && (
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={() => {
            void availability(publicAuthKey).then((v) => {
              setAvailable(v);
              setMessage(
                v.configured
                  ? "Sign-in options updated."
                  : "Account connection is unavailable.",
              );
            }).catch(() =>
              setMessage("Sign-in options could not be checked. Try again.")
            );
          }}
        >
          Refresh sign-in options
        </button>
      )}
      <p role="status" aria-live="polite">{message}</p>
    </section>
  );
}
