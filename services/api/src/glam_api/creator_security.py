"""Server-only token envelopes. No OAuth provider is activated by this module."""

import base64
import os
from uuid import UUID

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PROVIDERS = frozenset({"tiktok", "instagram", "youtube", "pinterest", "facebook"})


def _cipher() -> AESGCM:
    try:
        raw = os.environ.get("CREATOR_TOKEN_ENCRYPTION_KEY", "")
        key = base64.b64decode(raw, validate=True)
        if len(key) != 32:
            raise ValueError
        return AESGCM(key)
    except (ValueError, TypeError):
        raise RuntimeError("CREATOR_ENCRYPTION_NOT_CONFIGURED") from None


def _binding(creator: UUID, connection: UUID, provider: str) -> bytes:
    if provider not in PROVIDERS:
        raise ValueError("UNKNOWN_CREATOR_PROVIDER")
    return f"glam-creator:v1:{creator}:{connection}:{provider}".encode()


def encrypt_token(token: str, creator: UUID, connection: UUID, provider: str) -> bytes:
    if not 1 <= len(token) <= 16384:
        raise ValueError("INVALID_TOKEN_LENGTH")
    nonce = os.urandom(12)
    return nonce + _cipher().encrypt(nonce, token.encode(), _binding(creator, connection, provider))


def decrypt_token(envelope: bytes, creator: UUID, connection: UUID, provider: str) -> str:
    try:
        return (
            _cipher()
            .decrypt(envelope[:12], envelope[12:], _binding(creator, connection, provider))
            .decode()
        )
    except (InvalidTag, ValueError, UnicodeError):
        raise RuntimeError("CREATOR_CREDENTIAL_UNAVAILABLE") from None
