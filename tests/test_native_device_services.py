"""Fixture-service acceptance, not native installed-app acceptance."""

import hashlib
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from native_device.server import (
    CORRECTION,
    OTP,
    PHONE,
    FixtureStorage,
    device_environment,
    guard_database,
)
from sqlalchemy import create_engine, text
from test_private_media import photo


def login(client):
    assert client.post("/auth/v1/otp", json={"phone": PHONE}).status_code == 200
    result = client.post("/auth/v1/verify", json={"phone": PHONE, "token": OTP, "type": "sms"})
    assert result.status_code == 200, result.text
    return result.json()


def consent(client, policy, action="granted"):
    result = client.post(
        f"/v1/policies/{policy}/consent",
        json={"action": action},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert result.status_code == 201, result.text


def test_isolated_signed_auth_private_photo_correction_passport_and_physical_cleanup(db, tmp_path):
    from glam_api.analysis_jobs import process_one
    from glam_api.media_cleanup import purge_one

    with device_environment(db, tmp_path) as fixture, TestClient(fixture.app) as client:
        assert client.get("/v1/me/analysis-passport").status_code == 401
        assert client.post("/v1/checkout").status_code == 404
        session = login(client)
        client.headers["Authorization"] = "Bearer " + session["access_token"]
        assert client.get("/auth/v1/user").json()["id"] == str(fixture.subject)
        assert client.get("/v1/analysis/status").json()["state"] == "CONNECTED"
        for policy in [fixture.policy_storage, fixture.policy_analysis]:
            consent(client, policy)
        data = photo()
        intent = client.post(
            "/v1/media",
            json={
                "content_type": "image/jpeg",
                "size_bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "policy_id": str(fixture.policy_storage),
            },
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert intent.status_code == 201, intent.text
        media = intent.json()["id"]
        uploaded = client.put(
            f"/v1/media/{media}/content", content=data, headers={"Content-Type": "image/jpeg"}
        )
        assert uploaded.status_code == 200, uploaded.text
        assert list((tmp_path / "objects").rglob("*.png"))
        submitted = client.post(
            "/v1/analysis/jobs",
            json={
                "media_id": media,
                "policy_id": str(fixture.policy_analysis),
                "consent": True,
                "goals": ["Understand my features"],
            },
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert submitted.status_code == 202, submitted.text
        job = submitted.json()["id"]
        assert process_one(db, fixture.provider, fixture.storage)
        assert client.get(f"/v1/analysis/jobs/{job}").json()["state"] == "completed"
        corrected = client.post(
            f"/v1/analysis/jobs/{job}/corrections",
            json={"expected_revision": 0, "corrections": {"face-shape": CORRECTION}},
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert corrected.status_code == 200, corrected.text
        assert client.get("/v1/me/analysis-passport").json()["revision"] == 1
        saved = client.put(
            "/v1/me/analysis-passport",
            json={
                "job_id": job,
                "expected_passport_revision": 1,
                "expected_correction_revision": 1,
            },
        )
        assert saved.status_code == 200, saved.text
        assert client.get("/__fixture/assert-passport").json()["passed"] is True
        refreshed = client.post(
            "/auth/v1/token?grant_type=refresh_token",
            json={"refresh_token": session["refresh_token"]},
        )
        assert refreshed.status_code == 200, refreshed.text
        assert (
            client.post(
                "/auth/v1/token?grant_type=refresh_token",
                json={"refresh_token": session["refresh_token"]},
            ).status_code
            == 401
        )
        client.headers["Authorization"] = "Bearer " + refreshed.json()["access_token"]
        assert (
            client.get("/v1/me/analysis-passport").json()["analysis"]["corrections"]["face-shape"]
            == CORRECTION
        )
        consent(client, fixture.policy_analysis, "withdrawn")
        assert process_one(db, fixture.provider, fixture.storage)
        consent(client, fixture.policy_storage, "withdrawn")
        assert purge_one(db, fixture.storage)
        assert not list((tmp_path / "objects").rglob("*.png"))
        with db.connect() as c:
            assert c.scalar(text("SELECT count(*) FROM style_passport_analysis")) == 0
            assert c.scalar(text("SELECT corrections FROM analysis_correction")) is None
        client.post("/auth/v1/logout")
        assert client.get("/auth/v1/user").status_code == 401
    log = (tmp_path / "events.jsonl").read_text()
    assert session["access_token"] not in log and session["refresh_token"] not in log
    assert PHONE not in log and CORRECTION not in log


def test_fixture_auth_rejects_unissued_or_incorrect_challenges_and_tampered_JWT(db, tmp_path):
    with device_environment(db, tmp_path) as fixture, TestClient(fixture.app) as client:
        assert (
            client.post(
                "/auth/v1/verify", json={"phone": PHONE, "token": OTP, "type": "sms"}
            ).status_code
            == 400
        )
        assert client.post("/auth/v1/otp", json={"phone": "+27829999999"}).status_code == 400
        token = login(client)["access_token"]
        parts = token.split(".")
        client.headers["Authorization"] = "Bearer " + parts[0] + ".e30." + parts[2]
        assert client.get("/v1/me/analysis-passport").status_code == 401


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://localhost/postgres",
        "postgresql+psycopg://db.bkkmsbxrxkqaveymcrgi.supabase.co/example_test",
    ],
)
def test_fixture_refuses_production_or_remote_database_before_connecting(url):
    with pytest.raises(RuntimeError, match="disposable local"):
        guard_database(create_engine(url))


def test_fixture_storage_rejects_path_escape(tmp_path):
    storage = FixtureStorage(tmp_path / "objects")
    with pytest.raises(RuntimeError):
        storage.put("../outside.png", b"fixture")
    assert not (tmp_path / "outside.png").exists()


def test_fixture_reauthentication_creates_a_fresh_session_after_logout(db, tmp_path):
    with device_environment(db, tmp_path) as fixture, TestClient(fixture.app) as client:
        original = login(client)
        client.headers["Authorization"] = "Bearer " + original["access_token"]
        assert client.get("/auth/v1/user").status_code == 200
        assert client.post("/auth/v1/logout").status_code == 200
        assert client.get("/auth/v1/user").status_code == 401
        replacement = login(client)
        client.headers["Authorization"] = "Bearer " + replacement["access_token"]
        assert client.get("/auth/v1/user").status_code == 200
        assert replacement["access_token"] != original["access_token"]


def test_fixture_expired_session_rejects_access_and_refresh_but_allows_fresh_login(db, tmp_path):
    with device_environment(db, tmp_path) as fixture, TestClient(fixture.app) as client:
        original = login(client)
        # Test-only inspection of this fixture's token, never an authentication decision.
        sid = jwt.decode(original["access_token"], options={"verify_signature": False})[
            "session_id"
        ]
        with db.begin() as connection:
            connection.execute(
                text("UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id=:id"),
                {"id": sid},
            )
        client.headers["Authorization"] = "Bearer " + original["access_token"]
        assert client.get("/auth/v1/user").status_code == 401
        assert client.get("/v1/me/analysis-passport").status_code == 401
        assert (
            client.post(
                "/auth/v1/token?grant_type=refresh_token",
                json={"refresh_token": original["refresh_token"]},
            ).status_code
            == 401
        )
        replacement = login(client)
        client.headers["Authorization"] = "Bearer " + replacement["access_token"]
        assert client.get("/auth/v1/user").status_code == 200
