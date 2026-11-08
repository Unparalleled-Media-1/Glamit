import * as Crypto from "expo-crypto";
import { createPrivateMediaClient } from "../../packages/product/private-media";

export function nativePrivateMedia(apiOrigin: string, getToken: () => string | null) {
  return createPrivateMediaClient({ apiOrigin, getToken, sha256: async (data) => {
    const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
    return Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, "0")).join("");
  } });
}
