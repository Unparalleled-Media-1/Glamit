/** Refresh secrets are protected by OS key storage; biometrics never enter Supabase. */
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Crypto from "expo-crypto";
import { createAuthClient } from "../../../packages/auth/core";
import type { SupportedStorage } from "../../../packages/auth/core";

const secureOptions = {
  requireAuthentication: true,
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  authenticationPrompt: "Unlock GLAM AI",
};
const refreshKey = "glam.auth.refresh.v1",
  enabledKey = "glam.auth.biometric.v1";
const memory = new Map<string, string>();
const storage: SupportedStorage = {
  async getItem(key) {
    if (!key.endsWith("-code-verifier")) return memory.get(key) || null;
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      if (value.until > Date.now() && typeof value.value === "string") {
        return value.value;
      }
    } catch { /* Expired/invalid flow is unusable. */ }
    await SecureStore.deleteItemAsync(key);
    return null;
  },
  async setItem(key, value) {
    if (!key.endsWith("-code-verifier")) {
      memory.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(
      key,
      JSON.stringify({ value, until: Date.now() + 600000 }),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  },
  async removeItem(key) {
    memory.delete(key);
    if (key.endsWith("-code-verifier")) await SecureStore.deleteItemAsync(key);
  },
};
function nativeCrypto() {
  // S256 PKCE must never fall back to Math.random or a plain challenge on React Native.
  const current = globalThis.crypto || {} as Crypto;
  if (!current.getRandomValues) {
    current.getRandomValues = Crypto
      .getRandomValues as Crypto["getRandomValues"];
  }
  if (!current.randomUUID) {
    current.randomUUID = Crypto.randomUUID as typeof current.randomUUID;
  }
  if (!current.subtle) {
    Object.defineProperty(current, "subtle", {
      value: {
        digest: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
          if (
            (typeof algorithm === "string" ? algorithm : algorithm.name) !==
              "SHA-256"
          ) throw Error("Unsupported digest");
          return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
        },
      },
    });
  }
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", { value: current });
  }
}
export function createNativeAuth(publicKey: string) {
  nativeCrypto();
  return createAuthClient(publicKey, storage);
}
export async function biometricSupported() {
  return (await SecureStore.isAvailableAsync()) &&
    SecureStore.canUseBiometricAuthentication() &&
    (await LocalAuthentication.hasHardwareAsync()) &&
    (await LocalAuthentication.isEnrolledAsync());
}
export const biometricEnabled = async () =>
  await SecureStore.getItemAsync(enabledKey) === "yes";
export async function rememberBiometricSession(refreshToken: string) {
  if (!(await biometricSupported())) {
    throw Error("Biometric unlock is not available on this device.");
  }
  try {
    await SecureStore.setItemAsync(refreshKey, refreshToken, secureOptions);
    const proof = await SecureStore.getItemAsync(refreshKey, secureOptions);
    if (proof !== refreshToken) {
      throw Error("Biometric enrollment could not be confirmed.");
    }
    await SecureStore.setItemAsync(enabledKey, "yes");
  } catch {
    await SecureStore.deleteItemAsync(refreshKey);
    await SecureStore.deleteItemAsync(enabledKey);
    throw Error(
      "Biometric enrollment was not confirmed. Use a fresh sign-in or try again.",
    );
  }
}
export async function rotateBiometricSession(refreshToken: string) {
  if (await biometricEnabled()) {
    await SecureStore.setItemAsync(refreshKey, refreshToken, secureOptions);
  }
}
export async function unlockBiometricSession() {
  return SecureStore.getItemAsync(refreshKey, secureOptions);
}
export async function forgetBiometricSession() {
  await SecureStore.deleteItemAsync(refreshKey);
  await SecureStore.deleteItemAsync(enabledKey);
}
export function clearNativeMemory() {
  memory.clear();
}
