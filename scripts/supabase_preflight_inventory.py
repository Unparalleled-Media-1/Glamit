"""Read-only selected-project metadata/count audit; never execute SQL or fetch table rows."""

import json
import os
import re
from datetime import UTC, datetime

import httpx

PROJECT = "bkkmsbxrxkqaveymcrgi"


def inventory():
    report = {
        "observed_at": datetime.now(UTC).isoformat(),
        "project": PROJECT,
        "scope": "PostgREST metadata, HEAD counts and storage bucket metadata only",
        "mutation_requests": 0,
        "sql_executed": False,
        "migration_permission": "UNVERIFIED: no migration DSN or management credential configured",
        "private_schema_functions_policies": "UNVERIFIED: SQL catalog access required",
        "backup": "NOT CREATED: migration/database access unavailable",
        "valuable_data": "UNKNOWN; absence of exposed rows is not proof of an empty project",
        "requests": [],
        "tables": [],
        "buckets": [],
    }
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if url != f"https://{PROJECT}.supabase.co" or not key or "\n" in key or "\r" in key:
        return report | {"state": "BLOCKED", "reason": "selected_project_and_service_key_required"}
    with httpx.Client(
        headers={"apikey": key, "Authorization": "Bearer " + key},
        follow_redirects=False,
        timeout=20,
        trust_env=True,
    ) as client:

        def request(method, path, **kwargs):
            try:
                # Only caller-owned constant/validated metadata paths; no user-controlled origins.
                with client.stream(method, url + path, **kwargs) as response:
                    report["requests"].append(
                        {"method": method, "path": path, "status": response.status_code}
                    )
                    if response.status_code != 200 and not (
                        method == "HEAD" and response.status_code == 206
                    ):
                        return None
                    if method == "HEAD":
                        match = re.fullmatch(
                            r"(?:\d+-\d+|\*)/(\d+)", response.headers.get("content-range", "")
                        )
                        return int(match[1]) if match else None
                    data = bytearray()
                    for part in response.iter_bytes():
                        data.extend(part)
                        if len(data) > 4 * 1024 * 1024:
                            return None
                    return json.loads(data)
            except (httpx.HTTPError, ValueError):
                report["requests"].append({"method": method, "path": path, "error": "read_failed"})
                return None

        schema = request("GET", "/rest/v1/", headers={"Accept": "application/openapi+json"})
        if isinstance(schema, dict):
            paths = schema.get("paths", {})
            names = sorted(p[1:] for p in paths if re.fullmatch(r"/[A-Za-z_][A-Za-z0-9_]{0,62}", p))
            report["exposed_table_count"] = len(names)
            report["exposed_rpc_names"] = sorted(p[5:] for p in paths if p.startswith("/rpc/"))
            report["counts_truncated"] = len(names) > 100
            definitions = schema.get("definitions", {})
            for name in names[:100]:
                count = request(
                    "HEAD",
                    "/rest/v1/" + name + "?select=*",
                    headers={"Prefer": "count=exact", "Range": "0-0"},
                )
                columns = definitions.get(name, {}).get("properties", {})
                report["tables"].append(
                    {"name": name, "row_count": count, "columns": sorted(columns)}
                )
                if count and count > 0:
                    report["valuable_data"] = (
                        "EXISTING ROWS DETECTED: approval required before migration"
                    )
        else:
            report["rest_inventory"] = "BLOCKED: metadata unavailable"
        buckets = request("GET", "/storage/v1/bucket")
        if isinstance(buckets, list):
            report["buckets"] = [
                {
                    k: b.get(k)
                    for k in ["id", "name", "public", "file_size_limit", "allowed_mime_types"]
                }
                for b in buckets
                if isinstance(b, dict)
            ]
        else:
            report["storage_inventory"] = "BLOCKED: metadata unavailable"
    report["state"] = "PARTIAL_READ_ONLY_INVENTORY"
    return report


if __name__ == "__main__":
    print(json.dumps(inventory(), indent=2))
