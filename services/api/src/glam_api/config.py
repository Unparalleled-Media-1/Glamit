from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="GLAM_", env_file=".env", extra="ignore", hide_input_in_errors=True
    )

    database_url: str = Field(repr=False)
    oidc_issuer: str | None = None
    oidc_audience: str | None = None
    oidc_jwks_url: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def postgres_runtime_url(cls, value):
        if not isinstance(value, str):
            raise ValueError("A PostgreSQL connection URL is required")
        try:
            target = make_url(value)
        except Exception:
            raise ValueError("Invalid PostgreSQL connection URL") from None
        if target.drivername == "postgresql":
            target = target.set(drivername="postgresql+psycopg")
        if target.drivername != "postgresql+psycopg":
            raise ValueError("PostgreSQL via psycopg is required")
        if target.host not in {"localhost", "127.0.0.1", "postgres"}:
            settings = dict(target.query)
            if settings.get("sslmode", "verify-full") != "verify-full":
                raise ValueError("Hosted PostgreSQL requires verified TLS")
            settings.setdefault("sslmode", "verify-full")
            settings.setdefault("sslrootcert", "system")
            target = target.set(query=settings)
        return target.render_as_string(hide_password=False)

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
