/** Origin of the GLAM FastAPI service, supplied at build time. Empty (and the admin dashboard stays
 * unavailable) unless it is a plain https origin: no path, query, fragment or credentials. */
export function parseApiOrigin(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    const plain =
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.pathname === "" || url.pathname === "/");
    return plain ? url.origin : "";
  } catch {
    return "";
  }
}
export const apiOrigin = parseApiOrigin(
  process.env.NEXT_PUBLIC_GLAM_API_ORIGIN,
);
