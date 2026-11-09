"""Disposable PostgreSQL persistence; explicit provider/storage doubles, never live images."""

from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from uuid import uuid4

import pytest
from glam_api.analysis_jobs import PURPOSE, analysis_provider, process_one
from glam_api.auth import Principal, get_principal
from glam_api.integrations.providers import ProviderAnalysis
from glam_api.integrations.runtime import ProviderConfig
from glam_api.main import app
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_private_media import media as media
from test_private_media import upload, withdraw
from test_workspaces import account, as_user, qualify


class AnalysisDouble:
    """Explicit test-only provider. No runtime fallback imports this."""

    config = ProviderConfig(
        values={"OPENAI_API_KEY": SecretStr("test-only-key")}, openai_model="test-model"
    )

    def __init__(self):
        self.calls = 0
        self.before = None
        self.invalid = False
        self.fail = False

    def analyze(self, image, mime, goals, *, consent):
        self.calls += 1
        assert image.startswith(b"\x89PNG") and mime == "image/png" and consent is True
        if self.before:
            self.before()
        if self.fail:
            raise RuntimeError("Sensitive provider detail must not escape")
        if self.invalid:
            return {"findings": []}
        return ProviderAnalysis(
            findings=[
                {
                    "key": key,
                    "estimate": None,
                    "certainty": "unavailable",
                    "uncertainty": "Explicit isolated test observation only",
                }
                for key in ["face-shape", "eyes", "brows", "lips", "undertone"]
            ],
            directions=[],
        )


