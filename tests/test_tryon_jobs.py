"""Try-on pipeline on disposable PostgreSQL. Provider and Storage are explicit test doubles;
fixtures are synthetic solid-colour images, never real people."""

import io
import pathlib
import re
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from uuid import uuid4

import pytest
from glam_api import credits, tryon_jobs
from glam_api.main import app
from glam_api.tryon_jobs import PURPOSE, process_one, tryon_provider
from glam_api.tryon_providers import DeterministicTestProvider
from PIL import Image
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
from test_private_media import media as media
from test_private_media import upload, withdraw
from test_workspaces import as_user

UNITS = 7


@pytest.fixture
def tryon(client, db, media, monkeypatch):
    for name, value in {
        "GLAM_TRYON_ENABLED": "true",
        "GLAM_TRYON_PROVIDER_DATA_APPROVED": "true",
        "GLAM_TRYON_RETENTION_SECONDS": "600",
        "GLAM_TRYON_MAX_REQUESTS_PER_HOUR": "10",
    }.items():
        monkeypatch.setenv(name, value)
    monkeypatch.setattr(tryon_jobs, "BACKOFF", 0)
    monkeypatch.setattr(tryon_jobs, "POLL_INTERVAL", 0.01)
    policy = uuid4()
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO policy_document(id,purpose,version,content,approved_at) "
                "VALUES(:id,:p,'fixture','Not production legal approval',clock_timestamp())"
            ),
            {"id": policy, "p": PURPOSE},
        )
        c.execute(
            text(
                "INSERT INTO generation_price_rule(id,feature,version,credit_units,approved_at) "
                "VALUES(:id,'tryon_full_body',1,:u,clock_timestamp())"
            ),
            {"id": uuid4(), "u": UNITS},
        )
    assert (
        client.post(
            f"/v1/policies/{policy}/consent",
            json={"action": "granted"},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 201
    )
    provider = DeterministicTestProvider()
    app.dependency_overrides[tryon_provider] = lambda: provider
    ctx = SimpleNamespace(
        media=media, media_id=upload(client, media)["id"], policy=policy, provider=provider, db=db
    )
    fund(db, media.uid, 100)
    yield ctx
    app.dependency_overrides.pop(tryon_provider, None)


def fund(db, uid, units, key=None):
    with Session(db) as s, s.begin():
        credits.grant(s, uid, key or f"fund-{uuid4()}", units)


def bal(db, uid):
    with Session(db) as s, s.begin():
        captured = s.scalar(
            text(
                "SELECT coalesce(sum(units),0) FROM credit_reservation "
                "WHERE user_id=:u AND state='captured'"
            ),
            {"u": uid},
        )
        return {**credits.balance(s, uid), "consumed": int(captured)}


def submit(client, t, key=None, **changes):
    body = {
        "media_id": t.media_id,
        "policy_id": str(t.policy),
        "consent": True,
        "scope": "full_body",
        "outfit": {"occasion": "Garden party"},
        "garments": [{"label": "White linen dress", "category": "dress"}],
        **changes,
    }
    return client.post(
        "/v1/tryon/jobs", json=body, headers={"Idempotency-Key": str(key or uuid4())}
    )


def run(t, provider=None):
    return process_one(t.db, provider or t.provider, t.media.store)


def row(db, sql, **args):
    with db.begin() as c:
        return c.execute(text(sql), args).mappings().all()


def finish(client, t, **changes):
    job = submit(client, t, **changes).json()["id"]
    assert run(t)
    return job


def test_disabled_unqualified_and_production_fail_closed(client, media, monkeypatch):
    monkeypatch.delenv("GLAM_TRYON_ENABLED", raising=False)
    body = {
        "media_id": str(uuid4()),
        "policy_id": str(uuid4()),
        "consent": True,
        "outfit": {"occasion": "x"},
        "garments": [{"label": "a", "category": "dress"}],
    }
    key = {"Idempotency-Key": str(uuid4())}
    assert client.post("/v1/tryon/jobs", json=body, headers=key).json()["message"] == (
        "tryon_provider_not_qualified"
    )
    monkeypatch.setenv("GLAM_TRYON_PROVIDER", "deterministic_test")
    monkeypatch.setenv("GLAM_TRYON_ALLOW_TEST_PROVIDER", "true")
    monkeypatch.setenv("GLAM_DEPLOYMENT_ENV", "production")
    r = client.post("/v1/tryon/jobs", json=body, headers=key)
    assert r.json()["message"] == "tryon_test_provider_forbidden"
    with pytest.raises(RuntimeError):
        DeterministicTestProvider()
    monkeypatch.setenv("GLAM_DEPLOYMENT_ENV", "development")
    monkeypatch.delenv("GLAM_TRYON_ALLOW_TEST_PROVIDER")
    assert client.post("/v1/tryon/jobs", json=body, headers=key).status_code == 503


def test_disabled_flag_and_provider_data_review_required(client, tryon, monkeypatch):
    monkeypatch.delenv("GLAM_TRYON_ENABLED")
    assert submit(client, tryon).json()["message"] == "tryon_not_enabled"
    monkeypatch.setenv("GLAM_TRYON_ENABLED", "true")
    monkeypatch.delenv("GLAM_TRYON_PROVIDER_DATA_APPROVED")
    assert submit(client, tryon).json()["message"] == "tryon_provider_data_review_required"


def test_quote_uses_configurable_price_and_no_price_means_unavailable(client, db, tryon):
    assert client.get("/v1/tryon/quote").json() == {
        "scope": "full_body",
        "credit_units": UNITS,
        "price_rule_version": 1,
        "credit_kind": "glam_ai_credit",
    }
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO generation_price_rule(id,feature,version,credit_units,approved_at) "
                "VALUES(:i,'tryon_full_body',2,11,clock_timestamp())"
            ),
            {"i": uuid4()},
        )
    assert client.get("/v1/tryon/quote").json()["credit_units"] == 11
    assert client.get("/v1/tryon/quote?scope=torso").json()["message"] == (
        "tryon_price_not_configured"
    )


