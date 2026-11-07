/** Connection port for the selected identity/backend. Tokens are supplied in memory by Auth. */
import type { Role } from "./platform";
import type { components } from "../contracts/api";
type CatalogSchemas = components["schemas"];
export interface WorkspaceAccess {
  organization_id: string;
  name: string;
  workspace: Role;
  can_write: boolean;
}
export interface ServerRoutine {
  id: string;
  title: string;
  steps: { text: string; done: boolean }[];
  revision: number;
  updated_at: string;
}
export interface ServerDraft {
  id: string;
  title: string;
  notes: string;
  revision: number;
  updated_at: string;
}
export class ApiFailure extends Error {
  constructor(public readonly status: number) {
    super(
      status === 401
        ? "Sign in again to continue."
        : status === 403 || status === 404
          ? "This resource is not available in the active context."
          : status === 409
            ? "This record changed. Reload before editing."
            : "The service is unavailable. No completion is confirmed.",
    );
  }
}
export class GlamApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: () => Promise<string | null>,
  ) {
    const u = new URL(baseUrl);
    if (
      u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname)
      )
    )
      throw Error("Use HTTPS or a local development API.");
    if (u.username || u.password || u.search || u.hash)
      throw Error("Do not put credentials in an API URL.");
  }
  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      key?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const token = await this.token();
    if (!token) throw new ApiFailure(401);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    if (options.key) headers["Idempotency-Key"] = options.key;
    const response = await fetch(this.baseUrl.replace(/\/$/, "") + path, {
      method: options.method || "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: options.signal,
    });
    if (!response.ok) throw new ApiFailure(response.status);
    return response.status === 204
      ? (undefined as T)
      : (response.json() as Promise<T>);
  }
  staffContext(signal?: AbortSignal) {
    return this.request<CatalogSchemas["StaffContext"]>("/v1/admin/context", {
      signal,
    });
  }
  workspaces(signal?: AbortSignal) {
    return this.request<WorkspaceAccess[]>("/v1/me/workspaces", { signal });
  }
  routines(signal?: AbortSignal) {
    return this.request<ServerRoutine[]>("/v1/me/routines", { signal });
  }
  saveRoutine(
    body: Pick<ServerRoutine, "title" | "steps">,
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<ServerRoutine>("/v1/me/routines", {
      method: "POST",
      body,
      key,
      signal,
    });
  }
  updateRoutine(
    id: string,
    body: Pick<ServerRoutine, "title" | "steps">,
    expected_revision: number,
    signal?: AbortSignal,
  ) {
    return this.request<ServerRoutine>(
      `/v1/me/routines/${encodeURIComponent(id)}`,
      { method: "PUT", body: { ...body, expected_revision }, signal },
    );
  }
  deleteRoutine(id: string, signal?: AbortSignal) {
    return this.request<void>(`/v1/me/routines/${encodeURIComponent(id)}`, {
      method: "DELETE",
      signal,
    });
  }
  drafts(org: string, role: Role, signal?: AbortSignal) {
    return this.request<ServerDraft[]>(
      this.workspacePath(org, role) + "/drafts",
      { signal },
    );
  }
  saveDraft(
    org: string,
    role: Role,
    body: Pick<ServerDraft, "title" | "notes">,
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<ServerDraft>(
      this.workspacePath(org, role) + "/drafts",
      { method: "POST", body, key, signal },
    );
  }
  invite(
    org: string,
    role: Role,
    recipient_id: string,
    grant: string,
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<{ id: string; state: "pending" }>(
      this.workspacePath(org, role) + "/invitations",
      { method: "POST", body: { recipient_id, role: grant }, key, signal },
    );
  }
  invitations(signal?: AbortSignal) {
    return this.request<
      {
        id: string;
        organization_id: string;
        name: string;
        workspace: Role;
        role: string;
        expires_at: string;
      }[]
    >("/v1/me/workspace-invitations", { signal });
  }
  acceptInvitation(id: string, signal?: AbortSignal) {
    return this.request<{ id: string; state: "accepted" }>(
      `/v1/me/workspace-invitations/${encodeURIComponent(id)}/accept`,
      { method: "POST", signal },
    );
  }
  catalog(org: string, signal?: AbortSignal) {
    return this.request<CatalogSchemas["ListingRead"][]>(
      `/v1/organizations/${encodeURIComponent(org)}/catalog/listings`,
      { signal },
    );
  }
  createListing(
    org: string,
    body: CatalogSchemas["NewListing"],
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["ListingRead"]>(
      `/v1/organizations/${encodeURIComponent(org)}/catalog/listings`,
      { method: "POST", body, key, signal },
    );
  }
  reviewListing(
    org: string,
    id: string,
    body: CatalogSchemas["RevisionChoice"],
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["ListingRead"]>(
      this.catalogPath(org, id) + "/revisions",
      { method: "POST", body, key, signal },
    );
  }
  publishListing(
    org: string,
    id: string,
    revision: number,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["ListingRead"]>(
      this.catalogPath(org, id) + "/publish",
      { method: "POST", body: { revision }, signal },
    );
  }
  withdrawListing(org: string, id: string, signal?: AbortSignal) {
    return this.request<CatalogSchemas["ListingRead"]>(
      this.catalogPath(org, id) + "/withdraw",
      { method: "POST", signal },
    );
  }
  matches(body: CatalogSchemas["Requirement"], signal?: AbortSignal) {
    return this.request<CatalogSchemas["MatchResult"]>(
      "/v1/recommendations/matches",
      { method: "POST", body, signal },
    );
  }
  matchDetail(
    id: string,
    body: CatalogSchemas["Requirement"],
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["MatchResult"]>(
      `/v1/recommendations/listings/${encodeURIComponent(id)}`,
      { method: "POST", body, signal },
    );
  }
  saveRequirement(
    body: CatalogSchemas["Requirement"],
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["SavedRead"]>(
      "/v1/me/saved-requirements",
      { method: "POST", body, key, signal },
    );
  }
  savedRequirements(signal?: AbortSignal) {
    return this.request<CatalogSchemas["SavedRead"][]>(
      "/v1/me/saved-requirements",
      { signal },
    );
  }
  deleteRequirement(id: string, signal?: AbortSignal) {
    return this.request<void>(
      `/v1/me/saved-requirements/${encodeURIComponent(id)}`,
      { method: "DELETE", signal },
    );
  }
  prepareListing(
    org: string,
    id: string,
    body: CatalogSchemas["EnhancementRequest"],
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["JobRead"]>(
      this.catalogPath(org, id) + "/enhancements",
      { method: "POST", body, key, signal },
    );
  }
  listingPreparation(
    org: string,
    id: string,
    job: string,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["JobRead"]>(
      this.catalogPath(org, id) + "/enhancements/" + encodeURIComponent(job),
      { signal },
    );
  }
  createListingsBulk(
    org: string,
    body: CatalogSchemas["BulkListings"],
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["ListingRead"][]>(
      `/v1/organizations/${encodeURIComponent(org)}/catalog/listings/bulk`,
      { method: "POST", body, key, signal },
    );
  }
  publishListingsBulk(
    org: string,
    body: CatalogSchemas["BulkPublication"],
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["ListingRead"][]>(
      `/v1/organizations/${encodeURIComponent(org)}/catalog/publish-bulk`,
      { method: "POST", body, signal },
    );
  }
  catalogReviewQueue(signal?: AbortSignal) {
    return this.request<CatalogSchemas["ListingRead"][]>(
      "/v1/admin/catalog/review-queue",
      { signal },
    );
  }
  approveCatalogRevision(
    id: string,
    revision: number,
    body: CatalogSchemas["ReviewChoice"],
    key: string,
    signal?: AbortSignal,
  ) {
    return this.request<CatalogSchemas["ReviewChoice"]>(
      `/v1/admin/catalog/${encodeURIComponent(id)}/revisions/${revision}/review`,
      { method: "POST", body, key, signal },
    );
  }
  private catalogPath(org: string, id: string) {
    return `/v1/organizations/${encodeURIComponent(org)}/catalog/listings/${encodeURIComponent(id)}`;
  }
  private workspacePath(org: string, role: Role) {
    return `/v1/organizations/${encodeURIComponent(org)}/workspaces/${encodeURIComponent(role)}`;
  }
}
