from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from glam_api.config import get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    issuer: str
    subject: str


@lru_cache
def jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_keys=False, lifespan=300, timeout=5)


def verify_token(token: str, key, issuer: str, audience: str) -> Principal:
    claims = jwt.decode(
        token,
        key,
        algorithms=["RS256"],
        issuer=issuer,
        audience=audience,
        options={"require": ["exp", "iat", "sub", "iss", "aud"]},
    )
    if not isinstance(claims["sub"], str) or not claims["sub"].strip():
        raise jwt.InvalidTokenError("Missing subject")
    return Principal(issuer=claims["iss"], subject=claims["sub"])


def get_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    settings = get_settings()
    if not settings.oidc_issuer:
        raise HTTPException(503, "Identity provider is not configured")
    if not credentials:
        raise HTTPException(401, "Authentication required", headers={"WWW-Authenticate": "Bearer"})
    try:
        key = jwks_client(settings.oidc_jwks_url).get_signing_key_from_jwt(credentials.credentials)
        return verify_token(
            credentials.credentials, key.key, settings.oidc_issuer, settings.oidc_audience
        )
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(503, "Identity verification temporarily unavailable") from exc
    except (jwt.PyJWTError, ValueError) as exc:
        raise HTTPException(
            401, "Invalid access token", headers={"WWW-Authenticate": "Bearer"}
        ) from exc
