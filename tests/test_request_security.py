import json
import logging
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from glam_api import auth
from glam_api.auth import get_principal
from glam_api.config import Settings
from glam_api.main import app


def test_request_logs_do_not_include_private_values_or_queries(client, caplog):
    secret = "private-look-description-do-not-log"
    request_id = str(uuid4())
    with caplog.at_level(logging.INFO, logger="glam.requests"):
        response = client.post(
            f"/v1/looks?private={secret}",
            json={"title": secret},
            headers={"X-Request-ID": request_id},
        )
    assert response.status_code == 422
    assert response.headers["X-Request-ID"] == request_id
    assert response.headers["Cache-Control"] == "no-store"
    assert secret not in caplog.text
    assert secret not in response.text
    records = [json.loads(r.message) for r in caplog.records if r.name == "glam.requests"]
    assert records[-1]["route"] == "/v1/looks"


def test_api_verifies_signature_and_audience(client, monkeypatch):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    app.dependency_overrides.pop(get_principal)
    settings = Settings(
        database_url="postgresql+psycopg://localhost/unused_test",
        oidc_issuer="https://issuer.invalid",
        oidc_audience="glam",
        oidc_jwks_url="https://issuer.invalid/jwks",
    )
    monkeypatch.setattr(auth, "get_settings", lambda: settings)
    resolver = SimpleNamespace(
        get_signing_key_from_jwt=lambda _: SimpleNamespace(key=private.public_key())
    )
    monkeypatch.setattr(auth, "jwks_client", lambda _: resolver)
    assert client.get("/v1/me").status_code == 401
    now = datetime.now(UTC)
    claims = {
        "iss": settings.oidc_issuer,
        "aud": "glam",
        "sub": "real-signed-test-subject",
        "iat": now,
        "exp": now + timedelta(minutes=1),
    }
    valid = jwt.encode(claims, private, algorithm="RS256")
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {valid}"}).status_code == 200
    invalid = jwt.encode({**claims, "aud": "attacker-app"}, private, algorithm="RS256")
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {invalid}"}).status_code == 401


def test_unconfigured_identity_fails_closed(client, monkeypatch):
    app.dependency_overrides.pop(get_principal)
    monkeypatch.setattr(
        auth,
        "get_settings",
        lambda: Settings(
            database_url="postgresql+psycopg://localhost/unused_test",
            oidc_issuer=None,
            oidc_audience=None,
            oidc_jwks_url=None,
        ),
    )
    assert client.get("/v1/me").status_code == 503
