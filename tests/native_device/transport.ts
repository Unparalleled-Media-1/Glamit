/** CI-only fixture transport. The production entrypoint never imports this module. */
const fixtureLogical = ["https://native-fixture.invalid", "https://bkkmsbxrxkqaveymcrgi.supabase.co"];
export function isolatedFetch(transport: typeof globalThis.fetch): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input !== "string") throw Error("Fixture transport accepts explicit URL strings only");
    const url = new URL(input);
    if (!fixtureLogical.includes(url.origin) || url.username || url.password || url.hash)
      throw Error("Outbound network is disabled in the isolated native fixture");
    const response = await transport("http://127.0.0.1:8765" + url.pathname + url.search, { ...init, redirect: "error" });
    // Preserve logical-origin validation while physical traffic stays on loopback.
    // This is explicitly not a production TLS qualification.
    return { ok: response.ok, status: response.status, statusText: response.statusText,
      headers: response.headers, redirected: response.redirected, url: input, body: response.body,
      text: () => response.text(), json: () => response.json(), arrayBuffer: () => response.arrayBuffer(),
    } as Response;
  }) as typeof globalThis.fetch;
}
globalThis.fetch = isolatedFetch(globalThis.fetch.bind(globalThis));
