"""Real isolated PostgreSQL workflow; provider/storage are explicit test doubles."""

from uuid import uuid4

import pytest
from glam_api.auth import Principal, get_principal
from glam_api.main import app
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_analysis_jobs import analysis as analysis
from test_analysis_jobs import run, submit
from test_private_media import media as media
from test_private_media import upload
from test_workspaces import as_user, qualify


@pytest.fixture
def passport(client, db, analysis):
    subject = uuid4()
    issuer = "https://bkkmsbxrxkqaveymcrgi.supabase.co/auth/v1"
    with db.begin() as c:
        c.execute(text("INSERT INTO auth.users(id) VALUES(:id)"), {"id": subject})
        c.execute(
            text("INSERT INTO profiles(id,display_name) VALUES(:id,'Fixture only')"),
            {"id": subject},
        )
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
    job = submit(client, analysis).json()["id"]
    assert run(db, analysis)
    analysis.job_id = job
    analysis.subject = subject
    analysis.issuer = issuer
    analysis.uid = uid
    return analysis


def correction(client, job, revision=0, values=None, key=None):
    return client.post(
        f"/v1/analysis/jobs/{job}/corrections",
        json={
            "expected_revision": revision,
            "corrections": values or {"face-shape": "My correction"},
        },
        headers={"Idempotency-Key": str(key or uuid4())},
    )


def select(client, p, revision=1, correction_revision=1):
    return client.put(
        "/v1/me/analysis-passport",
        json={
            "job_id": p.job_id,
            "expected_passport_revision": revision,
            "expected_correction_revision": correction_revision,
        },
    )


def test_correct_save_reopen_preserves_uncertainty_and_canonical_preferences(client, db, passport):
    p = passport
    empty = client.get("/v1/me/analysis-passport")
    assert empty.status_code == 200, empty.text
    assert empty.json()["analysis_state"] == "empty"
    with db.begin() as c:
        c.execute(
            text("UPDATE style_passports SET preferred_colors=ARRAY['rose'] WHERE profile_id=:id"),
            {"id": p.subject},
        )
    edited = correction(client, p.job_id)
    assert edited.status_code == 200, edited.text
    finding = edited.json()["findings"][0]
    assert finding == {
        "key": "face-shape",
        "ai_estimate": None,
        "ai_certainty": "unavailable",
        "uncertainty": "Explicit isolated test observation only",
        "user_correction": "My correction",
        "display_value": "My correction",
        "source": "user",
    }
    saved = select(client, p)
    assert saved.status_code == 200, saved.text
    assert saved.json()["revision"] == 2
    assert select(client, p).json() == saved.json()  # Idempotent desired-state replay.
    # New login/session and independent GET retrieve the database snapshot.
    session = uuid4()
    with db.begin() as c:
        c.execute(
            text("INSERT INTO auth.sessions(id,user_id) VALUES(:s,:u)"),
            {"s": session, "u": p.subject},
        )
    app.dependency_overrides[get_principal] = lambda: Principal(
        p.issuer, str(p.subject), session_id=str(session)
    )
    assert client.get("/v1/me/analysis-passport").json() == saved.json()
    assert correction(client, p.job_id, 1, {"face-shape": "New preference"}).status_code == 200
    # A later correction cannot silently alter the approved passport snapshot.
    assert client.get("/v1/me/analysis-passport").json()["analysis"]["corrections"] == {
        "face-shape": "My correction"
    }
    assert select(client, p, revision=2, correction_revision=1).status_code == 409
    assert select(client, p, revision=1, correction_revision=2).status_code == 409
    assert select(client, p, revision=2, correction_revision=2).json()["revision"] == 3
    with db.connect() as c:
        assert c.scalar(
            text("SELECT preferred_colors FROM style_passports WHERE profile_id=:u"),
            {"u": p.subject},
        ) == ["rose"]


