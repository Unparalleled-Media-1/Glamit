import pytest
from glam_api.config import Settings
from pydantic import ValidationError


@pytest.mark.parametrize(
    "changes",
    [
        {"database_url": "sqlite:///wrong.db"},
        {"oidc_issuer": "https://issuer.invalid"},
        {
            "oidc_issuer": "http://issuer.invalid",
            "oidc_audience": "glam",
            "oidc_jwks_url": "https://issuer.invalid/jwks",
        },
    ],
)
def test_invalid_database_and_partial_or_insecure_auth_rejected(changes, monkeypatch):
    for name in ["GLAM_OIDC_ISSUER", "GLAM_OIDC_AUDIENCE", "GLAM_OIDC_JWKS_URL"]:
        monkeypatch.delenv(name, raising=False)
    with pytest.raises(ValidationError):
        Settings(**{"database_url": "postgresql+psycopg://localhost/local_test", **changes})


def test_native_supabase_url_is_normalized_and_secret_is_not_represented(monkeypatch):
    for name in ["GLAM_OIDC_ISSUER", "GLAM_OIDC_AUDIENCE", "GLAM_OIDC_JWKS_URL"]:
        monkeypatch.delenv(name, raising=False)
    config = Settings(database_url="postgresql://app:fixture-password@db.example/postgres")
    assert config.database_url.startswith("postgresql+psycopg://")
    assert "sslmode=verify-full" in config.database_url
    assert "fixture-password" not in repr(config)
    with pytest.raises(ValidationError) as caught:
        Settings(database_url="fixture-password-invalid-url")
    assert "fixture-password" not in str(caught.value)
