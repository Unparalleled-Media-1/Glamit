"use client";
import { useEffect, useState } from "react";
import {
  authMessage,
  availability,
  phoneE164,
  providers,
  unavailableAuth,
} from "../../../packages/auth/core";
import {
  callbackUrl,
  publicAuthKey,
  rememberDestination,
  webAuth,
} from "../lib/passwordless";
import AuthProviderButton from "./AuthProviderButton";
import type { SocialProvider } from "../../../packages/auth/core";

export default function AccountSecurity(
  { userId, accessToken, onSignedOut }: {
    userId: string;
    accessToken: string;
    onSignedOut: () => void;
  },
) {
  type Channels = {
    sms_updates: boolean;
    email_updates: boolean;
    push_updates: boolean;
    revision: number;
  };
  const [channels, setChannels] = useState<Channels | null>(null);
  useEffect(() => {
    let live = true;
    void fetch(
      "https://bkkmsbxrxkqaveymcrgi.supabase.co/functions/v1/glam-api/v1/me/notifications",
      {
        headers: {
          apikey: publicAuthKey,
          Authorization: "Bearer " + accessToken,
        },
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    ).then(async (r) => {
      if (!r.ok) throw 0;
      const data = await r.json();
      if (live && typeof data.revision === "number") setChannels(data);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [accessToken]);
  async function saveChannel(
    name: "sms_updates" | "email_updates" | "push_updates",
    value: boolean,
  ) {
    if (!channels) return;
    setBusy(true);
    try {
      const r = await fetch(
        "https://bkkmsbxrxkqaveymcrgi.supabase.co/functions/v1/glam-api/v1/me/notifications",
        {
          method: "PATCH",
          headers: {
            apikey: publicAuthKey,
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expected_revision: channels.revision,
            [name]: value,
          }),
          credentials: "omit",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!r.ok) throw 0;
      setChannels(await r.json());
      setMessage("Notification preference saved. No message was sent.");
    } catch {
      setMessage("The preference was not saved. Reload before retrying.");
    } finally {
      setBusy(false);
    }
  }
  const [available, setAvailable] = useState(unavailableAuth),
    [linked, setLinked] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [changing, setChanging] = useState(false);
  useEffect(() => {
    let live = true;
    void availability(publicAuthKey).then((v) => {
      if (live) setAvailable(v);
    }).catch(() => {});
    void webAuth().auth.getUser().then(({ data }) => {
      if (live && data.user?.id === userId) {
        setLinked((data.user.identities || []).map((i) => i.provider));
      }
    });
    return () => {
      live = false;
    };
  }, [userId]);
  async function link(provider: SocialProvider) {
    setBusy(true);
    try {
      const { data: proof, error: invalid } = await webAuth().auth.getUser();
      if (invalid || proof.user?.id !== userId) {
        throw Error("Sign in again before linking another account.");
      }
      rememberDestination("/profile");
      const { data, error } = await webAuth().auth.linkIdentity({
        provider,
        options: { redirectTo: callbackUrl(), skipBrowserRedirect: true },
      });
      if (error || !data.url) throw Error(authMessage(error));
      if (
        new URL(data.url).origin !== "https://bkkmsbxrxkqaveymcrgi.supabase.co"
      ) throw Error("Unverified link destination.");
      location.assign(data.url);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Linking could not be confirmed.",
      );
      setBusy(false);
    }
  }
  async function changePhone() {
    setBusy(true);
    try {
      const number = phoneE164(phone, "ZA");
      const { error } = await webAuth().auth.updateUser({ phone: number });
      if (error) throw Error(authMessage(error));
      setPhone(number);
      setChanging(true);
      setMessage(
        "Phone verification requested. Keep access to your old number until the change is complete.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Phone verification was not confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verifyPhone() {
    setBusy(true);
    try {
      const { error } = await webAuth().auth.verifyOtp({
        phone,
        token: code,
        type: "phone_change",
      });
      setCode("");
      if (error) throw Error(authMessage(error));
      const { data, error: invalid } = await webAuth().auth.getUser();
      if (invalid || data.user?.id !== userId) {
        throw Error("Account validation failed.");
      }
      if ("+" + data.user.phone?.replace(/^\+/, "") !== phone) {
        setMessage("Verify the other phone number to complete this change.");
        return;
      }
      setChanging(false);
      setPhone("");
      setMessage("Phone number verified on your existing account.");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Phone verification was not confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logoutAll() {
    setBusy(true);
    try {
      const { error } = await webAuth().auth.signOut({ scope: "global" });
      if (error) {
        throw Error("Server revocation could not be confirmed. Please retry.");
      }
      onSignedOut();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Sign-out could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="auth-surface auth-security"
      aria-label="Account security"
    >
      <h3>Sign-in & security</h3>
      <p>
        Linked methods:{" "}
        {linked.join(", ") || "Loading your verified identities…"}
      </p>
      <div className="auth-provider-list">
        {providers.filter((p) => available[p] && !linked.includes(p)).map(
          (p) => (
            <AuthProviderButton
              key={p}
              provider={p}
              disabled={busy}
              link
              onClick={() => void link(p)}
            />
          ),
        )}
      </div>
      <p className="fine">
        Linking requires this signed-in account and verification with the new
        provider. Existing accounts are not merged by this app.
      </p>
      {available.phone && (
        <form
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            void (changing ? verifyPhone() : changePhone());
          }}
        >
          <label htmlFor="link-phone">
            Add or change mobile number, including country code
          </label>
          <input
            id="link-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={busy || changing}
          />
          {changing && (
            <>
              <label htmlFor="link-code">Phone verification code</label>
              <input
                id="link-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                required
              />
            </>
          )}
          <button
            className="button secondary"
            disabled={busy || !available.phone}
          >
            {changing ? "Verify phone change" : "Verify mobile number"}
          </button>
        </form>
      )}
      <button
        className="text-button"
        disabled={busy}
        onClick={() => void logoutAll()}
      >
        Sign out of all devices
      </button>
      <p className="fine">
        Recover access using SMS or another linked sign-in. Changing a number
        requires verification; matching names never grant access.
      </p>
      <h4>Notification preferences</h4>
      {channels
        ? (["sms_updates", "email_updates", "push_updates"] as const).map(
          (name) => (
            <label className="check" key={name}>
              <input
                type="checkbox"
                checked={channels[name]}
                disabled={busy}
                onChange={(e) => void saveChannel(name, e.target.checked)}
              />
              {name === "sms_updates"
                ? "SMS updates"
                : name === "email_updates"
                ? "Email updates"
                : "Push notifications"}
            </label>
          ),
        )
        : (
          <p className="fine">
            Notification preferences are loading or unavailable.
          </p>
        )}
      <p role="status" aria-live="polite">{message}</p>
    </section>
  );
}
