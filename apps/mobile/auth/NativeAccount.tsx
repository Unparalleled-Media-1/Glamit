import BrandLogo from "../BrandLogo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import {
  Image,
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
import type { TextProps } from "react-native";
import design from "../../../packages/product/consumer-design.json";
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
const colors = design.palette;
const providerImages = {
  google: require("./assets/google.png"),
  apple: require("./assets/apple.png"),
  facebook: require("./assets/facebook.png"),
};
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
  const [focused, setFocused] = useState<string | null>(null);
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
  const button = (
    label: string,
    run: () => void,
    disabled = false,
    primary = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled }}
      disabled={busy || disabled}
      onPress={run}
      style={[s.button, primary && s.primary, (busy || disabled) && s.disabled]}
    >
      <AuthText style={[s.buttonText, primary && s.primaryText]}>
        {label}
      </AuthText>
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
        <AuthText style={s.heading}>Welcome back</AuthText>
        <AuthText>Your account is locked on this device.</AuthText>
        {auth.remembered && supported &&
          button(
            "Unlock with device biometrics",
            () => void auth.unlock(),
            false,
            true,
          )}
        {button("Use SMS or a linked account", () => void auth.freshLogin())}
        <AuthText accessibilityLiveRegion="polite">{auth.message}</AuthText>
      </View>
    );
  }
  if (auth.account) {
    return (
      <View style={s.card}>
        <AuthText style={s.heading}>Your GLAM account</AuthText>
        <AuthText>
          {auth.account.profile.display_name || "Your profile is ready."}
        </AuthText>
        <AuthText>
          {auth.account.workspaces?.length || 0} approved business workspaces
        </AuthText>
        {!auth.remembered && supported && (
          <>
            <AuthText>Enable biometric login for faster access?</AuthText>
            {button(
              "Enable biometric login",
              () => void remember(),
              false,
              true,
            )}
          </>
        )}
        {auth.remembered &&
          button("Turn off biometric login", () => void disableBiometrics())}
        {button("Sign out of this device", () => void auth.logout())}
        {button("Sign out of all devices", () => void auth.logout(true))}
        <AuthText accessibilityLiveRegion="polite">{auth.message}</AuthText>
      </View>
    );
  }
  return (
    <View style={s.card}>
      <BrandLogo />
      <AuthText style={s.heading}>Welcome to GLAM Beauty</AuthText>
      <AuthText>Your personal beauty and style journey starts here.</AuthText>
      {available.phone || target
        ? (!target
          ? (
            <>
              <AuthText>Country calling code</AuthText>
              {button(
                (countryChoices.find((c) => c.country === country)?.name ||
                  country) +
                  " +" +
                  countryChoices.find((c) => c.country === country)
                    ?.callingCode,
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
                    backgroundColor: colors.charcoal + "99",
                    paddingTop: Math.max(16, insets.top),
                    paddingBottom: Math.max(16, insets.bottom),
                    paddingHorizontal: 20,
                  }}
                  accessibilityViewIsModal
                >
                  <View style={[s.card, { flex: 1 }]}>
                    <AuthText style={s.heading}>Country calling code</AuthText>
                    <TextInput
                      accessibilityLabel="Search countries"
                      value={countrySearch}
                      onChangeText={setCountrySearch}
                      onFocus={() => setFocused("search")}
                      onBlur={() => setFocused(null)}
                      style={[s.input, focused === "search" && s.inputFocused]}
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
                          accessibilityState={{
                            selected: c.country === country,
                          }}
                          style={[
                            s.option,
                            c.country === country && s.selectedOption,
                          ]}
                        >
                          <AuthText>{c.name} +{c.callingCode}</AuthText>
                        </Pressable>
                      ))}
                    </ScrollView>
                    {button(
                      "Close country selector",
                      () => setCountries(false),
                    )}
                  </View>
                </View>
              </Modal>
              <AuthText>Mobile number</AuthText>
              <TextInput
                testID="auth-mobile-number"
                accessibilityLabel="Mobile number"
                autoComplete="tel"
                textContentType="telephoneNumber"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={80}
                editable={!busy}
                onFocus={() => setFocused("phone")}
                onBlur={() => setFocused(null)}
                style={[s.input, focused === "phone" && s.inputFocused]}
              />
              {button(
                "Continue with SMS",
                () => void request(),
                !available.phone,
                true,
              )}
              {!available.phone && (
                <AuthText>
                  SMS sign-in is awaiting provider setup. No code will be sent.
                </AuthText>
              )}
            </>
          )
          : (
            <>
              <AuthText>Verification code</AuthText>
              <TextInput
                testID="auth-verification-code"
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
                onFocus={() => setFocused("code")}
                onBlur={() => setFocused(null)}
                style={[s.input, focused === "code" && s.inputFocused]}
              />
              {button(
                "Verify code",
                () => void verify(),
                code.length !== 6,
                true,
              )}
              {button(
                wait ? `Resend in ${wait}s` : "Resend code",
                () => void request(),
                wait > 0,
              )}
              {button("Change number", () => {
                setTarget("");
                setCode("");
              })}
            </>
          ))
        : (
          <AuthText>
            SMS sign-in isn’t available right now. Explore GLAM Beauty without
            signing in.
          </AuthText>
        )}
      {providers.some((p) => available[p]) && (
        <AuthText>Or continue with</AuthText>
      )}
      {providers.filter((p) => available[p]).map((p) => (
        <Pressable
          key={p}
          accessibilityRole="button"
          accessibilityLabel={`Continue with ${
            p[0].toUpperCase() + p.slice(1)
          }`}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => void social(p)}
          style={[
            s.button,
            s.provider,
            p === "google" ? s.google : p === "apple" ? s.apple : s.facebook,
            busy && s.disabled,
          ]}
        >
          <Image
            source={providerImages[p]}
            style={s.providerIcon}
            accessible={false}
          />
          <AuthText
            style={[
              s.buttonText,
              s.providerText,
              p === "google" ? s.googleText : s.whiteText,
            ]}
          >
            Continue with {p[0].toUpperCase() + p.slice(1)}
          </AuthText>
        </Pressable>
      ))}
      {button(
        "Privacy",
        () => void Linking.openURL("https://www.glam.beauty/privacy"),
      )}
      {button(
        "Terms",
        () => void Linking.openURL("https://www.glam.beauty/terms"),
      )}
      <AuthText accessibilityLiveRegion="polite">{auth.message}</AuthText>
    </View>
  );
}
function AuthText({ style, ...props }: TextProps) {
  return <Text {...props} style={[s.body, style]} />;
}
const s = StyleSheet.create({
  body: { color: colors.ink, fontSize: design.type.body, lineHeight: 21 },
  card: {
    padding: design.spacing.xl,
    borderRadius: design.radius.sheet,
    backgroundColor: colors.ivory,
    gap: design.spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginVertical: design.spacing.lg,
  },
  heading: {
    fontSize: design.type.heading,
    fontFamily: Platform.OS === "ios"
      ? design.fonts.iosHeading
      : design.fonts.androidHeading,
    color: colors.ink,
  },
  input: {
    minHeight: 48,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: design.radius.card,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  button: {
    minHeight: 52,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.mauve,
    backgroundColor: colors.white,
    borderRadius: design.radius.control,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: colors.mauve, fontWeight: "600" },
  primary: { backgroundColor: colors.rose, borderColor: colors.rose },
  primaryText: { color: colors.charcoal },
  inputFocused: { borderColor: colors.rose, borderWidth: 2 },
  provider: { flexDirection: "row", justifyContent: "center", gap: 12 },
  providerIcon: {
    position: "absolute",
    left: 18,
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  providerText: {
    fontFamily: Platform.OS === "android" ? "Roboto" : "Arial",
    fontSize: 14,
  },
  google: { backgroundColor: "#FFFFFF", borderColor: "#747775" },
  apple: { backgroundColor: "#000000", borderColor: "#000000" },
  facebook: { backgroundColor: "#0866FF", borderColor: "#0866FF" },
  googleText: { color: "#1F1F1F", fontWeight: "500" },
  whiteText: { color: "#FFFFFF" },
  disabled: { opacity: .45 },
  selectedOption: {
    backgroundColor: colors.blush,
    borderRadius: design.radius.card,
  },
  option: { minHeight: 48, padding: 14 },
});