@pytest.fixture
def analysis(client, db, media, monkeypatch):
    for name, value in {
        "GLAM_ANALYSIS_ENABLED": "true",
        "GLAM_ANALYSIS_PROVIDER_DATA_APPROVED": "true",
        "GLAM_ANALYSIS_RETENTION_SECONDS": "600",
        "GLAM_ANALYSIS_MAX_REQUESTS_PER_HOUR": "10",
    }.items():
        monkeypatch.setenv(name, value)
    policy = uuid4()
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO policy_document(id,purpose,version,content,approved_at) "
                "VALUES(:id,:p,'fixture','Not production legal approval',clock_timestamp())"
            ),
            {"id": policy, "p": PURPOSE},
        )
    assert (
        client.post(
            f"/v1/policies/{policy}/consent",
            json={"action": "granted"},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 201
    )
    provider = AnalysisDouble()
    app.dependency_overrides[analysis_provider] = lambda: provider
    yield SimpleNamespace(
        media=media, media_id=upload(client, media)["id"], policy=policy, provider=provider
    )
    app.dependency_overrides.pop(analysis_provider, None)


def submit(client, analysis, key=None, **changes):
    return client.post(
        "/v1/analysis/jobs",
        json={
            "media_id": analysis.media_id,
            "policy_id": str(analysis.policy),
            "consent": True,
            "goals": ["Understand my features"],
            **changes,
        },
        headers={"Idempotency-Key": str(key or uuid4())},
    )


def result(client, job_id):
    return client.get(f"/v1/analysis/jobs/{job_id}/report")


def run(db, analysis):
    return process_one(db, analysis.provider, analysis.media.store)


def test_analysis_job_requires_explicit_configuration(client, media, monkeypatch):
    monkeypatch.delenv("GLAM_ANALYSIS_ENABLED", raising=False)
    media_id = upload(client, media)["id"]
    response = client.post(
        "/v1/analysis/jobs",
        json={
            "media_id": media_id,
            "policy_id": str(uuid4()),
            "consent": True,
            "goals": ["Understand my features"],
        },
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 503
    assert response.json()["message"] == "analysis_not_enabled"


def test_persistent_dispatch_saved_report_and_no_automatic_replay(client, db, analysis):
    key = uuid4()
    created = submit(client, analysis, key)
    assert created.status_code == 202, created.text
    job_id = created.json()["id"]
    assert created.json()["state"] == "queued" and analysis.provider.calls == 0
    assert result(client, job_id).status_code == 409
    assert submit(client, analysis, key).json()["id"] == job_id
    assert submit(client, analysis, key, goals=["Discover my colors"]).status_code == 409
    assert run(db, analysis)
    report = result(client, job_id)
    assert report.status_code == 200, report.text
    assert report.json()["observations"]["findings"][0]["certainty"] == "unavailable"
    assert "no-store" in report.headers["cache-control"]
    assert not run(db, analysis) and analysis.provider.calls == 1
    assert result(client, job_id).json() == report.json(), (
        "Report survives request/session recreation"
    )
    assert submit(client, analysis, key).json()["state"] == "completed"
    assert client.get("/v1/analysis/jobs").json()[0]["id"] == job_id


def test_job_owner_isolation_and_no_privileged_body_fields(client, db, analysis):
    job_id = submit(client, analysis).json()["id"]
    account(client, "bob")
    assert client.get("/v1/analysis/jobs").json() == []
    assert client.get(f"/v1/analysis/jobs/{job_id}").status_code == 404
    assert result(client, job_id).status_code == 404
    assert client.delete(f"/v1/analysis/jobs/{job_id}").status_code == 404
    assert submit(client, analysis).status_code == 404
    as_user("alice")
    assert submit(client, analysis, owner_id=str(uuid4())).status_code == 422
    assert (
        submit(client, analysis, image_url="https://untrusted.invalid/private").status_code == 422
    )
    assert submit(client, analysis, consent="true").status_code == 422
    assert submit(client, analysis, goals=["Invented medical diagnosis"]).status_code == 422


@pytest.mark.parametrize("stage", ["queued", "running", "completed"])
def test_cancellation_prevents_publication_or_removes_saved_result(client, db, analysis, stage):
    job_id = submit(client, analysis).json()["id"]
    if stage == "running":
        analysis.provider.before = lambda: client.delete(f"/v1/analysis/jobs/{job_id}")
    if stage != "queued":
        run(db, analysis)
    cancelled = client.delete(f"/v1/analysis/jobs/{job_id}")
    assert cancelled.json()["state"] == "cancelled"
    assert result(client, job_id).status_code == 409
    assert not run(db, analysis)
    with db.connect() as c:
        assert (
            c.scalar(text("SELECT result FROM analysis_job WHERE id=:id"), {"id": job_id}) is None
        )


@pytest.mark.parametrize(
    "scope", ["storage_consent", "analysis_consent", "eligibility", "expiry", "media_deleted"]
)
def test_privacy_change_during_provider_call_never_stores_findings(client, db, analysis, scope):
    job_id = submit(client, analysis).json()["id"]

    def change():
        if scope == "storage_consent":
            withdraw(client, analysis.media)
            withdraw(client, analysis.media, "granted")
        elif scope == "analysis_consent":
            for action in ["withdrawn", "granted"]:
                assert (
                    client.post(
                        f"/v1/policies/{analysis.policy}/consent",
                        json={"action": action},
                        headers={"Idempotency-Key": str(uuid4())},
                    ).status_code
                    == 201
                )
        else:
            with db.begin() as c:
                if scope == "eligibility":
                    c.execute(
                        text(
                            "UPDATE account_eligibility SET "
                            "expires_at=clock_timestamp()-interval '1 second'"
                        )
                    )
                elif scope == "expiry":
                    c.execute(
                        text(
                            "UPDATE analysis_job SET "
                            "created_at=clock_timestamp()-interval '2 "
                            "hours',expires_at=clock_timestamp()-interval '1 second'"
                        )
                    )
                else:
                    c.execute(text("UPDATE private_media SET state='deletion_pending'"))

    analysis.provider.before = change
    assert run(db, analysis)
    assert client.get(f"/v1/analysis/jobs/{job_id}").json()["state"] == "expired"
    assert result(client, job_id).status_code == 410
    with db.connect() as c:
        assert (
            c.scalar(text("SELECT result FROM analysis_job WHERE id=:id"), {"id": job_id}) is None
        )


def test_read_and_worker_redact_saved_report_after_withdrawal_even_when_disabled(
    client, db, analysis, monkeypatch
):
    first = submit(client, analysis).json()["id"]
    second = submit(client, analysis).json()["id"]
    run(db, analysis)
    run(db, analysis)
    assert result(client, first).status_code == 200
    withdraw(client, analysis.media)
    assert result(client, first).status_code == 410
    monkeypatch.setenv("GLAM_ANALYSIS_ENABLED", "false")
    assert run(db, analysis)
    with db.connect() as c:
        rows = c.execute(
            text("SELECT result,state FROM analysis_job WHERE id IN (:a,:b)"),
            {"a": first, "b": second},
        ).all()
        assert all(r.result is None and r.state == "expired" for r in rows)


@pytest.mark.parametrize("failure", ["invalid", "fail"])
def test_provider_failure_is_durable_and_never_retried(client, db, analysis, failure):
    job_id = submit(client, analysis).json()["id"]
    setattr(analysis.provider, failure, True)
    assert run(db, analysis)
    status = client.get(f"/v1/analysis/jobs/{job_id}")
    assert status.json()["state"] == "failed"
    assert status.json()["error_code"] == "analysis_provider_or_storage_failed"
    assert "Sensitive" not in status.text
    assert result(client, job_id).status_code == 409
    assert not run(db, analysis) and analysis.provider.calls == 1


def test_no_database_locks_during_provider_call_and_no_duplicate_claim(client, db, analysis):
    submit(client, analysis)

    def unlocked():
        with db.begin() as c:
            c.execute(text("SET LOCAL lock_timeout='500ms'"))
            c.execute(
                text("SELECT id FROM app_user WHERE id=:u FOR UPDATE"), {"u": analysis.media.uid}
            )
        assert not run(db, analysis), "A running attempt cannot be claimed again"

    analysis.provider.before = unlocked
    assert run(db, analysis)
    assert analysis.provider.calls == 1


def test_concurrent_workers_dispatch_one_attempt(client, db, analysis):
    submit(client, analysis)
    with ThreadPoolExecutor(2) as pool:
        outcomes = list(pool.map(lambda _: run(db, analysis), range(2)))
    assert any(outcomes) and analysis.provider.calls == 1


def test_concurrent_submission_same_key_creates_one_durable_job(client, analysis):
    key = uuid4()
    with ThreadPoolExecutor(2) as pool:
        responses = list(pool.map(lambda _: submit(client, analysis, key), range(2)))
    assert all(response.status_code == 202 for response in responses)
    assert responses[0].json()["id"] == responses[1].json()["id"]
    assert len(client.get("/v1/analysis/jobs").json()) == 1
    assert analysis.provider.calls == 0


def test_interrupted_attempt_is_failed_without_redispatch(client, db, analysis):
    job_id = submit(client, analysis).json()["id"]
    with db.begin() as c:
        c.execute(
            text(
                "UPDATE analysis_job SET "
                "state='running',attempt_id=:a,"
                "attempted_at=clock_timestamp()-interval '3 minutes' WHERE id=:id"
            ),
            {"a": uuid4(), "id": job_id},
        )
    assert run(db, analysis)
    assert (
        client.get(f"/v1/analysis/jobs/{job_id}").json()["error_code"]
        == "analysis_processing_interrupted"
    )
    assert analysis.provider.calls == 0 and not run(db, analysis)


def test_late_provider_return_cannot_overwrite_an_interrupted_attempt(client, db, analysis):
    job_id = submit(client, analysis).json()["id"]

    def interrupt():
        with db.begin() as c:
            c.execute(
                text(
                    "UPDATE analysis_job SET "
                    "attempted_at=clock_timestamp()-interval '3 minutes' WHERE id=:id"
                ),
                {"id": job_id},
            )
        assert run(db, analysis)

    analysis.provider.before = interrupt
    assert run(db, analysis)
    assert client.get(f"/v1/analysis/jobs/{job_id}").json()["state"] == "failed"
    assert result(client, job_id).status_code == 409 and analysis.provider.calls == 1


def test_corrupt_storage_bytes_are_never_sent_to_provider(client, db, analysis):
    job_id = submit(client, analysis).json()["id"]
    analysis.media.store.get = lambda _: b"incorrect private bytes"
    assert run(db, analysis)
    assert analysis.provider.calls == 0
    assert client.get(f"/v1/analysis/jobs/{job_id}").json()["state"] == "failed"


def test_storage_withdrawal_before_provider_dispatch_stops_transfer(client, db, analysis):
    submit(client, analysis)
    store = analysis.media.store
    original = store.get

    def get(key):
        withdraw(client, analysis.media)
        return original(key)

    store.get = get
    assert run(db, analysis) and analysis.provider.calls == 0


def test_approved_policy_eligibility_flags_limits_and_input_bounds(
    client, db, analysis, monkeypatch
):
    assert (
        client.post(
            f"/v1/policies/{analysis.policy}/consent",
            json={"action": "withdrawn"},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 201
    )
    assert submit(client, analysis).status_code == 403
    client.post(
        f"/v1/policies/{analysis.policy}/consent",
        json={"action": "granted"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    monkeypatch.setenv("GLAM_ANALYSIS_PROVIDER_DATA_APPROVED", "false")
    assert submit(client, analysis).status_code == 503
    monkeypatch.setenv("GLAM_ANALYSIS_PROVIDER_DATA_APPROVED", "true")
    monkeypatch.setenv("GLAM_ANALYSIS_MAX_REQUESTS_PER_HOUR", "1")
    assert submit(client, analysis).status_code == 202
    assert submit(client, analysis).status_code == 429
    assert (
        client.post(
            "/v1/analysis/jobs", content=b"x" * 4097, headers={"Content-Type": "application/json"}
        ).status_code
        == 413
    )


def test_clients_cannot_read_or_write_jobs_and_owner_media_fk_is_enforced(client, db, analysis):
    submit(client, analysis)
    other_owner = account(client, "bob")
    with db.connect() as c:
        tx = c.begin()
        try:
            for role in ["anon", "authenticated"]:
                c.execute(text("SET LOCAL ROLE " + role))
                with pytest.raises(DBAPIError), c.begin_nested():
                    c.execute(text("SELECT * FROM analysis_job"))
                c.execute(text("RESET ROLE"))
            with pytest.raises(DBAPIError), c.begin_nested():
                c.execute(text("UPDATE analysis_job SET owner_id=:u"), {"u": other_owner})
        finally:
            tx.rollback()


def test_supabase_revocation_blocks_pending_work_but_saved_report_survives_new_login(
    client, db, analysis
):
    subject = uuid4()
    with db.begin() as c:
        c.execute(text("INSERT INTO auth.users(id) VALUES(:id)"), {"id": subject})
    issuer = "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1"
    app.dependency_overrides[get_principal] = lambda: Principal(
        issuer, str(subject), session_id=str(subject)
    )
    uid = client.get("/v1/me").json()["id"]
    qualify(db, uid)
    for policy in [analysis.policy, analysis.media.policy]:
        assert (
            client.post(
                f"/v1/policies/{policy}/consent",
                json={"action": "granted"},
                headers={"Idempotency-Key": str(uuid4())},
            ).status_code
            == 201
        )
    analysis.media_id = upload(client, analysis.media)["id"]
    completed_id = submit(client, analysis).json()["id"]
    assert run(db, analysis)
    queued_id = submit(client, analysis).json()["id"]
    with db.begin() as c:
        c.execute(text("DELETE FROM auth.sessions WHERE id=:id"), {"id": subject})
    assert run(db, analysis)
    assert analysis.provider.calls == 1
    assert result(client, completed_id).status_code == 401
    next_session = uuid4()
    with db.begin() as c:
        c.execute(
            text("INSERT INTO auth.sessions(id,user_id) VALUES(:id,:u)"),
            {"id": next_session, "u": subject},
        )
    app.dependency_overrides[get_principal] = lambda: Principal(
        issuer, str(subject), session_id=str(next_session)
    )
    assert result(client, completed_id).status_code == 200
    assert client.get(f"/v1/analysis/jobs/{queued_id}").json()["state"] == "expired"


def test_uncertainty_cannot_be_blank():
    fields = [
        {"key": k, "estimate": None, "certainty": "unavailable", "uncertainty": " "}
        for k in ["face-shape", "eyes", "brows", "lips", "undertone"]
    ]
    with pytest.raises(ValueError):
        ProviderAnalysis(findings=fields, directions=[])


def test_candidate_analysis_migration_empty_only_rollback(client, db, analysis):
    import importlib.util
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations

    path = Path("db/migrations/versions/0016_analysis_jobs.py")
    spec = importlib.util.spec_from_file_location("analysis_migration_test", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with db.connect() as c:
        tx = c.begin()
        try:
            with Operations.context(MigrationContext.configure(c)):
                from test_private_media_migration import migration as load_migration

                load_migration("0017_analysis_passport").downgrade()
                migration.downgrade()
                assert c.scalar(text("SELECT to_regclass('public.analysis_job')")) is None
                migration.upgrade()
                load_migration("0017_analysis_passport").upgrade()
                assert c.scalar(text("SELECT to_regclass('public.analysis_job')")) is not None
        finally:
            tx.rollback()
    job_id = submit(client, analysis).json()["id"]
    with db.connect() as c:
        tx = c.begin()
        try:
            with Operations.context(MigrationContext.configure(c)):
                with pytest.raises(DBAPIError, match="empty job registry"), c.begin_nested():
                    migration.downgrade()
            assert str(c.scalar(text("SELECT id FROM analysis_job"))) == job_id
        finally:
            tx.rollback()
