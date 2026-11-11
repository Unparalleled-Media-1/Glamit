import { File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { photoIssue } from "../../../packages/product/platform";

export type CaptureAsset = { uri: string; width: number; height: number };
export type CapturePhoto = CaptureAsset & { bytes: number };

/** Device-only leases. No provider URI or gallery original becomes a deletable lease. */
export class CaptureFiles {
  private owned = new Map<string, File>();
  photo: CapturePhoto | null = null;

  get cleanupPending() { return this.owned.size > 0 && this.photo === null; }

  private cameraTemporary(uri: string) {
    const root = new URL(Paths.cache.uri.endsWith("/") ? Paths.cache.uri : Paths.cache.uri + "/");
    const target = new URL(uri);
    if (target.protocol !== "file:" || target.host !== root.host || target.search || target.hash ||
        !decodeURIComponent(target.pathname).startsWith(decodeURIComponent(root.pathname)) ||
        decodeURIComponent(target.pathname).split("/").includes("..")) {
      throw Error("Camera did not return an app-private temporary file.");
    }
    this.owned.set(uri, new File(uri));
  }

  private delete(uri: string) {
    const file = this.owned.get(uri);
    if (!file) throw Error("Private capture lease required");
    if (file.exists) file.delete();
    this.owned.delete(uri);
  }

  clear() {
    // Remove references before attempting disk cleanup, even if erasure fails.
    this.photo = null;
    for (const uri of [...this.owned.keys()]) {
      try { this.delete(uri); } catch { /* Retain the lease for an explicit cleanup retry. */ }
    }
    return this.owned.size === 0;
  }

  adopt(asset: CaptureAsset, fromCamera = false): CapturePhoto {
    if (this.cleanupPending) throw Error("Retry clearing the private photo before choosing another.");
    if (fromCamera) this.cameraTemporary(asset.uri);
    try {
      const source = new File(asset.uri);
      const bytes = source.size;
      const issue = photoIssue({ width: asset.width, height: asset.height, bytes });
      if (![asset.width, asset.height, bytes].every(n => Number.isFinite(n) && n > 0) || issue) {
        throw Error(issue || "This photo could not be opened.");
      }
      // The suffix does not certify the format. Capture does no upload or MIME claims.
      const copy = new File(Paths.cache, `glam-capture-${randomUUID()}.photo`);
      this.owned.set(copy.uri, copy); // Track partial copies before the operation can fail.
      source.copy(copy);
      this.photo = null;
      for (const uri of [...this.owned.keys()]) if (uri !== copy.uri) this.delete(uri);
      return this.photo = { uri: copy.uri, width: asset.width, height: asset.height, bytes };
    } catch (error) {
      this.clear();
      throw error;
    }
  }

  discardCameraResult(asset: CaptureAsset) {
    // Only camera results proven to be under the app cache can be reclaimed.
    this.cameraTemporary(asset.uri);
    this.delete(asset.uri);
  }
}
