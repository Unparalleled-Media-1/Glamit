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
def test_invalid_database_and_partial_or_insecure_auth_rejected(changes):
    with pytest.raises(ValidationError):
        Settings(**{"database_url": "postgresql+psycopg://localhost/local_test", **changes})
