/** Public release provenance only; never return arbitrary process settings. */
export function deploymentRevision(): string | null {
  const value = process.env.RAILWAY_GIT_COMMIT_SHA || "";
  return /^[a-f0-9]{40}$/i.test(value) ? value : null;
}
