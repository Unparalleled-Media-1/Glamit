/** Creator publishing permissions are independent of consumer sign-in providers. */
export const socialProviders = ["tiktok", "instagram", "youtube", "pinterest", "facebook"] as const;
export type CreatorProvider = typeof socialProviders[number];
export type CreatorProfile = { id: string; handle: string; display_name: string; bio: string; revision: number; status: string };
export type CreatorConnection = { id: string; provider: CreatorProvider; profile_url: string; status: string };
export type CreatorMedia = { id: string; provider: CreatorProvider; title: string; source_url: string; publication_status: string };
export type CreatorCollection = { id: string; title: string; status: string; sponsored: boolean; disclosure: string };
export type CreatorState = { profile: CreatorProfile | null; connections: CreatorConnection[]; media: CreatorMedia[]; collections: CreatorCollection[]; oauth_available: boolean; posting_available: boolean; payouts_available: boolean };
export const creatorEmpty: CreatorState = { profile: null, connections: [], media: [], collections: [], oauth_available: false, posting_available: false, payouts_available: false };
export async function creatorRequest<T>(publicKey: string, token: string, method: string, path = "", body?: unknown): Promise<T> {
  if (!publicKey || !token) throw Error("Sign in to your GLAM Beauty account first.");
  const response = await fetch("https://bkkmsbxrxkqaveymcrgi.supabase.co/functions/v1/glam-api/v1/me/creator" + path, {
    method, headers: { apikey: publicKey, Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(response.status === 401 ? "Your session ended. Sign in again." : response.status === 403 ? "An explicitly verified adult account is required for Creator Studio changes." : response.status === 409 ? "This action needs updated records or publication approval. Reload before retrying." : response.status === 422 ? "Check your fields, public social URL and content rights." : "Creator Studio is unavailable. No save is confirmed.");
  return response.status === 204 ? undefined as T : response.json();
}
