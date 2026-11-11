/** Only selected by the CI-generated Metro configuration; real Expo Crypto and fetch. */
import * as Crypto from "expo-crypto";
import { fetch as expoFetch } from "expo/fetch";
import { createPrivateMediaClient } from "../../packages/product/private-media";
import { isolatedFetch } from "./transport";
export function nativePrivateMedia(apiOrigin: string, getToken: () => string | null, getSubject?: () => string | undefined) {
  if (apiOrigin !== "https://native-fixture.invalid") throw Error("Not the isolated native fixture origin");
  return createPrivateMediaClient({ apiOrigin, getToken, getSubject, fetch: isolatedFetch(expoFetch as typeof globalThis.fetch),
    sha256: async data => {
      const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
      return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    } });
}
