"""Encryption boundary tests use ephemeral keys, never configured credentials."""

import base64
from uuid import uuid4

import pytest
from glam_api.creator_security import decrypt_token, encrypt_token


def test_envelopes_are_random_and_bound_to_creator_connection_and_provider(monkeypatch):
    monkeypatch.setenv("CREATOR_TOKEN_ENCRYPTION_KEY", base64.b64encode(bytes(range(32))).decode())
    creator, connection = uuid4(), uuid4()
    first = encrypt_token("fixture-only-token", creator, connection, "tiktok")
    second = encrypt_token("fixture-only-token", creator, connection, "tiktok")
    assert first != second and b"fixture-only-token" not in first
    assert decrypt_token(first, creator, connection, "tiktok") == "fixture-only-token"
    for c, a, p in [
        (uuid4(), connection, "tiktok"),
        (creator, uuid4(), "tiktok"),
        (creator, connection, "instagram"),
    ]:
        with pytest.raises(RuntimeError, match="CREATOR_CREDENTIAL_UNAVAILABLE"):
            decrypt_token(first, c, a, p)
    with pytest.raises(RuntimeError, match="CREATOR_CREDENTIAL_UNAVAILABLE"):
        decrypt_token(first[:-1] + bytes([first[-1] ^ 1]), creator, connection, "tiktok")


@pytest.mark.parametrize("value", ["", "bad", "AAAA"])
def test_missing_or_invalid_key_never_falls_back_to_plaintext(monkeypatch, value):
    monkeypatch.setenv("CREATOR_TOKEN_ENCRYPTION_KEY", value)
    with pytest.raises(RuntimeError, match="CREATOR_ENCRYPTION_NOT_CONFIGURED"):
        encrypt_token("fixture-only-token", uuid4(), uuid4(), "tiktok")
