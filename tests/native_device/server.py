"""Isolated installed-native acceptance services. NEVER imported by production entrypoints.

Real FastAPI/domain code and disposable PostgreSQL; explicit fixture Auth protocol,
filesystem storage and deterministic provider. No SMS, production Auth or OpenAI calls.
"""

import contextlib
import hashlib
import json
import os
import re
import secrets
import threading
import time
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.orm import Session

ISSUER = "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1"
PHONE = "+27820000001"
OTP = "246810"
CORRECTION = "DEVICE FIXTURE CORRECTION"


def guard_database(engine):
    url = engine.url
    if url.host not in {"127.0.0.1", "localhost"} or not (url.database or "").endswith("_test"):
        raise RuntimeError("Native fixture requires disposable local PostgreSQL ending in _test")


class FixtureStorage:
    def __init__(self, root):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.fail_delete = False

    def path(self, key):
        path = (self.root / key).resolve()
        if not re.fullmatch(r"[a-zA-Z0-9/_.-]+", key) or not path.is_relative_to(self.root):
            raise RuntimeError("Invalid fixture object key")
        return path

    def check_private_bucket(self):
        pass

    def put(self, key, content):
        target = self.path(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)

    def get(self, key):
        return self.path(key).read_bytes()

    def delete(self, key):
        from glam_api.integrations.private_storage import StorageError

        if self.fail_delete:
            raise StorageError("storage_delete_not_confirmed")
        self.path(key).unlink(missing_ok=True)


class DeterministicAnalysis:
    def __init__(self):
        from glam_api.integrations.runtime import ProviderConfig

        self.config = ProviderConfig(
            values={"OPENAI_API_KEY": SecretStr("isolated-device-fixture-not-a-provider-key")},
            openai_model="deterministic-device-fixture-v1",
        )
        self.calls = 0
        self.delay = 5
        self.on_event = lambda name: None

    def model_health(self):
        from glam_api.integrations.runtime import Readiness, State

        return Readiness("openai", True, State.CONNECTED, "ISOLATED deterministic fixture")

    def analyze(self, image, mime, goals, *, consent):
        from glam_api.integrations.providers import ProviderAnalysis

        if not image.startswith(b"\x89PNG") or mime != "image/png" or consent is not True:
            raise RuntimeError("Unqualified fixture input")
        self.calls += 1
        self.on_event("deterministic_provider_running")
        time.sleep(self.delay)
        self.on_event("deterministic_provider_returned")
        return ProviderAnalysis(
            findings=[
                {
                    "key": key,
                    "estimate": None,
                    "certainty": "unavailable",
                    "uncertainty": "Deterministic test adapter: not live OpenAI analysis.",
                }
                for key in ["face-shape", "eyes", "brows", "lips", "undertone"]
            ],
            directions=[],
        )