def test_consent_and_validation_are_enforced(client, tryon):
    assert submit(client, tryon, consent=False).status_code == 422
    assert submit(client, tryon, policy_id=str(uuid4())).status_code == 403
    assert submit(client, tryon, owner_id=str(uuid4())).status_code == 422
    assert submit(client, tryon, garments=[]).status_code == 422
    assert submit(client, tryon, media_id=str(uuid4())).status_code in (403, 404)


def test_insufficient_credits_creates_nothing(client, db, tryon):
    with db.begin() as c:
        c.execute(text("UPDATE generation_price_rule SET credit_units=1000"))
    r = submit(client, tryon)
    assert r.status_code == 402 and r.json()["message"] == "tryon_insufficient_credits"
    assert row(db, "SELECT 1 FROM tryon_job") == []


def test_full_journey_captures_only_after_validated_private_storage(client, db, tryon):
    created = submit(client, tryon)
    assert created.status_code == 202 and created.json()["state"] == "queued"
    uid = tryon.media.uid
    assert bal(db, uid)["held"] == UNITS
    assert not client.get(f"/v1/tryon/jobs/{created.json()['id']}/result").status_code == 200
    assert run(tryon)
    job = client.get(f"/v1/tryon/jobs/{created.json()['id']}").json()
    assert job["state"] == "completed" and job["result_available"] and job["synthetic_test"]
    b = bal(db, uid)
    assert (b["held"], b["consumed"], b["available"]) == (0, UNITS, 100 - UNITS)
    res = client.get(f"/v1/tryon/jobs/{job['id']}/result")
    assert res.status_code == 200 and res.headers["content-type"] == "image/png"
    assert res.headers["x-glam-label"] == "ai-generated-preview"
    assert res.headers["x-glam-synthetic-test"] == "true"
    assert "no-store" in res.headers["cache-control"]
    plain = Image.open(io.BytesIO(res.content))
    stamped = Image.open(
        io.BytesIO(client.get(f"/v1/tryon/jobs/{job['id']}/result?export=true").content)
    )
    assert stamped.height > plain.height
    stored = row(db, "SELECT object_key,owner_id,state FROM tryon_result")[0]
    assert stored["object_key"].startswith(f"{uid}/") and stored["state"] == "stored"
    assert stored["object_key"] in tryon.media.store.objects
    cost = row(db, "SELECT outcome,credits_captured,synthetic_test FROM generation_cost_event")
    assert [dict(c) for c in cost] == [
        {"outcome": "success", "credits_captured": True, "synthetic_test": True}
    ]
    assert tryon.provider.submits == 1 and not run(tryon)


def test_other_users_cannot_see_job_or_result(client, db, tryon):
    job = finish(client, tryon)
    as_user("mallory")
    assert client.get(f"/v1/tryon/jobs/{job}").status_code == 404
    assert client.get(f"/v1/tryon/jobs/{job}/result").status_code == 404
    assert client.delete(f"/v1/tryon/jobs/{job}").status_code == 404
    assert client.get("/v1/tryon/jobs").json() == []
    as_user("alice")


