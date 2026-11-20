"use client";
import { useEffect, useState } from "react";

type Metric = { label: string; value: string };
type TableData = { title: string; columns: string[]; rows: string[][] };
export type ModuleData = {
  module: string;
  title: string;
  available: boolean;
  reason?: string | null;
  generated_at: string;
  read_only: boolean;
  metrics: Metric[];
  tables: TableData[];
};

export function parseModule(value: unknown): ModuleData {
  const v = value as ModuleData;
  const strings = (a: unknown) =>
    Array.isArray(a) && a.every((x) => typeof x === "string");
  if (
    !v ||
    typeof v.module !== "string" ||
    typeof v.title !== "string" ||
    typeof v.available !== "boolean" ||
    v.read_only !== true ||
    !Array.isArray(v.metrics) ||
    !Array.isArray(v.tables) ||
    !v.metrics.every(
      (m) => typeof m?.label === "string" && typeof m?.value === "string",
    ) ||
    !v.tables.every(
      (t) =>
        typeof t?.title === "string" &&
        strings(t.columns) &&
        Array.isArray(t.rows) &&
        t.rows.every(strings),
    )
  )
    throw Error("INVALID_MODULE_RESPONSE");
  return v;
}

export default function AdminModuleView({
  apiOrigin,
  token,
  moduleKey,
}: {
  apiOrigin: string;
  token: string;
  moduleKey: string;
}) {
  const [data, setData] = useState<ModuleData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError("");
    fetch(`${apiOrigin}/v1/admin/modules/${encodeURIComponent(moduleKey)}`, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: abort.signal,
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403)
          throw Error("DENIED");
        if (!response.ok) throw Error("FAILED");
        setData(parseModule(await response.json()));
      })
      .catch((e: Error) => {
        if (abort.signal.aborted) return;
        setError(
          e.message === "DENIED"
            ? "Access denied for this module. Your role may not include it, or your multi-factor verification has expired (it must be within the last 5 minutes). Sign in again to retry."
            : "This module could not be loaded. Nothing has been changed. Retry later.",
        );
      });
    return () => abort.abort();
  }, [apiOrigin, token, moduleKey]);
  if (error)
    return (
      <div role="alert" className="notice">
        {error}
      </div>
    );
  if (!data)
    return (
      <div role="status" className="notice">
        Loading verified data…
      </div>
    );
  if (!data.available)
    return (
      <section className="panel" aria-label={data.title + " status"}>
        <h2>Not connected</h2>
        <p>{data.reason}</p>
        <p className="fine">
          No figures are shown because no verified data source exists yet.
        </p>
      </section>
    );
  return (
    <div data-testid="admin-module">
      <p className="fine">
        Read-only view · generated{" "}
        {new Date(data.generated_at).toLocaleString()} · every view you open is
        recorded in the audit log. Private photos, results and contact details
        are never shown here.
      </p>
      {data.metrics.length > 0 && (
        <div className="metric-grid">
          {data.metrics.map((m) => (
            <section className="panel" key={m.label}>
              <h2>{m.label}</h2>
              <strong className="metric">{m.value}</strong>
            </section>
          ))}
        </div>
      )}
      {data.tables.map((t) => (
        <section className="panel" key={t.title}>
          <h2>{t.title}</h2>
          {t.rows.length === 0 ? (
            <p>No records.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    {t.columns.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
