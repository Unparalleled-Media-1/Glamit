"""Whole native component/transport/API persistence flow; no installed-device claim."""

import json
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from glam_api.integrations.runtime import Readiness, State
from sqlalchemy import text
from test_analysis_jobs import analysis as analysis
from test_analysis_jobs import run
from test_analysis_passport import passport as passport
from test_private_media import media as media


@pytest.mark.parametrize("platform", ["ios", "android"])
def test_native_component_private_upload_to_reopened_passport(
    client, db, passport, monkeypatch, tmp_path, platform
):
    p = passport
    import glam_api.analysis_passport as implementation

    monkeypatch.setattr(implementation, "configured_storage", lambda: p.media.store)
    # Authenticated model probe is an explicit fixture; never production CONNECTED evidence.
    p.provider.model_health = lambda: Readiness("openai", True, State.CONNECTED)
    # Start without either grant; the native controls must persist both explicit choices.
    from uuid import uuid4

    for policy in [p.policy, p.media.policy]:
        assert (
            client.post(
                f"/v1/policies/{policy}/consent",
                json={"action": "withdrawn"},
                headers={"Idempotency-Key": str(uuid4())},
            ).status_code
            == 201
        )
    fixture = tmp_path / "synthetic-test-photo.jpg"
    fixture.write_bytes(p.media.data)

    class Bridge(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            self.handle_request()

        def do_POST(self):
            self.handle_request()

        def do_PUT(self):
            self.handle_request()

        def do_DELETE(self):
            self.handle_request()

        def handle_request(self):
            assert self.headers.get("Authorization") == "Bearer isolated-test-only-session"
            size = int(self.headers.get("Content-Length", "0"))
            assert 0 <= size <= 10485760
            response = client.request(
                self.command,
                self.path,
                content=self.rfile.read(size),
                headers={
                    k: v
                    for k, v in self.headers.items()
                    if k.lower() in ["content-type", "idempotency-key", "authorization"]
                },
            )
            if self.command == "POST" and (
                self.path == "/v1/analysis/jobs" or self.path.endswith("/consent")
            ):
                for _ in range(10):
                    if not run(db, p):
                        break
            self.send_response(response.status_code)
            self.send_header(
                "Content-Type", response.headers.get("content-type", "application/json")
            )
            self.send_header("Content-Length", str(len(response.content)))
            self.end_headers()
            self.wfile.write(response.content)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Bridge)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        result = subprocess.run(
            [
                "node",
                "tests/mobile/analysis-passport-workflow.cjs",
                platform,
                str(server.server_address[1]),
                str(p.subject),
                str(fixture),
            ],
            capture_output=True,
            text=True,
            timeout=75,
        )
        assert result.returncode == 0, result.stdout + "\n" + result.stderr
        evidence = json.loads(result.stdout.strip().splitlines()[-1])
        assert evidence["uploaded"] and evidence["savedAndReopened"] and evidence["withdrawn"]
        assert not evidence["installedDeviceVerified"]
        with db.connect() as c:
            assert c.scalar(text("SELECT count(*) FROM style_passport_analysis")) == 0
            assert (
                c.scalar(
                    text("SELECT count(*) FROM analysis_correction WHERE corrections IS NOT NULL")
                )
                == 0
            )
            assert (
                c.scalar(
                    text("SELECT count(*) FROM analysis_correction WHERE redacted_at IS NOT NULL")
                )
                == 1
            )
            assert (
                c.scalar(
                    text("SELECT revision FROM style_passports WHERE profile_id=:u"),
                    {"u": p.subject},
                )
                == 3
            )
        print(result.stdout.strip())
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