def test_source_media_must_belong_to_caller(client, db, tryon):
    as_user("mallory")
    assert submit(client, tryon).status_code in (403, 404)
    as_user("alice")


def test_idempotent_retry_reserves_once_and_conflict_is_rejected(client, db, tryon):
    key = uuid4()
    a, b = submit(client, tryon, key), submit(client, tryon, key)
    assert a.json()["id"] == b.json()["id"] and bal(db, tryon.media.uid)["held"] == UNITS
    assert submit(client, tryon, key, outfit={"occasion": "Other"}).status_code == 409
    assert len(row(db, "SELECT 1 FROM tryon_job")) == 1


def test_concurrent_same_key_submissions_create_one_job_and_one_hold(client, db, tryon):
    key = uuid4()
    with ThreadPoolExecutor(3) as pool:
        out = list(pool.map(lambda _: submit(client, tryon, key), range(3)))
    assert {r.status_code for r in out} == {202}
    assert len({r.json()["id"] for r in out}) == 1
    assert bal(db, tryon.media.uid)["held"] == UNITS


def test_concurrent_workers_dispatch_once(client, db, tryon):
    submit(client, tryon)
    with ThreadPoolExecutor(3) as pool:
        list(pool.map(lambda _: run(tryon), range(3)))
    assert tryon.provider.submits == 1
    assert bal(db, tryon.media.uid)["consumed"] == UNITS


def test_hourly_limit(client, tryon, monkeypatch):
    monkeypatch.setenv("GLAM_TRYON_MAX_REQUESTS_PER_HOUR", "1")
    assert submit(client, tryon).status_code == 202
    assert submit(client, tryon).status_code == 429


@pytest.mark.parametrize(
    ("mode", "error", "outcome"),
    [
        ("fail", "tryon_provider_failed", "provider_failure"),
        ("reject", "tryon_provider_rejected", "moderation_reject"),
        ("not_image", "tryon_result_invalid", "provider_failure"),
        ("oversize", "tryon_result_invalid", "provider_failure"),
    ],
)
def test_definite_failures_release_credits_and_store_nothing(
    client, db, tryon, mode, error, outcome
):
    tryon.provider.mode = mode
    job = finish(client, tryon)
    state = client.get(f"/v1/tryon/jobs/{job}").json()
    assert state["state"] == "failed" and state["error_code"] == error
    b = bal(db, tryon.media.uid)
    assert (b["held"], b["consumed"], b["available"]) == (0, 0, 100)
    assert row(db, "SELECT outcome FROM generation_cost_event")[0]["outcome"] == outcome
    assert row(db, "SELECT 1 FROM tryon_result") == []
    assert not [k for k in tryon.media.store.objects if k != _source(db)]
    assert client.get(f"/v1/tryon/jobs/{job}/result").status_code == 409


def _source(db):
    return row(db, "SELECT object_key FROM private_media")[0]["object_key"]


@pytest.mark.parametrize("mode", ["submit_ambiguous", "poll_ambiguous", "never_ready"])
def test_ambiguous_outcomes_never_redispatch_or_charge(client, db, tryon, monkeypatch, mode):
    monkeypatch.setenv("GLAM_TRYON_PROVIDER_TIMEOUT_SECONDS", "1")
    tryon.provider.mode = mode
    job = finish(client, tryon)
    state = client.get(f"/v1/tryon/jobs/{job}").json()
    assert state["state"] == "failed"
    assert state["error_code"] in ("tryon_outcome_ambiguous", "tryon_provider_timeout")
    b = bal(db, tryon.media.uid)
    assert (b["held"], b["consumed"], b["available"]) == (0, 0, 100)
    assert row(db, "SELECT outcome FROM generation_cost_event")[0]["outcome"] == "ambiguous"
    submits = tryon.provider.submits
    assert not run(tryon) and tryon.provider.submits == submits


def test_interrupted_attempt_fails_without_redispatch_and_releases(client, db, tryon):
    job = submit(client, tryon).json()["id"]
    with db.begin() as c:
        c.execute(
            text(
                "UPDATE tryon_job SET state='running',attempt_id=:a,"
                "attempted_at=clock_timestamp()-interval '1 hour' WHERE id=:id"
            ),
            {"a": uuid4(), "id": job},
        )
    assert run(tryon)
    state = client.get(f"/v1/tryon/jobs/{job}").json()
    assert state["error_code"] == "tryon_processing_interrupted"
    assert tryon.provider.submits == 0 and bal(db, tryon.media.uid)["available"] == 100
    assert not run(tryon)


