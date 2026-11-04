from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from glam_api.auth import verify_token


@pytest.fixture(scope="module")
def key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def claims(**changes):
    now = datetime.now(UTC)
    return {
        "iss": "https://issuer.invalid",
        "sub": "customer",
        "aud": "glam",
        "iat": now,
        "exp": now + timedelta(minutes=5),
        **changes,
    }


def test_valid_rsa_token(key):
    token = jwt.encode(claims(), key, algorithm="RS256")
    assert (
        verify_token(token, key.public_key(), "https://issuer.invalid", "glam").subject
        == "customer"
    )


@pytest.mark.parametrize(
    "override",
    [
        {"aud": "other-app"},
        {"iss": "https://attacker.invalid"},
        {"sub": ""},
        {"exp": datetime.now(UTC) - timedelta(minutes=1)},
    ],
)
def test_invalid_claims_rejected(key, override):
    token = jwt.encode(claims(**override), key, algorithm="RS256")
    with pytest.raises(jwt.PyJWTError):
        verify_token(token, key.public_key(), "https://issuer.invalid", "glam")


def test_wrong_signature_rejected(key):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = jwt.encode(claims(), other, algorithm="RS256")
    with pytest.raises(jwt.InvalidSignatureError):
        verify_token(token, key.public_key(), "https://issuer.invalid", "glam")


def test_hmac_algorithm_confusion_rejected(key):
    token = jwt.encode(claims(), "test-only-secret-32-bytes-minimum-length", algorithm="HS256")
    with pytest.raises(jwt.InvalidAlgorithmError):
        verify_token(token, key.public_key(), "https://issuer.invalid", "glam")


def test_supabase_style_es256_token_and_project_audience():
    private = ec.generate_private_key(ec.SECP256R1())
    issuer = "https://example-project.supabase.co/auth/v1"
    token = jwt.encode(claims(iss=issuer, aud="authenticated"), private, algorithm="ES256")
    assert verify_token(token, private.public_key(), issuer, "authenticated").subject == "customer"
    with pytest.raises(jwt.InvalidIssuerError):
        verify_token(
            token, private.public_key(), "https://other.supabase.co/auth/v1", "authenticated"
        )


def test_google_id_token_is_not_a_supabase_access_token(key):
    token = jwt.encode(claims(iss="https://accounts.google.com"), key, algorithm="RS256")
    with pytest.raises(jwt.InvalidIssuerError):
        verify_token(token, key.public_key(), "https://example-project.supabase.co/auth/v1", "glam")
