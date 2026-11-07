/** One Supabase identity; no OTP implementation or persistence outside Supabase Auth. */
import { countryLabels } from "./country-labels";
import { createClient } from "@supabase/supabase-js";
import type {
  Session,
  SupabaseClient,
  SupportedStorage,
} from "@supabase/supabase-js";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max";
import type { CountryCode } from "libphonenumber-js";

export const AUTH_URL = "https://bkkmsbxrxkqaveymcrgi.supabase.co";
export const providers = ["google", "apple", "facebook"] as const;
export type SocialProvider = typeof providers[number];
export type { CountryCode, Session, SupportedStorage };
export type AuthAvailability = {
  phone: boolean;
  google: boolean;
  apple: boolean;
  facebook: boolean;
  configured: boolean;
};
export const unavailableAuth: AuthAvailability = {
  phone: false,
  google: false,
  apple: false,
  facebook: false,
  configured: false,
};
export function phoneE164(input: string, country: CountryCode): string {
  if (input.length > 80 || !/^[+\p{Nd}\s().-]+$/u.test(input)) {
    throw Error("Enter a valid mobile number.");
  }
  const number = parsePhoneNumberFromString(input, country);
  if (!number?.isValid()) throw Error("Check the country and mobile number.");
  return number.number;
}
export const countryChoices = getCountries().map((country) => ({
  country,
  name: countryLabels[country] || country,
  callingCode: getCountryCallingCode(country),
})).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
export function safeDestination(value: string | null | undefined): string {
  if (
    !value || !/^\/(?!\/)[a-z0-9/-]*$/i.test(value) || value.includes("..") ||
    value.startsWith("/auth/")
  ) return "/";
  return value;
}
export function authMessage(
  error: { code?: string; status?: number } | null | undefined,
): string {
  if (
    error?.status === 429 || /rate_limit|over_request/.test(error?.code || "")
  ) return "Too many attempts. Wait before trying again.";
  if (/otp_expired|otp_disabled|invalid_credentials/.test(error?.code || "")) {
    return "That code or login is invalid or expired. Please try again.";
  }
  if (/captcha/.test(error?.code || "")) {
    return "Complete the security check before trying again.";
  }
  if (
    /identity_already_exists|email_exists|user_already_exists/.test(
      error?.code || "",
    )
  ) {
    return "This identity is already associated with an account. Sign in to that account; accounts were not merged.";
  }
  return "Sign-in could not be confirmed. Please try again.";
}
export function createAuthClient(
  publicKey: string,
  storage: SupportedStorage,
): SupabaseClient {
  return createClient(AUTH_URL, publicKey, {
    auth: {
      flowType: "pkce",
      storage,
      storageKey: "glam-auth-v1",
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  });
}
export async function availability(
  publicKey: string,
): Promise<AuthAvailability> {
  if (!publicKey) return unavailableAuth;
  const response = await fetch(AUTH_URL + "/auth/v1/settings", {
    headers: { apikey: publicKey },
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return unavailableAuth;
  const data = await response.json();
  return {
    configured: true,
    phone: data.external?.phone === true,
    google: data.external?.google === true,
    apple: data.external?.apple === true,
    facebook: data.external?.facebook === true,
  };
}
export type CoreWorkspace = {
  organization_id: string;
  name: string;
  workspace: string;
  can_write: boolean;
};
export type CoreRoutine = {
  id: string;
  title: string;
  steps: { text: string; done: boolean }[];
  revision: number;
};
export type CoreAccount = {
  token: string;
  profile: { id: string; display_name: string | null };
  routines: CoreRoutine[];
  workspaces?: CoreWorkspace[];
};
export async function loadAccount(
  publicKey: string,
  token: string,
  expectedUserId?: string,
): Promise<CoreAccount> {
  const read = async (path: string) => {
    const r = await fetch(AUTH_URL + "/functions/v1/glam-api" + path, {
      headers: { apikey: publicKey, Authorization: "Bearer " + token },
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      throw Error("Your account could not be loaded. Retry the connection.");
    }
    return r.json();
  };
  const [profile, routines, workspaces] = await Promise.all([
    read("/v1/me/profile"),
    read("/v1/me/routines"),
    read("/v1/me/workspaces"),
  ]);
  if (expectedUserId && profile.id !== expectedUserId) {
    throw Error("Account identity could not be confirmed.");
  }
  return { token, profile, routines, workspaces };
}

/** Correlation only, never authentication: Supabase and the backend verify this token. */
export function sessionMarker(session: Session): string | null {
  try {
    const part = session.access_token.split(".")[1];
    const claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims.session_id === "string" &&
        /^[a-f0-9-]{36}$/i.test(claims.session_id)
      ? session.user.id + ":" + claims.session_id
      : null;
  } catch {
    return null;
  }
}