def test_fresh_running_attempt_is_not_claimed(client, db, tryon):
    job = submit(client, tryon).json()["id"]
    with db.begin() as c:
        c.execute(
            text(
                "UPDATE tryon_job SET state='running',attempt_id=:a,"
                "attempted_at=clock_timestamp() WHERE id=:id"
            ),
            {"a": uuid4(), "id": job},
        )
    assert not run(tryon) and tryon.provider.submits == 0


def test_storage_failure_releases_and_orphan_object_is_purged(client, db, tryon):
    tryon.media.store.fail_put = True
    job = finish(client, tryon)
    assert client.get(f"/v1/tryon/jobs/{job}").json()["error_code"] == "tryon_result_storage_failed"
    assert bal(db, tryon.media.uid)["available"] == 100
    cost = row(db, "SELECT outcome,credits_captured FROM generation_cost_event")[0]
    assert (cost["outcome"], cost["credits_captured"]) == ("success", False)
    with db.begin() as c:
        c.execute(text("UPDATE tryon_result SET next_purge_at=clock_timestamp()"))
    assert run(tryon)
    assert row(db, "SELECT state FROM tryon_result")[0]["state"] == "deleted"
    assert [k for k in tryon.media.store.objects if k != _source(db)] == []


def test_pending_marker_survives_when_the_write_never_happens(client, db, tryon):
    tryon.media.store.before_put = lambda: (_ for _ in ()).throw(RuntimeError("crash"))
    submit(client, tryon)
    with pytest.raises(RuntimeError):
        run(tryon)
    assert row(db, "SELECT state FROM tryon_result")[0]["state"] == "deletion_pending"
    assert bal(db, tryon.media.uid)["consumed"] == 0


def test_transient_storage_error_on_put_is_retried(client, db, tryon):
    from glam_api.integrations.private_storage import StorageError

    calls = {"n": 0}
    real = tryon.media.store.put

    def flaky(key, content):
        calls["n"] += 1
        if calls["n"] == 1:
            raise StorageError("storage_unavailable", True)
        real(key, content)

    tryon.media.store.put = flaky
    job = finish(client, tryon)
    assert client.get(f"/v1/tryon/jobs/{job}").json()["state"] == "completed"


def test_cancel_queued_releases_and_late_dispatch_is_impossible(client, db, tryon):
    job = submit(client, tryon).json()["id"]
    r = client.delete(f"/v1/tryon/jobs/{job}")
    assert r.json()["state"] == "cancelled" and bal(db, tryon.media.uid)["available"] == 100
    assert not run(tryon) and tryon.provider.submits == 0
    assert client.delete(f"/v1/tryon/jobs/{job}").json()["state"] == "cancelled"


def test_cancel_during_provider_work_prevents_capture(client, db, tryon):
    job = submit(client, tryon).json()["id"]
    original = tryon.provider.poll

    def cancel_then_poll(pid):
        client.delete(f"/v1/tryon/jobs/{job}")
        return original(pid)

    tryon.provider.poll = cancel_then_poll
    run(tryon)
    b = bal(db, tryon.media.uid)
    assert (b["consumed"], b["held"], b["available"]) == (0, 0, 100)
    assert client.get(f"/v1/tryon/jobs/{job}").json()["state"] == "cancelled"
    assert row(db, "SELECT 1 FROM tryon_result") == [] or all(
        r["state"] != "stored" for r in row(db, "SELECT state FROM tryon_result")
    )
    cost = row(db, "SELECT credits_captured FROM generation_cost_event")
    assert cost and cost[0]["credits_captured"] is False


def test_owner_deletion_removes_result_but_credits_stay_consumed(client, db, tryon):
    job = finish(client, tryon)
    r = client.delete(f"/v1/tryon/jobs/{job}")
    assert r.json()["state"] == "expired" and r.json()["error_code"] == "tryon_deleted_by_owner"
    assert client.get(f"/v1/tryon/jobs/{job}/result").status_code == 410
    assert run(tryon)  # purge sweep
    assert [k for k in tryon.media.store.objects if k != _source(db)] == []
    assert bal(db, tryon.media.uid)["consumed"] == UNITS