def test_correction_CAS_idempotency_owner_and_bounds(client, db, passport):
    p = passport
    key = uuid4()
    first = correction(client, p.job_id, key=key)
    assert first.status_code == 200, first.text
    assert correction(client, p.job_id, key=key).json() == first.json()
    assert correction(client, p.job_id, values={"eyes": "different"}, key=key).status_code == 409
    assert correction(client, p.job_id).status_code == 409
    assert correction(client, p.job_id, 1, {"unknown": "bad"}).status_code == 422
    assert correction(client, p.job_id, 1, {"eyes": " "}).status_code == 422
    assert correction(client, p.job_id, 1, {"eyes": "x" * 241}).status_code == 422
    assert (
        client.post(f"/v1/analysis/jobs/{p.job_id}/corrections", content=b"x" * 16385).status_code
        == 413
    )
    as_user("other")
    assert client.get(f"/v1/analysis/jobs/{p.job_id}/corrected-report").status_code == 404
    assert correction(client, p.job_id).status_code == 404
    assert select(client, p).status_code == 404


@pytest.mark.parametrize("action", ["withdraw", "expire", "cancel", "delete_media"])
def test_privacy_redacts_corrections_unlinks_passport_without_erasing_preferences(
    client, db, passport, action
):
    p = passport
    assert correction(client, p.job_id).status_code == 200
    assert select(client, p).status_code == 200
    if action == "withdraw":
        assert (
            client.post(
                f"/v1/policies/{p.policy}/consent",
                json={"action": "withdrawn"},
                headers={"Idempotency-Key": str(uuid4())},
            ).status_code
            == 201
        )
    elif action == "expire":
        with db.begin() as c:
            c.execute(
                text(
                    "UPDATE analysis_job SET created_at=clock_timestamp()-interval '1 day', "
                    "expires_at=clock_timestamp()-interval '1 second' WHERE id=:id"
                ),
                {"id": p.job_id},
            )
    elif action == "cancel":
        assert client.delete(f"/v1/analysis/jobs/{p.job_id}").status_code == 200
    else:
        assert client.delete(f"/v1/media/{p.media_id}").status_code == 202
    reloaded = client.get("/v1/me/analysis-passport")
    assert reloaded.status_code == 200, reloaded.text
    assert reloaded.json()["analysis"] is None
    assert reloaded.json()["revision"] == 3
    with db.connect() as c:
        row = c.execute(
            text("SELECT corrections,redacted_at FROM analysis_correction WHERE job_id=:id"),
            {"id": p.job_id},
        ).one()
        assert row.corrections is None and row.redacted_at is not None
        assert c.scalar(text("SELECT count(*) FROM style_passport_analysis")) == 0
    # Regrant does not resurrect the old epoch or private payload.
    if action == "withdraw":
        client.post(
            f"/v1/policies/{p.policy}/consent",
            json={"action": "granted"},
            headers={"Idempotency-Key": str(uuid4())},
        )
    assert client.get(f"/v1/analysis/jobs/{p.job_id}/corrected-report").status_code in [409, 410]
    assert client.get("/v1/me/analysis-passport").json()["analysis"] is None


def test_RLS_immutable_corrections_and_empty_only_rollback(client, db, passport):
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from test_private_media_migration import migration

    assert correction(client, passport.job_id).status_code == 200
    assert select(client, passport).status_code == 200
    with db.connect() as c, c.begin():
        for table in ["analysis_correction", "style_passport_analysis"]:
            for role in ["anon", "authenticated"]:
                c.execute(text("SET LOCAL ROLE " + role))
                with pytest.raises(DBAPIError), c.begin_nested():
                    c.execute(text("SELECT * FROM " + table))
                c.execute(text("RESET ROLE"))
        for sql in [
            "UPDATE analysis_correction SET corrections='{}'",
            "DELETE FROM analysis_correction",
        ]:
            with pytest.raises(DBAPIError, match="immutable"), c.begin_nested():
                c.execute(text(sql))
        with Operations.context(MigrationContext.configure(c)):
            with pytest.raises(DBAPIError, match="empty registries"), c.begin_nested():
                migration("0017_analysis_passport").downgrade()


