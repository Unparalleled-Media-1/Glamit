from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GLAM_", env_file=".env", extra="ignore")

    database_url: str
    oidc_issuer: str | None = None
    oidc_audience: str | None = None
    oidc_jwks_url: str | None = None

    @model_validator(mode="after")
    def validate_auth(self):
        configured = [self.oidc_issuer, self.oidc_audience, self.oidc_jwks_url]
        if any(configured) and not all(configured):
            raise ValueError("Configure all three OIDC settings or leave authentication disabled")
        if self.oidc_issuer and not self.oidc_issuer.startswith("https://"):
            raise ValueError("OIDC issuer must use HTTPS")
        if self.oidc_jwks_url and not self.oidc_jwks_url.startswith("https://"):
            raise ValueError("OIDC JWKS endpoint must use HTTPS")
        if not self.database_url.startswith("postgresql+psycopg://"):
            raise ValueError("PostgreSQL via psycopg is required")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