@contextlib.contextmanager
def device_environment(engine, root):
    guard_database(engine)
    # No environment credential is read, forwarded, printed or replaced with production data.
    from glam_api import analysis_jobs, analysis_passport, private_media
    from glam_api.auth import bearer, get_principal, verify_token
    from glam_api.db import get_engine, get_session
    from glam_api.main import app as domain
    from glam_api.main import user

    original_dependencies = domain.dependency_overrides.copy()
    original_storage = private_media.configured_storage, analysis_passport.configured_storage
    settings = {
        "GLAM_PRIVATE_MEDIA_RETENTION_SECONDS": "3600",
        "GLAM_ANALYSIS_ENABLED": "true",
        "GLAM_ANALYSIS_PROVIDER_DATA_APPROVED": "true",
        "GLAM_ANALYSIS_RETENTION_SECONDS": "1800",
        "GLAM_ANALYSIS_MAX_REQUESTS_PER_HOUR": "20",
    }
    previous = {key: os.environ.get(key) for key in settings}
    os.environ.update(settings)
    store, provider = FixtureStorage(Path(root) / "objects"), DeterministicAnalysis()
    private_key = ec.generate_private_key(ec.SECP256R1())
    subject, policy_storage, policy_analysis = uuid4(), uuid4(), uuid4()
    session_id = subject
    refresh_tokens, challenges, events = {}, {}, []
    auth_lock = threading.Lock()
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)

    def event(name, **safe):
        item = {"time": time.time(), "event": name, **safe}
        events.append(item)
        with (root / "events.jsonl").open("a") as output:
            output.write(json.dumps(item) + "\n")

    provider.on_event = event

    def session():
        with Session(engine) as db, db.begin():
            yield db

    bearer_dependency = Depends(bearer)

    def principal(credentials: HTTPAuthorizationCredentials | None = bearer_dependency):
        if credentials is None:
            raise HTTPException(401, "Fixture authentication required")
        try:
            return verify_token(
                credentials.credentials, private_key.public_key(), ISSUER, "authenticated"
            )
        except (jwt.PyJWTError, ValueError):
            raise HTTPException(401, "Fixture token invalid or expired") from None

    domain.dependency_overrides[get_session] = session
    domain.dependency_overrides[get_engine] = lambda: engine
    domain.dependency_overrides[get_principal] = principal
    domain.dependency_overrides[private_media.storage_dependency] = lambda: store
    domain.dependency_overrides[analysis_jobs.analysis_provider] = lambda: provider
    private_media.configured_storage = analysis_passport.configured_storage = lambda: store
    try:
        with engine.begin() as db:
            db.execute(text("INSERT INTO auth.users(id) VALUES(:id)"), {"id": subject})
            db.execute(
                text("INSERT INTO profiles(id,display_name) VALUES(:id,'ISOLATED DEVICE TEST')"),
                {"id": subject},
            )
        with Session(engine) as db, db.begin():
            from glam_api.auth import Principal

            uid = user(db, Principal(ISSUER, str(subject), session_id=str(session_id)))
            db.execute(
                text("""INSERT INTO account_eligibility(user_id,age_band,evidence_ref,expires_at)
                VALUES(:id,'eligible_adult','ISOLATED TEST FIXTURE',
                now()+interval '2 hours')"""),
                {"id": uid},
            )
            for identifier, purpose in [
                (policy_storage, "private_photo_storage"),
                (policy_analysis, "cosmetic_photo_analysis"),
            ]:
                db.execute(
                    text("""INSERT INTO policy_document(id,purpose,version,content,approved_at)
                    VALUES(:id,:purpose,'DEVICE-TEST-ONLY',
                    'Isolated test consent, not production legal approval.',now())"""),
                    {"id": identifier, "purpose": purpose},
                )

        app = FastAPI(docs_url=None, redoc_url=None)

        @app.middleware("http")
        async def evidence(request, call_next):
            # Default-deny any unrelated production domain route in the fixture composition.
            path = request.url.path
            allowed = (
                path.startswith(
                    (
                        "/auth/v1/",
                        "/functions/v1/glam-api/",
                        "/__fixture/",
                        "/v1/analysis/",
                        "/v1/media",
                    )
                )
                or path in {"/v1/me", "/v1/me/analysis-passport"}
                or re.fullmatch(r"/v1/policies/[a-f0-9-]{36}/consent", path)
            )
            if not allowed:
                from fastapi.responses import JSONResponse

                return JSONResponse(
                    status_code=404, content={"message": "fixture_route_not_enabled"}
                )
            response = await call_next(request)
            event(
                "request",
                method=request.method,
                path=re.sub(r"[a-f0-9-]{36}", "{id}", path),
                status=response.status_code,
            )
            return response

        def sdk_user():
            return {
                "id": str(subject),
                "aud": "authenticated",
                "role": "authenticated",
                "phone": PHONE,
                "app_metadata": {"provider": "phone", "providers": ["phone"]},
                "user_metadata": {},
                "created_at": datetime.now(UTC).isoformat(),
            }

        def issue(sid):
            now = int(time.time())
            token = jwt.encode(
                {
                    "iss": ISSUER,
                    "aud": "authenticated",
                    "sub": str(subject),
                    "session_id": str(sid),
                    "iat": now,
                    "exp": now + 3600,
                    "aal": "aal1",
                    "role": "authenticated",
                },
                private_key,
                algorithm="ES256",
            )
            refresh = secrets.token_urlsafe(32)
            refresh_tokens[hashlib.sha256(refresh.encode()).hexdigest()] = sid
            return {
                "access_token": token,
                "refresh_token": refresh,
                "token_type": "bearer",
                "expires_in": 3600,
                "expires_at": now + 3600,
                "user": sdk_user(),
            }

        @app.get("/auth/v1/settings")
        def settings_read():
            return {"external": {"phone": True, "google": False, "apple": False, "facebook": False}}

        @app.post("/auth/v1/otp")
        async def otp(request: Request):
            body = await request.json()
            if body.get("phone") != PHONE:
                raise HTTPException(400, "Only the isolated fixture identity is available")
            challenges[PHONE] = time.time() + 120
            event("test_otp_requested")
            return {"message_id": "ISOLATED-no-SMS-sent"}

        @app.post("/auth/v1/verify")
        async def verify(request: Request):
            body = await request.json()
            with auth_lock:
                if (
                    body.get("phone") != PHONE
                    or body.get("token") != OTP
                    or body.get("type") != "sms"
                    or challenges.pop(PHONE, 0) < time.time()
                ):
                    raise HTTPException(400, "Invalid or expired fixture challenge")
                event("test_identity_authenticated")
                sid = uuid4()
                with engine.begin() as db:
                    db.execute(
                        text("INSERT INTO auth.sessions(id,user_id) VALUES(:id,:user)"),
                        {"id": sid, "user": subject},
                    )
                return issue(sid)

        identity_dependency = Depends(principal)

        @app.get("/auth/v1/user")
        def get_user(identity=identity_dependency):
            with Session(engine) as db, db.begin():
                user(db, identity)
            return sdk_user()

        @app.post("/auth/v1/token")
        async def refresh(request: Request):
            body = await request.json()
            digest = hashlib.sha256(str(body.get("refresh_token", "")).encode()).hexdigest()
            with auth_lock:
                sid = refresh_tokens.pop(digest, None)
                with engine.connect() as db:
                    live = db.scalar(
                        text(
                            "SELECT EXISTS(SELECT 1 FROM auth.sessions WHERE id=:id "
                            "AND (not_after IS NULL OR not_after>now()))"
                        ),
                        {"id": sid},
                    )
                if request.query_params.get("grant_type") != "refresh_token" or not live:
                    raise HTTPException(401, "Fixture refresh rejected")
                event("test_session_refreshed")
                return issue(sid)

        @app.post("/auth/v1/logout")
        def logout(identity=identity_dependency):
            with engine.begin() as db:
                db.execute(
                    text("DELETE FROM auth.sessions WHERE id=:id"),
                    {"id": UUID(identity.session_id)},
                )
            return {}

        @app.get("/functions/v1/glam-api/v1/me/{resource}")
        def account(resource: str, identity=identity_dependency):
            with Session(engine) as db, db.begin():
                user(db, identity)
                if resource == "profile":
                    return dict(
                        db.execute(
                            text("SELECT id,display_name FROM profiles WHERE id=:id"),
                            {"id": subject},
                        )
                        .mappings()
                        .one()
                    )
                if resource in {"routines", "workspaces"}:
                    return []  # Isolated seeded account has no routines or workspace grants.
            raise HTTPException(404, "Fixture account resource not enabled")

        @app.put("/functions/v1/glam-api/v1/me/devices/{device_id}")
        async def device(device_id: UUID, request: Request, identity=identity_dependency):
            with Session(engine) as db, db.begin():
                user(db, identity)
            value = await request.json()
            if (
                value.get("platform") not in {"ios", "android"}
                or type(value.get("biometric_enabled")) is not bool
            ):
                raise HTTPException(422, "Invalid fixture preference")
            event(
                "test_device_preference",
                platform=value["platform"],
                enabled=value["biometric_enabled"],
            )
            return {"id": str(device_id), **value}

        @app.get("/__fixture/ready")
        def ready():
            return {
                "fixture": True,
                "provider": "deterministic-device-fixture-v1",
                "subject": str(subject),
            }

        @app.get("/__fixture/assert-passport")
        def assert_passport():
            with engine.connect() as db:
                row = (
                    db.execute(
                        text("""SELECT p.revision,c.corrections,j.state FROM style_passports p
                    JOIN style_passport_analysis a ON a.passport_id=p.id
                    JOIN analysis_job j ON j.id=a.job_id
                    JOIN analysis_correction c ON c.job_id=a.job_id
                    AND c.revision=a.correction_revision
                    WHERE p.profile_id=:id AND c.redacted_at IS NULL"""),
                        {"id": subject},
                    )
                    .mappings()
                    .one_or_none()
                )
            passed = bool(
                row
                and row["state"] == "completed"
                and row["corrections"].get("face-shape") == CORRECTION
            )
            if not passed:
                raise HTTPException(409, "Persisted corrected passport not confirmed")
            event("postgres_passport_assertion", revision=row["revision"], correction_matches=True)
            return {
                "passed": True,
                "revision": row["revision"],
                "provider_calls": provider.calls,
                "authenticated": any(e["event"] == "test_identity_authenticated" for e in events),
                "refresh_count": sum(e["event"] == "test_session_refreshed" for e in events),
            }

        app.mount("/", domain)
        yield SimpleNamespace(
            app=app,
            engine=engine,
            storage=store,
            provider=provider,
            subject=subject,
            policy_storage=policy_storage,
            policy_analysis=policy_analysis,
            event=event,
            events=events,
        )
    finally:
        domain.dependency_overrides.clear()
        domain.dependency_overrides.update(original_dependencies)
        private_media.configured_storage, analysis_passport.configured_storage = original_storage
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def main():
    import uvicorn
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import create_engine

    url = os.environ.get("GLAM_NATIVE_TEST_DATABASE_URL", "")
    engine = create_engine(url, hide_parameters=True)
    guard_database(engine)
    with engine.begin() as db:
        if db.scalar(text("SELECT to_regclass('public.app_user')")) and db.scalar(
            text("SELECT count(*) FROM app_user")
        ):
            raise SystemExit(
                "Refusing an occupied fixture database; create a fresh disposable database"
            )
        for file in ["supabase_auth.sql", "supabase_storage.sql"]:
            db.execute(text((Path("tests/fixtures") / file).read_text()))
    # Canonical env.py reads Settings directly, not Config.connection. Pin its URL
    # only AFTER validating the explicit local test URL; never inherit the app URL.
    os.environ["GLAM_DATABASE_URL"] = url
    for variable in ["GLAM_OIDC_ISSUER", "GLAM_OIDC_AUDIENCE", "GLAM_OIDC_JWKS_URL"]:
        os.environ[variable] = ""
    config = Config("alembic.ini")
    command.upgrade(config, "application@head")
    with device_environment(engine, Path(os.environ["GLAM_NATIVE_FIXTURE_ROOT"])) as fixture:

        def work():
            from glam_api.analysis_jobs import process_one
            from glam_api.media_cleanup import purge_one

            while True:
                process_one(engine, fixture.provider, fixture.storage)
                purge_one(engine, fixture.storage)
                time.sleep(0.5)

        threading.Thread(target=work, daemon=True).start()
        uvicorn.run(fixture.app, host="127.0.0.1", port=8765, access_log=False)


if __name__ == "__main__":
    main()
