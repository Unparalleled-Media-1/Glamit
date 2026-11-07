"""Local Docker smoke checks only. Never load production credentials or redeploy services."""

import json
import subprocess
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4


def docker(*args):
    return subprocess.check_output(
        ["docker", "--host=unix:///var/run/docker.sock", *args], text=True
    ).strip()


def request(origin, path, method="GET", headers=None):
    try:
        with urlopen(Request(origin + path, method=method, headers=headers or {}), timeout=10) as r:
            return r.status, dict(r.headers), r.read().decode()
    except HTTPError as r:
        return r.code, dict(r.headers), r.read().decode()


def smoke(component="all"):
    if component not in {"all", "web", "api"}:
        raise ValueError("Unknown component")
    result = {"local_only": True, "production_modified": False, "checks": []}
    containers = []
    try:
        selected = component
        for component, port, env in [
            ("web", 3000, {}),
            (
                "api",
                8123,
                {
                    "PORT": "8123",
                    "GLAM_DATABASE_URL": "postgresql+psycopg://fixture:fixture@127.0.0.1:5432/unreachable_test",
                    "GLAM_DEPLOYMENT_ENV": "development",
                    "GLAM_ALLOWED_ORIGINS": "https://www.glam.beauty",
                },
            ),
        ]:
            if selected != "all" and component != selected:
                continue
            args = [
                "run",
                "-d",
                "--rm",
                "--name",
                "glam-smoke-" + uuid4().hex[:10],
                "-p",
                f"127.0.0.1::{port}",
            ]
            for key, value in env.items():
                args.extend(["-e", key + "=" + value])
            container = docker(*args, f"glam-beauty-{component}:deployment-test")
            containers.append(container)
            origin = "http://" + docker("port", container, f"{port}/tcp").splitlines()[0]
            path = "/api/health/live" if component == "web" else "/health/live"
            deadline = time.monotonic() + 45
            while True:
                try:
                    code, _, _ = request(origin, path)
                    if code == 200:
                        break
                except (URLError, ConnectionError):
                    pass
                if time.monotonic() > deadline:
                    raise RuntimeError("LOCAL_" + component.upper() + "_STARTUP_FAILED")
                time.sleep(0.3)
            result["checks"].append(component + ": honors PORT and passes liveness")
            if component == "web":
                code, _, body = request(origin, "/api/health/ready")
                assert code == 200 and json.loads(body)["integrations_verified"] is False
                code, _, body = request(origin, "/login")
                assert code == 200 and "GLAM Beauty" in body
                result["checks"].append(
                    "web: ready for public-key fixture configuration; branded login SSR passes; "
                    "provider connectivity not asserted"
                )
            else:
                assert request(origin, "/health/ready")[0] == 503
                assert request(origin, "/v1/me")[0] == 503
                code, headers, _ = request(
                    origin,
                    "/v1/me",
                    "OPTIONS",
                    {
                        "Origin": "https://www.glam.beauty",
                        "Access-Control-Request-Method": "GET",
                        "Access-Control-Request-Headers": "Authorization",
                    },
                )
                assert (
                    code == 200
                    and headers["access-control-allow-origin"] == "https://www.glam.beauty"
                )
                assert (
                    request(
                        origin,
                        "/v1/me",
                        "OPTIONS",
                        {"Origin": "https://evil.invalid", "Access-Control-Request-Method": "GET"},
                    )[0]
                    == 400
                )
                result["checks"].append(
                    "api: database/identity unavailable fail closed; "
                    "explicit new-origin CORS preflight passes; outsider denied"
                )
        Path("docs/deployment/independent/evidence/docker-smoke.json").write_text(
            json.dumps(result, indent=2) + "\n"
        )
        print(json.dumps(result, indent=2))
    finally:
        for container in containers:
            subprocess.run(
                ["docker", "--host=unix:///var/run/docker.sock", "rm", "-f", container],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--component", choices=["all", "web", "api"], default="all")
    smoke(parser.parse_args().component)
