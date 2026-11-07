"""Official Supabase Management API multipart deployment; no credentials in source or output."""

import hashlib
import json
import os
from pathlib import Path

import httpx
from deploy_application_foundation import PROJECT


def deploy():
    source = Path("supabase/functions/glam-api")
    paths = sorted(source.glob("*.ts"))
    files = [
        (
            "metadata",
            (
                None,
                json.dumps(
                    {"entrypoint_path": "index.ts", "verify_jwt": False, "name": "glam-api"}
                ),
                "application/json",
            ),
        )
    ]
    files.extend(("file", (p.name, p.read_bytes(), "application/typescript")) for p in paths)
    with httpx.Client(
        timeout=120,
        follow_redirects=False,
        headers={"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"]},
    ) as c:
        r = c.post(
            f"https://api.supabase.com/v1/projects/{PROJECT}/functions/deploy",
            params={"slug": "glam-api"},
            files=files,
        )
        if not r.is_success:
            print(json.dumps({"status": "DEPLOYMENT_FAILED", "http_status": r.status_code}))
            raise SystemExit(2)
        value = r.json()
    report = {
        "project_ref": PROJECT,
        "function": value,
        "source_sha256": {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
        "authentication": (
            "Handler verifies ES256/RS256 signature, issuer, audience, role, expiry "
            "and active Auth user; "
            "legacy gateway verification disabled for ES256 compatibility."
        ),
    }
    Path("docs/database/evidence/hosted-api/edge-deployment.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "status": value.get("status"),
                "version": value.get("version"),
                "slug": value.get("slug"),
            }
        )
    )


if __name__ == "__main__":
    deploy()
