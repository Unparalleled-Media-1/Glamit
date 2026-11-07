"""Railway entry point: explicit PORT, deployment separation and no boot-time migrations."""

import os

import uvicorn
from sqlalchemy.engine import make_url


def runtime_options(environ):
    try:
        port = int(environ.get("PORT", "8000"))
    except ValueError:
        raise RuntimeError("PORT_MUST_BE_INTEGER") from None
    if not 1 <= port <= 65535:
        raise RuntimeError("PORT_OUT_OF_RANGE")
    stage = environ.get("GLAM_DEPLOYMENT_ENV", "development")
    if stage not in {"development", "preview", "production"}:
        raise RuntimeError("INVALID_DEPLOYMENT_ENVIRONMENT")
    try:
        target = make_url(environ.get("GLAM_DATABASE_URL", ""))
    except Exception:
        raise RuntimeError("DATABASE_URL_REQUIRED") from None
    if target.drivername not in {"postgresql", "postgresql+psycopg"}:
        raise RuntimeError("POSTGRESQL_REQUIRED")
    if stage != "production" and target.host not in {"localhost", "127.0.0.1", "postgres"}:
        raise RuntimeError("NONPRODUCTION_REQUIRES_ISOLATED_LOCAL_DATABASE")
    if stage == "preview" and not (target.database or "").endswith("_test"):
        raise RuntimeError("PREVIEW_TEST_DATABASE_REQUIRED")
    if stage == "production":
        project = "bkkmsbxrxkqaveymcrgi"
        direct = target.host == f"db.{project}.supabase.co"
        pooler = (target.host or "").endswith(".pooler.supabase.com") and (
            target.username or ""
        ).endswith("." + project)
        if not (direct or pooler):
            raise RuntimeError("ORIGINAL_SUPABASE_PROJECT_REQUIRED")
        if (target.username or "").split(".")[0] in {"postgres", "supabase_admin", "service_role"}:
            raise RuntimeError("RESTRICTED_RUNTIME_DATABASE_ROLE_REQUIRED")
        if not all(environ.get("GLAM_OIDC_" + k) for k in ["ISSUER", "AUDIENCE", "JWKS_URL"]):
            raise RuntimeError("OIDC_CONFIGURATION_REQUIRED")
        if (
            environ["GLAM_OIDC_ISSUER"] != f"https://{project}.supabase.co/auth/v1"
            or environ["GLAM_OIDC_AUDIENCE"] != "authenticated"
            or environ["GLAM_OIDC_JWKS_URL"]
            != f"https://{project}.supabase.co/auth/v1/.well-known/jwks.json"
        ):
            raise RuntimeError("ORIGINAL_SUPABASE_AUTH_REQUIRED")
        if not environ.get("GLAM_ALLOWED_ORIGINS"):
            raise RuntimeError("EXPLICIT_CORS_ALLOWLIST_REQUIRED")
    return {"host": "0.0.0.0", "port": port, "proxy_headers": True, "access_log": False}


if __name__ == "__main__":
    uvicorn.run("glam_api.main:app", **runtime_options(os.environ))
