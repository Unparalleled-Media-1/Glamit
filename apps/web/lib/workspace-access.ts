import type { CoreWorkspace } from "../../../packages/auth/core";
import { safeDestination } from "../../../packages/auth/core";
import { workspaces } from "../../../packages/product/platform";
import type { Role } from "../../../packages/product/platform";

export type ApprovedWorkspace = CoreWorkspace & { workspace: Role };
export function approvedWorkspaces(
  rows: CoreWorkspace[] | undefined,
): ApprovedWorkspace[] {
  return (Array.isArray(rows) ? rows : []).filter(
    (row): row is ApprovedWorkspace =>
      Boolean(
        row &&
          Object.hasOwn(workspaces, row.workspace) &&
          /^[a-f0-9-]{36}$/i.test(row.organization_id) &&
          typeof row.name === "string" &&
          row.name.length > 0 &&
          typeof row.can_write === "boolean",
      ),
  );
}
export function accountDestination(
  value: string | null | undefined,
  fallback = "/",
) {
  const path = safeDestination(value);
  if (
    path === "/login" ||
    path === "/register" ||
    /\/(login|register)$/.test(path)
  )
    return fallback;
  return path === "/" && value !== "/" ? fallback : path;
}

const staffKeys = [
  "executive",
  "users",
  "ai",
  "content",
  "merchants",
  "professionals",
  "advertising",
  "commerce",
  "subscriptions",
  "creators",
  "regions",
  "trust",
  "privacy",
  "analytics",
  "configuration",
];
const staffLabels = [
  "Executive Overview",
  "User Management",
  "AI Operations",
  "Beauty Content",
  "Merchant Management",
  "Professional Management",
  "Advertising",
  "Commerce",
  "Subscriptions",
  "Creators & Partners",
  "Regional Operations",
  "Trust & Safety",
  "Privacy",
  "Analytics",
  "System Configuration",
];
export function approvedStaffModules(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.some((key) => typeof key !== "string" || !staffKeys.includes(key))
  )
    return [];
  return [...new Set(value)].map((key) => staffLabels[staffKeys.indexOf(key)]);
}