def test_concurrent_corrections_allow_one_revision_and_private_responses_are_not_cached(
    client, db, passport
):
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: correction(client, passport.job_id), range(2)))
    assert sorted(r.status_code for r in results) == [200, 409]
    response = client.get(f"/v1/analysis/jobs/{passport.job_id}/corrected-report")
    assert "no-store" in response.headers["cache-control"]
    assert "authorization" in response.headers["vary"].lower()
    assert response.json()["correction_revision"] == 1
    with db.connect() as c:
        assert c.scalar(text("SELECT count(*) FROM analysis_correction")) == 1


def test_other_canonical_passport_cannot_be_linked_to_owners_analysis(client, db, passport):
    p = passport
    other = uuid4()
    with db.begin() as c:
        c.execute(text("INSERT INTO auth.users(id) VALUES(:id)"), {"id": other})
        c.execute(text("INSERT INTO profiles(id) VALUES(:id)"), {"id": other})
        other_passport = c.scalar(
            text("INSERT INTO style_passports(profile_id) VALUES(:id) RETURNING id"), {"id": other}
        )
        with pytest.raises(DBAPIError, match="owner mismatch"), c.begin_nested():
            c.execute(
                text(
                    "INSERT INTO style_passport_analysis "
                    "(passport_id,owner_id,job_id,correction_revision) "
                    "VALUES(:p,:u,:j,0)"
                ),
                {"p": other_passport, "u": p.uid, "j": p.job_id},
            )


def test_empty_candidate_migration_rollback_reapplies_without_legacy_changes(db):
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from test_private_media_migration import migration

    with db.connect() as c:
        tx = c.begin()
        try:
            with Operations.context(MigrationContext.configure(c)):
                migration("0017_analysis_passport").downgrade()
                assert c.scalar(text("SELECT to_regclass('public.style_passports')")) is not None
                assert c.scalar(text("SELECT to_regclass('public.analysis_correction')")) is None
                migration("0017_analysis_passport").upgrade()
                assert (
                    c.scalar(text("SELECT to_regclass('public.analysis_correction')")) is not None
                )
        finally:
            tx.rollback()


def test_redacting_an_old_report_preserves_new_selected_snapshot(client, db, passport):
    p = passport
    old = p.job_id
    assert correction(client, old).status_code == 200
    assert select(client, p).status_code == 200
    p.job_id = submit(client, p).json()["id"]
    assert run(db, p)
    assert correction(client, p.job_id, values={"eyes": "New chosen snapshot"}).status_code == 200
    assert select(client, p, revision=2).status_code == 200
    assert client.delete(f"/v1/analysis/jobs/{old}").status_code == 200
    current = client.get("/v1/me/analysis-passport").json()
    assert current["revision"] == 3
    assert current["analysis"]["id"] == p.job_id
    assert current["analysis"]["corrections"] == {"eyes": "New chosen snapshot"}


def test_saved_passport_reads_and_privacy_sweeps_work_with_dispatch_disabled(
    client, db, passport, monkeypatch
):
    p = passport
    assert correction(client, p.job_id).status_code == 200
    assert select(client, p).status_code == 200
    monkeypatch.delenv("GLAM_ANALYSIS_ENABLED")
    assert client.get("/v1/me/analysis-passport").json()["analysis"]["id"] == p.job_id
    client.post(
        f"/v1/policies/{p.policy}/consent",
        json={"action": "withdrawn"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert run(db, p)
    with db.connect() as c:
        assert c.scalar(text("SELECT count(*) FROM style_passport_analysis")) == 0
        assert c.scalar(text("SELECT corrections FROM analysis_correction")) is None
