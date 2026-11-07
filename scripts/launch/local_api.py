"""Run the real FastAPI process against an existing isolated local test DB; no auth bypass."""

import json
import os
import socket
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx
from sqlalchemy.engine import make_url


def main():
    database = os.environ.get("GLAM_TEST_DATABASE_URL", "")
    target = make_url(database)
    if target.host not in {"127.0.0.1", "localhost"} or not (target.database or "").endswith(
        "_test"
    ):
        raise RuntimeError("isolated_local_test_database_required")
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    origin = "http://127.0.0.1:" + str(port)
    log = Path("/workspace/artifacts/glam-launch/local-api.log")
    report = {
        "observed_at": datetime.now(UTC).isoformat(),
        "scope": "Real local FastAPI process; isolated test PostgreSQL; no authentication bypass",
        "requests": [],
    }
    with log.open("w") as output:
        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "glam_api.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--no-access-log",
            ],
            env={**os.environ, "GLAM_DATABASE_URL": database},
            stdout=output,
            stderr=output,
        )
        try:
            with httpx.Client(timeout=15) as client:
                for _ in range(100):
                    try:
                        if client.get(origin + "/health/live").is_success:
                            break
                    except httpx.HTTPError:
                        pass
                    time.sleep(0.1)
                openapi = client.get(origin + "/openapi.json").json()
                for route, methods in openapi["paths"].items():
                    path = route
                    for parameter in [v.split("}")[0] for v in route.split("{")[1:]]:
                        path = path.replace(
                            "{" + parameter + "}", "00000000-0000-0000-0000-000000000000"
                        )
                    for method in methods:
                        if method not in {"get", "post", "put", "patch", "delete"}:
                            continue
                        started = time.monotonic()
                        response = client.request(
                            method, origin + path, **({"json": {}} if method != "get" else {})
                        )
                        public = path in {"/health/live", "/health/ready", "/v1/policies"}
                        passed = (
                            response.status_code == 200
                            if public
                            else response.status_code in {401, 403}
                        )
                        report["requests"].append(
                            {
                                "method": method.upper(),
                                "route": route,
                                "status": response.status_code,
                                "passed": passed,
                                "roundtrip_ms": round((time.monotonic() - started) * 1000),
                                "expected": "public health/policy"
                                if public
                                else "anonymous access denied",
                            }
                        )
                report["status"] = (
                    "PASSED" if all(x["passed"] for x in report["requests"]) else "FAILED"
                )
        finally:
            process.terminate()
            process.wait(timeout=15)
    Path("docs/launch/evidence/local-api.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"status": report.get("status"), "requests": len(report["requests"])}))
    if report.get("status") != "PASSED":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
