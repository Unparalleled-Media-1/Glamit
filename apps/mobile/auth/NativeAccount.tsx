import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import {
  AUTH_URL,
  authMessage,
  availability,
  countryChoices,
  phoneE164,
  providers,
  unavailableAuth,
} from "../../../packages/auth/core";
import type { CountryCode, SocialProvider } from "../../../packages/auth/core";
import {
  biometricSupported,
  forgetBiometricSession,
  rememberBiometricSession,
} from "./secure-session";
import { nativePublicKey, useNativeAccount } from "./use-native-account";

WebBrowser.maybeCompleteAuthSession();
type Props = { auth: ReturnType<typeof useNativeAccount> };
const callback = "glamai://auth/callback";
export default function NativeAccount({ auth }: Props) {
  const insets = useSafeAreaInsets();
  const [available, setAvailable] = useState(unavailableAuth),
    [country, setCountry] = useState<CountryCode>("ZA");
  const [phone, setPhone] = useState(""),
    [target, setTarget] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(0),
    [now, setNow] = useState(Date.now()),
    [countries, setCountries] = useState(false),
    [supported, setSupported] = useState(false),
    [countrySearch, setCountrySearch] = useState("");
  const wait = Math.max(0, 60 - Math.floor((now - sent) / 1000));
  useEffect(() => {
    let live = true;
    void availability(nativePublicKey).then((v) => {
      if (live) setAvailable(v);
    }).catch(() => {});
    void biometricSupported().then((v) => {
      if (live) setSupported(v);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!sent) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sent]);
  const button = (label: string, run: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled }}
      disabled={busy || disabled}
      onPress={run}
      style={[s.button, (busy || disabled) && s.disabled]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
  async function request() {
    if (busy || wait > 0 || !available.phone) return;
    setBusy(true);
    try {
      const number = target || phoneE164(phone, country);
      const { error } = await auth.client().auth.signInWithOtp({
        phone: number,
        options: { shouldCreateUser: true },
      });
      if (error) throw Error(authMessage(error));
      setTarget(number);
      setCode("");
      setSent(Date.now());
      setNow(Date.now());
      auth.setMessage("Code requested. Enter the code from your SMS.");
    } catch (e) {
      auth.setMessage(
        e instanceof Error ? e.message : "Code request was not confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (!/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      const { data, error } = await auth.client().auth.verifyOtp({
        phone: target,
        token: code,
        type: "sms",
      });
      setCode("");
      if (error || !data.session) throw Error(authMessage(error));
      await auth.acceptSignIn(data.session);
    } catch (e) {
      auth.setMessage(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }
  async function social(provider: SocialProvider) {
    if (!available[provider]) return;
    setBusy(true);
    try {
      const { data, error } = await auth.client().auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw Error(authMessage(error));
      if (new URL(data.url).origin !== AUTH_URL) {
        throw Error("Sign-in redirect was not verified.");
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, callback);
      if (result.type !== "success") {
        auth.setMessage("Social sign-in was cancelled.");
        return;
      }
      const url = new URL(result.url);
      if (
        url.protocol !== "glamai:" || url.hostname !== "auth" ||
        url.pathname !== "/callback"
      ) throw Error("Unrecognized sign-in return.");
      const value = url.searchParams.get("code");
      if (!value || url.searchParams.has("error")) {
        throw Error("Sign-in did not complete.");
      }
      const exchanged = await auth.client().auth.exchangeCodeForSession(value);
      if (exchanged.error || !exchanged.data.session) {
        throw Error("Sign-in could not be verified.");
      }
      await auth.acceptSignIn(exchanged.data.session);
    } catch (e) {
      auth.setMessage(
        e instanceof Error ? e.message : "Social sign-in failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remember() {
    setBusy(true);
    try {
      const activeSession = await auth.authorizedSession();
      const data = { session: activeSession };
      await rememberBiometricSession(data.session.refresh_token);
      let device = await SecureStore.getItemAsync("glam.auth.device.v1");
      if (!device) {
        device = Crypto.randomUUID();
        await SecureStore.setItemAsync("glam.auth.device.v1", device);
      }
      const r = await fetch(
        AUTH_URL + "/functions/v1/glam-api/v1/me/devices/" + device,
        {
          method: "PUT",
          headers: {
            apikey: nativePublicKey,
            Authorization: "Bearer " + data.session.access_token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: Platform.OS,
            biometric_enabled: true,
          }),
        },
      );
      if (!r.ok) {
        await forgetBiometricSession();
        throw Error("Your biometric preference could not be saved.");
      }
      auth.setRemembered(true);
      auth.setMessage("Biometric unlock enabled on this device.");
    } catch (e) {
      await forgetBiometricSession();
      auth.setRemembered(false);
      auth.setMessage(
        e instanceof Error ? e.message : "Biometric unlock was not enabled.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disableBiometrics() {
    setBusy(true);
    let synced = false;
    try {
      const device = await SecureStore.getItemAsync("glam.auth.device.v1");
      const { data } = await auth.client().auth.getSession();
      if (device && data.session) {
        const r = await fetch(
          AUTH_URL + "/functions/v1/glam-api/v1/me/devices/" + device,
          {
            method: "PUT",
            headers: {
              apikey: nativePublicKey,
              Authorization: "Bearer " + data.session.access_token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              platform: Platform.OS,
              biometric_enabled: false,
            }),
          },
        );
        synced = r.ok;
      }
    } catch {
      synced = false;
    } finally {
      try {
        await forgetBiometricSession();
      } catch {
        auth.setMessage(
          "Biometric-secret removal could not be confirmed. Sign out of all devices and retry.",
        );
        setBusy(false);
        return;
      }
      auth.setRemembered(false);
      auth.setMessage(
        synced
          ? "Biometric unlock disabled."
          : "Biometric unlock disabled on this device. Account preference sync was not confirmed.",
      );
      setBusy(false);
    }
  }
  if (auth.locked) {
    return (
      <View style={s.card}>
        <Text style={s.heading}>Welcome back</Text>
        <Text>Your account is locked on this device.</Text>
        {auth.remembered && supported &&
          button("Unlock with device biometrics", () => void auth.unlock())}
        {button("Use SMS or a linked account", () => void auth.freshLogin())}
        <Text accessibilityLiveRegion="polite">{auth.message}</Text>
      </View>
    );
  }
  if (auth.account) {
    return (
      <View style={s.card}>
        <Text style={s.heading}>Your GLAM account</Text>
        <Text>
          {auth.account.profile.display_name || "Your profile is ready."}
        </Text>
        <Text>
          {auth.account.workspaces?.length || 0} approved business workspaces
        </Text>
        {!auth.remembered && supported && (
          <>
            <Text>Enable biometric login for faster access?</Text>
            {button("Enable biometric login", () => void remember())}
          </>
        )}
        {auth.remembered &&
          button("Turn off biometric login", () => void disableBiometrics())}
        {button("Sign out of this device", () => void auth.logout())}
        {button("Sign out of all devices", () => void auth.logout(true))}
        <Text accessibilityLiveRegion="polite">{auth.message}</Text>
      </View>
    );
  }
  return (
    <View style={s.card}>
      <Text style={s.heading}>Welcome to GLAM AI</Text>
      <Text>Your personal beauty and style journey starts here.</Text>
      {!target
        ? (
          <>
            <Text>Country calling code</Text>
            {button(
              (countryChoices.find((c) => c.country === country)?.name ||
                country) +
                " +" +
                countryChoices.find((c) => c.country === country)?.callingCode,
              () => setCountries(!countries),
            )}
            <Modal
              visible={countries}
              transparent
              animationType="slide"
              onRequestClose={() => setCountries(false)}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#0009",
                  paddingTop: Math.max(16, insets.top),
                  paddingBottom: Math.max(16, insets.bottom),
                  paddingHorizontal: 20,
                }}
                accessibilityViewIsModal
              >
                <View style={[s.card, { flex: 1 }]}>
                  <Text style={s.heading}>Country calling code</Text>
                  <TextInput
                    accessibilityLabel="Search countries"
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    style={s.input}
                  />
                  <ScrollView>
                    {countryChoices.filter((c) =>
                      (c.name + " " + c.country + " " + c.callingCode)
                        .toLowerCase().includes(countrySearch.toLowerCase())
                    ).map((c) => (
                      <Pressable
                        key={c.country}
                        accessibilityRole="button"
                        onPress={() => {
                          setCountry(c.country);
                          setCountries(false);
                          setCountrySearch("");
                        }}
                        style={s.option}
                      >
                        <Text>{c.name} +{c.callingCode}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  {button("Close country selector", () => setCountries(false))}
                </View>
              </View>
            </Modal>
            <Text>Mobile number</Text>
            <TextInput
              accessibilityLabel="Mobile number"
              autoComplete="tel"
              textContentType="telephoneNumber"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={80}
              editable={!busy}
              style={s.input}
            />
            {button(
              "Continue with SMS",
              () => void request(),
              !available.phone,
            )}
            {!available.phone && (
              <Text>
                SMS sign-in is awaiting provider setup. No code will be sent.
              </Text>
            )}
          </>
        )
        : (
          <>
            <Text>Verification code</Text>
            <TextInput
              accessibilityLabel="Verification code"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === "android"
                ? "sms-otp"
                : "one-time-code"}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
              maxLength={6}
              editable={!busy}
              style={s.input}
            />
            {button("Verify code", () => void verify(), code.length !== 6)}
            {button(wait ? `Resend in ${wait}s` : "Resend code", () =>
              void request(), wait > 0)}
            {button("Change number", () => {
              setTarget("");
              setCode("");
            })}
          </>
        )}
      <Text>Or continue with</Text>
      {providers.map((p) => (
        <View key={p}>
          {button(
            p[0].toUpperCase() + p.slice(1),
            () => void social(p),
            !available[p],
          )}
        </View>
      ))}
      <Text>Social options activate after provider setup.</Text>
      {button(
        "Privacy",
        () =>
          void Linking.openURL("https://www.glamit.beauty/privacy"),
      )}
      {button(
        "Terms",
        () =>
          void Linking.openURL("https://www.glamit.beauty/terms"),
      )}
      <Text accessibilityLiveRegion="polite">{auth.message}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: "#fff",
    gap: 14,
    borderWidth: 1,
    borderColor: "#ddd6d2",
    marginVertical: 16,
  },
  heading: { fontSize: 23, fontWeight: "600", color: "#17151a" },
  input: {
    minHeight: 48,
    padding: 14,
    borderWidth: 1,
    borderColor: "#847c87",
    borderRadius: 14,
    color: "#17151a",
  },
  button: {
    minHeight: 48,
    backgroundColor: "#17151a",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: .45 },
  option: { minHeight: 48, padding: 14 },
});