def test_failed_purge_is_retried_with_backoff(client, db, tryon):
    job = finish(client, tryon)
    client.delete(f"/v1/tryon/jobs/{job}")
    tryon.media.store.fail_delete = True
    assert run(tryon)
    r = row(db, "SELECT state,purge_attempts FROM tryon_result")[0]
    assert (r["state"], r["purge_attempts"]) == ("deletion_pending", 1)
    tryon.media.store.fail_delete = False
    with db.begin() as c:
        c.execute(text("UPDATE tryon_result SET next_purge_at=clock_timestamp()"))
    assert run(tryon) and row(db, "SELECT state FROM tryon_result")[0]["state"] == "deleted"


def test_consent_withdrawal_erases_result_and_releases_pending_hold(client, db, tryon):
    done = finish(client, tryon)
    pending = submit(client, tryon).json()["id"]
    assert bal(db, tryon.media.uid)["held"] == UNITS
    assert (
        client.post(
            f"/v1/policies/{tryon.policy}/consent",
            json={"action": "withdrawn"},
            headers={"Idempotency-Key": str(uuid4())},
        ).status_code
        == 201
    )
    assert client.get(f"/v1/tryon/jobs/{done}/result").status_code == 410
    assert client.get(f"/v1/tryon/jobs/{pending}").json()["state"] == "expired"
    b = bal(db, tryon.media.uid)
    assert b["held"] == 0 and b["consumed"] == UNITS
    assert run(tryon)
    assert [k for k in tryon.media.store.objects if k != _source(db)] == []
    assert submit(client, tryon).status_code == 403


def test_worker_withdrawal_sweep_expires_without_a_read(client, db, tryon):
    from glam_api.worker import process_one as worker

    done = finish(client, tryon)
    client.post(
        f"/v1/policies/{tryon.policy}/consent",
        json={"action": "withdrawn"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    while worker(db):
        pass
    assert row(db, "SELECT state FROM tryon_job WHERE id=:i", i=done)[0]["state"] == "expired"


def test_photo_deletion_or_withdrawal_stops_dispatch(client, db, tryon):
    job = submit(client, tryon).json()["id"]
    withdraw(client, tryon.media)
    run(tryon)
    assert tryon.provider.submits == 0
    assert client.get(f"/v1/tryon/jobs/{job}").json()["state"] == "expired"
    assert bal(db, tryon.media.uid)["available"] == 100


def test_provider_never_receives_other_users_bytes_and_source_is_hash_checked(client, db, tryon):
    submit(client, tryon)
    tryon.media.store.objects[_source(db)] = b"tampered"
    run(tryon)
    assert tryon.provider.submits == 0


def test_no_private_content_in_audit_or_errors(client, db, tryon):
    job = finish(client, tryon)
    audit = " ".join(r["action"] for r in row(db, "SELECT action FROM audit_event"))
    assert "tryon.queued" in audit and "tryon.completed" in audit
    assert "Garden" not in audit and "linen" not in audit
    assert job


def test_credit_kinds_are_separate_by_construction(db):
    with db.begin() as c:
        c.execute(
            text("INSERT INTO app_user(id,issuer,subject) VALUES(:i,'https://t.invalid','x')"),
            {"i": uuid4()},
        )
    with pytest.raises(DBAPIError), db.begin() as c:
        c.execute(
            text(
                "INSERT INTO credit_account(user_id,credit_kind) "
                "SELECT id,'stay_credit' FROM app_user LIMIT 1"
            )
        )
    root = pathlib.Path(__file__).resolve().parents[1]
    pattern = re.compile(r"lifeswap|life_swap|stay[_ ]credit", re.I)
    offenders = [
        str(p)
        for base in ("services/api/src", "db/migrations", "apps/glam_mobile/lib")
        for p in (root / base).rglob("*")
        if p.is_file() and p.suffix in {".py", ".sql", ".dart"} and pattern.search(p.read_text())
    ]
    assert offenders == []


def test_cost_summary_view_and_private_grants(client, db, tryon):
    finish(client, tryon)
    r = row(db, "SELECT provider,outcome,synthetic_test,events FROM generation_cost_summary")
    assert [dict(x) for x in r] == [
        {
            "provider": "deterministic_test",
            "outcome": "success",
            "synthetic_test": True,
            "events": 1,
        }
    ]
    for table in ("tryon_job", "tryon_result", "generation_cost_event", "generation_price_rule"):
        for role in ("anon", "authenticated"):
            assert (
                row(db, "SELECT has_table_privilege(:r,:t,'SELECT') AS x", r=role, t=table)[0]["x"]
                is False
            )
