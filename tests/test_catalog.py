"""Real catalog transactions; fixtures are not live merchants, providers or inventory."""

import time
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from glam_api import catalog_jobs
from glam_api.auth import Principal, get_principal
from glam_api.catalog_contracts import Suggestions
from glam_api.catalog_jobs import process_ai_one, process_index_one
from glam_api.main import app
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from test_workspaces import account, as_user, organization, qualify


def facts(**changes):
    return {
        "title": "Test braiding extensions",
        "description": "Test-only merchant facts",
        "category": "hair",
        "tags": ["braids", "protective-style"],
        "source_sku": "SKU-1",
        "source_ref": "test-only-packaging",
        "currency": "ZAR",
        "price_minor": 10000,
        "shipping_minor": 2000,
        "tax_minor": 0,
        "other_costs_minor": 0,
        "stock_quantity": 5,
        "countries": ["ZA"],
        "offer_expires_at": (datetime.now(UTC) + timedelta(hours=12)).isoformat(),
        "purchase_url": "https://merchant.invalid/item",
        **changes,
    }


def req(**changes):
    return {
        "context": "hair",
        "category": "hair",
        "tags": ["braids"],
        "country": "ZA",
        "currency": "ZAR",
        **changes,
    }


def url(org, lid=""):
    return f"/v1/organizations/{org}/catalog/listings" + (f"/{lid}" if lid else "")


def create(client, db, workspace="merchant", **changes):
    uid = account(client, "merchant")
    org = organization(client, db, uid, workspace)
    # Trusted test-only policy evidence, never seeded into the running application's database.
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO market_policy_version(id,country,currency,capability,enabled,"
                "expires_at,policy_ref,reviewed_by) VALUES (:id,'ZA','ZAR',"
                "'catalog_discovery',true,now()+interval '1 day','test-only',:u)"
            ),
            {"id": uuid4(), "u": uid},
        )
    f = facts(**changes)
    r = client.post(url(org), json={"facts": f}, headers={"Idempotency-Key": "create"})
    assert r.status_code == 201, r.text
    return uid, org, r.json()["id"], f


def original(db, org, lid):
    mid = uuid4()
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO catalog_media(id,listing_id,organization_id,storage_ref,sha256,"
                "rights_confirmed,validated) VALUES (:id,:l,:o,'test-original',:sha,true,true)"
            ),
            {"id": mid, "l": lid, "o": org, "sha": "a" * 64},
        )
    return mid


def revise(client, org, lid, f, expected=1):
    return client.post(
        url(org, lid) + "/revisions",
        json={"facts": f, "expected_revision": expected, "merchant_reviewed": True},
        headers={"Idempotency-Key": str(uuid4())},
    )


def approve(client, db, lid, revision, decision="approved", identifier=False):
    uid = account(client, "reviewer")
    qualify(db, uid)
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO staff_grant(user_id,role,expires_at,evidence_ref) VALUES "
                "(:u,'content_moderation',now()+interval '1 day','test-only') "
                "ON CONFLICT DO NOTHING"
            ),
            {"u": uid},
        )
    app.dependency_overrides[get_principal] = lambda: Principal(
        "https://test.invalid", "reviewer", "aal2", int(time.time())
    )
    r = client.post(
        f"/v1/admin/catalog/{lid}/revisions/{revision}/review",
        json={"decision": decision, "identifier_verified": identifier},
        headers={"Idempotency-Key": str(uuid4())},
    )
    as_user("merchant")
    return r


def publish(client, org, lid, revision=2):
    return client.post(url(org, lid) + "/publish", json={"revision": revision})


def drain(db):
    while process_index_one(db):
        pass


def ready(client, db, identifier=False, **changes):
    uid, org, lid, f = create(client, db, **changes)
    original(db, org, lid)
    assert revise(client, org, lid, f).status_code == 200
    assert approve(client, db, lid, 2, identifier=identifier).status_code == 200
    assert publish(client, org, lid).status_code == 200
    drain(db)
    return uid, org, lid, f


def test_review_publish_match_detail_and_withdraw_are_real_transactions(client, db):
    _, org, lid, f = create(client, db)
    assert publish(client, org, lid, 1).status_code == 409
    assert revise(client, org, lid, f).status_code == 200
    assert approve(client, db, lid, 2, identifier=True).status_code == 200
    assert publish(client, org, lid).status_code == 409  # No validated image.
    original(db, org, lid)
    assert publish(client, org, lid).status_code == 200
    assert client.post("/v1/recommendations/matches", json=req()).json()["organic"] == []
    drain(db)
    matches = client.post(
        "/v1/recommendations/matches", json=req(source_sku="SKU-1", source_organization_id=org)
    ).json()
    assert matches["organic"][0]["match_type"] == "Exact"
    assert matches["organic"][0]["delivered_total_minor"] == 12000
    assert matches["sponsored"] == []
    assert client.post(f"/v1/recommendations/listings/{lid}", json=req()).status_code == 200
    assert client.post(url(org, lid) + "/withdraw").status_code == 200
    # Stale index still exists, but authoritative publication prevents a match immediately.
    assert client.post("/v1/recommendations/matches", json=req()).json()["organic"] == []
    assert client.post(f"/v1/recommendations/listings/{lid}", json=req()).status_code == 404
    with db.begin() as c:
        c.execute(
            text("UPDATE outbox_event SET delivered_at=NULL WHERE event_type='catalog.changed.v1'")
        )
    drain(db)
    with db.connect() as c:
        assert c.scalar(text("SELECT count(*) FROM catalog_projection")) == 0


@pytest.mark.parametrize(
    "change",
    [
        {"country": "US"},
        {"currency": "USD"},
        {"tags": ["unrelated"]},
        {"tags": ["braids", "wrong-shade"]},
        {"budget_minor": 11999},
    ],
)
def test_context_region_currency_relevance_and_whole_cost_eligibility(client, db, change):
    ready(client, db)
    assert client.post("/v1/recommendations/matches", json=req(**change)).json()["organic"] == []


@pytest.mark.parametrize(
    "change",
    [
        {"stock_quantity": 0},
        {"shipping_minor": None},
        {"offer_expires_at": (datetime.now(UTC) - timedelta(hours=1)).isoformat()},
    ],
)
def test_no_out_of_stock_or_fabricated_delivered_total(client, db, change):
    if "offer_expires_at" in change:
        _, org, lid, f = create(client, db, **change)
        original(db, org, lid)
        assert revise(client, org, lid, f).status_code == 200
        assert approve(client, db, lid, 2).status_code == 200
        assert publish(client, org, lid).status_code == 409
        return
    _, org, lid, f = ready(client, db, **change)
    result = client.post("/v1/recommendations/matches", json=req()).json()["organic"]
    if change.get("stock_quantity") == 0:
        assert result == []
    else:
        assert result[0]["delivered_total_minor"] is None
        assert (
            client.post("/v1/recommendations/matches", json=req(budget_minor=999999)).json()[
                "organic"
            ]
            == []
        )


def test_revision_invalidates_publication_rejected_content_rollback_and_expired_source(client, db):
    _, org, lid, f = ready(client, db)
    assert (
        client.post("/v1/recommendations/matches", json=req(source_sku="SKU-1")).json()["organic"][
            0
        ]["match_type"]
        == "Similar"
    )
    assert revise(client, org, lid, {**f, "title": "Revised"}, 2).status_code == 200
    assert client.post("/v1/recommendations/matches", json=req()).json()["organic"] == []
    assert publish(client, org, lid, 2).status_code == 409
    assert approve(client, db, lid, 3, decision="rejected").status_code == 200
    assert publish(client, org, lid, 3).status_code == 409
    rollback = client.post(url(org, lid) + "/rollback", json={"revision": 2})
    assert rollback.status_code == 200
    assert rollback.json()["current_revision"] == 4
    assert rollback.json()["state"] == "draft"
    assert publish(client, org, lid, 4).status_code == 409
    assert approve(client, db, lid, 4).status_code == 200
    assert publish(client, org, lid, 4).status_code == 200
    drain(db)
    assert client.post("/v1/recommendations/matches", json=req()).json()["organic"]


def test_tenant_readonly_duplicate_and_unsafe_facts(client, db):
    uid, org, lid, f = create(client, db)
    same = client.post(url(org), json={"facts": f}, headers={"Idempotency-Key": "create"})
    assert same.json()["id"] == lid
    assert (
        client.post(
            url(org), json={"facts": f}, headers={"Idempotency-Key": "duplicate"}
        ).status_code
        == 409
    )
    assert (
        client.post(
            url(org),
            json={"facts": {**f, "source_sku": "SKU-2", "purchase_url": "http://unsafe.invalid"}},
            headers={"Idempotency-Key": "unsafe"},
        ).status_code
        == 422
    )
    assert revise(client, org, lid, {**f, "source_sku": "different"}).status_code == 422
    assert (
        client.post(
            f"/v1/admin/catalog/{lid}/revisions/1/review",
            json={"decision": "approved"},
            headers={"Idempotency-Key": "self-approve"},
        ).status_code
        == 403
    )
    as_user("outsider")
    assert client.get(url(org, lid)).status_code == 404
    assert client.get(url(org)).status_code == 404
    assert client.post(url(org, lid) + "/withdraw").status_code == 404
    as_user("merchant")
    with db.begin() as c:
        c.execute(
            text("UPDATE organization_members SET role='analyst' WHERE organization_id=:o"),
            {"o": org},
        )
        c.execute(
            text("INSERT INTO workspace_role VALUES (:o,:u,'merchant','analyst')"),
            {"o": org, "u": uid},
        )
    assert client.get(url(org, lid)).status_code == 200
    assert revise(client, org, lid, f).status_code == 403


def test_source_suspension_and_unknown_age_hide_previously_indexed_listing(client, db):
    uid, org, lid, f = ready(client, db)
    with db.begin() as c:
        c.execute(text("UPDATE organizations SET suspended=true WHERE id=:o"), {"o": org})
    assert client.post("/v1/recommendations/matches", json=req()).json()["organic"] == []
    as_user("unverified")
    result = client.post("/v1/recommendations/matches", json=req()).json()
    assert result["organic"] == [] and result["sponsored"] == []


def test_private_saved_requirements_delete_tombstones_and_no_advertiser_data(client, db):
    account(client, "consumer")
    r = client.post("/v1/me/saved-requirements", json=req(), headers={"Idempotency-Key": "save"})
    assert r.status_code == 201
    sid = r.json()["id"]
    as_user("advertiser")
    assert client.get("/v1/me/saved-requirements").json() == []
    assert client.delete(f"/v1/me/saved-requirements/{sid}").status_code == 404
    as_user("consumer")
    assert client.delete(f"/v1/me/saved-requirements/{sid}").status_code == 204
    assert (
        client.post(
            "/v1/me/saved-requirements", json=req(), headers={"Idempotency-Key": "save"}
        ).status_code
        == 410
    )
    assert (
        client.post(
            "/v1/recommendations/matches", json={**req(), "face_image": "forbidden"}
        ).status_code
        == 422
    )


class TestOnlyProvider:
    __test__ = False
    name = "test-only-provider"
    qualified = True

    def __init__(self):
        self.calls = []

    def prepare(self, facts, originals, features, idempotency_key):
        self.calls.append(idempotency_key)
        return Suggestions(
            completed_features=features,
            title="Test suggestion",
            description="Test-only draft suggestion",
            tags=["braids"],
            warnings=["Merchant must verify all facts"],
        )


def enhancement(client, org, lid):
    return client.post(
        url(org, lid) + "/enhancements",
        json={"expected_revision": 1, "features": ["description"]},
        headers={"Idempotency-Key": "job"},
    )


def test_ai_provider_missing_does_not_queue_or_consume_credits(client, db):
    _, org, lid, _ = create(client, db)
    assert enhancement(client, org, lid).status_code == 503
    with db.connect() as c:
        assert c.scalar(text("SELECT count(*) FROM catalog_ai_job")) == 0
        assert c.scalar(text("SELECT count(*) FROM credit_reservation")) == 0


def test_ai_preparation_idempotency_and_suggestions_never_overwrite_facts(client, db, monkeypatch):
    _, org, lid, f = create(client, db)
    original(db, org, lid)
    adapter = TestOnlyProvider()
    monkeypatch.setattr(catalog_jobs, "_adapter", adapter)
    first = enhancement(client, org, lid)
    assert first.status_code == 201
    assert enhancement(client, org, lid).json()["id"] == first.json()["id"]
    assert process_ai_one(db) is True
    assert process_ai_one(db) is False
    job = client.get(url(org, lid) + "/enhancements/" + first.json()["id"]).json()
    assert job["state"] == "review_ready"
    assert job["suggestions"]["title"] == "Test suggestion"
    assert client.get(url(org, lid)).json()["facts"]["title"] == f["title"]
    assert client.get(url(org, lid)).json()["merchant_reviewed"] is False
    assert adapter.calls == [first.json()["id"]]


def test_stale_and_revoked_jobs_cannot_apply_suggestions(client, db, monkeypatch):
    _, org, lid, f = create(client, db)
    original(db, org, lid)
    adapter = TestOnlyProvider()
    monkeypatch.setattr(catalog_jobs, "_adapter", adapter)
    jid = enhancement(client, org, lid).json()["id"]
    assert revise(client, org, lid, f).status_code == 200
    process_ai_one(db)
    assert client.get(url(org, lid) + "/enhancements/" + jid).json()["state"] == "cancelled"
    assert adapter.calls == []


def test_catalog_rls_and_immutable_revisions(client, db):
    _, org, lid, f = create(client, db)
    with pytest.raises(DBAPIError), db.begin() as c:
        c.execute(text("UPDATE catalog_revision SET facts='{}' WHERE listing_id=:id"), {"id": lid})
    tables = [
        "catalog_listing",
        "catalog_revision",
        "catalog_approval",
        "catalog_media",
        "catalog_projection",
        "catalog_ai_job",
        "saved_requirement",
        "market_policy_version",
    ]
    with db.begin() as c:
        c.execute(
            text(
                """DO $$ BEGIN
                    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='glam_catalog_probe') THEN
                        CREATE ROLE glam_catalog_probe NOLOGIN;
                    END IF;
                END $$;"""
            )
        )
        for table in tables:
            c.execute(text(f"GRANT SELECT ON {table} TO glam_catalog_probe"))
        c.execute(text("SET LOCAL ROLE glam_catalog_probe"))
        for table in tables:
            assert c.scalar(text(f"SELECT count(*) FROM {table}")) == 0


def test_professional_matches_require_service_capability_and_never_confirm_booking(client, db):
    uid, org, lid, f = create(
        client,
        db,
        workspace="professional",
        category="service",
        stock_quantity=0,
        accepting_requests=True,
    )
    original(db, org, lid)
    assert revise(client, org, lid, f).status_code == 200
    assert approve(client, db, lid, 2).status_code == 200
    assert publish(client, org, lid).status_code == 200
    drain(db)
    result = client.post("/v1/recommendations/matches", json=req(category="service")).json()
    assert result["organic"][0]["service_quote_required"] is True
    assert result["organic"][0]["delivered_total_minor"] is None
    assert (
        client.post("/v1/recommendations/matches", json={**req(), "bid_minor": 999999}).status_code
        == 422
    )


def test_validated_media_revocation_immediately_removes_match(client, db):
    _, org, lid, f = ready(client, db)
    with db.begin() as c:
        c.execute(text("UPDATE catalog_media SET validated=false WHERE listing_id=:l"), {"l": lid})
    assert client.post("/v1/recommendations/matches", json=req()).json()["organic"] == []


def test_ai_derivative_keeps_original_separate_and_requires_factual_review(client, db, monkeypatch):
    _, org, lid, f = create(client, db)
    mid = original(db, org, lid)

    class ImageTestProvider(TestOnlyProvider):
        def prepare(self, facts, originals, features, idempotency_key):
            return Suggestions(
                completed_features=features,
                title="Test suggestion",
                description="Not a product fact",
                tags=["braids"],
                warnings=["Human image review required"],
                derivatives=[
                    {
                        "original_id": mid,
                        "storage_ref": "test-derivative-distinct",
                        "sha256": "b" * 64,
                        "advertising": True,
                    }
                ],
            )

    monkeypatch.setattr(catalog_jobs, "_adapter", ImageTestProvider())
    response = client.post(
        url(org, lid) + "/enhancements",
        json={"expected_revision": 1, "features": ["advertising"]},
        headers={"Idempotency-Key": "image"},
    )
    assert response.status_code == 201
    process_ai_one(db)
    with db.connect() as c:
        original_row = c.execute(
            text("SELECT storage_ref,sha256 FROM catalog_media WHERE id=:id"), {"id": mid}
        ).one()
        assert original_row.storage_ref == "test-original" and original_row.sha256 == "a" * 64
        derivative = c.execute(
            text("SELECT validated,generated_advertising FROM catalog_media WHERE original_id=:id"),
            {"id": mid},
        ).one()
        assert derivative.validated is False and derivative.generated_advertising is True
    assert publish(client, org, lid, 1).status_code == 409


@pytest.mark.parametrize("failure", ["provider_error", "overwrite_original", "missing_derivative"])
def test_provider_failures_cannot_modify_original_or_publish_claims(
    client, db, monkeypatch, failure
):
    _, org, lid, f = create(client, db)
    mid = original(db, org, lid)

    class InvalidTestProvider(TestOnlyProvider):
        def prepare(self, facts, originals, features, idempotency_key):
            if failure == "provider_error":
                raise RuntimeError("sensitive-provider-error-do-not-store")
            data = {
                "completed_features": features,
                "title": "Unverified",
                "description": "Do not publish",
                "tags": ["braids"],
                "warnings": ["Review required"],
            }
            if failure == "overwrite_original":
                data["derivatives"] = [
                    {"original_id": mid, "storage_ref": "test-original", "sha256": "c" * 64}
                ]
            return Suggestions(**data)

    monkeypatch.setattr(catalog_jobs, "_adapter", InvalidTestProvider())
    response = client.post(
        url(org, lid) + "/enhancements",
        json={"expected_revision": 1, "features": ["background"]},
        headers={"Idempotency-Key": "invalid"},
    )
    assert response.status_code == 201
    process_ai_one(db)
    job = client.get(url(org, lid) + "/enhancements/" + response.json()["id"]).json()
    assert job["state"] == "failed" and job["suggestions"] is None
    assert client.get(url(org, lid)).json()["facts"]["title"] == f["title"]
    assert client.get(url(org, lid)).json()["facts"]["description"] == f["description"]
    with db.connect() as c:
        assert c.scalar(text("SELECT count(*) FROM catalog_media")) == 1


def test_inflight_revocation_discards_provider_output(client, db, monkeypatch):
    _, org, lid, f = create(client, db)
    original(db, org, lid)

    class RevokingTestProvider(TestOnlyProvider):
        def prepare(self, facts, originals, features, idempotency_key):
            with db.begin() as c:
                c.execute(text("UPDATE organizations SET suspended=true WHERE id=:id"), {"id": org})
            return super().prepare(facts, originals, features, idempotency_key)

    monkeypatch.setattr(catalog_jobs, "_adapter", RevokingTestProvider())
    response = enhancement(client, org, lid)
    assert response.status_code == 201
    process_ai_one(db)
    with db.connect() as c:
        row = c.execute(
            text("SELECT state,suggestions FROM catalog_ai_job WHERE id=:id"),
            {"id": response.json()["id"]},
        ).one()
        assert row.state == "cancelled" and row.suggestions is None


def test_source_sku_is_scoped_and_does_not_prove_identity_across_merchants(client, db):
    _, first_org, first_lid, _ = ready(client, db, identifier=True)
    _, second_org, second_lid, _ = ready(client, db, identifier=True)
    response = client.post(
        "/v1/recommendations/matches",
        json=req(source_sku="SKU-1", source_organization_id=first_org),
    ).json()["organic"]
    assert response[0]["listing_id"] == first_lid and response[0]["match_type"] == "Exact"
    assert next(r for r in response if r["listing_id"] == second_lid)["match_type"] == "Similar"
    unscoped = client.post("/v1/recommendations/matches", json=req(source_sku="SKU-1")).json()[
        "organic"
    ]
    assert all(r["match_type"] == "Similar" for r in unscoped)


def test_publication_requires_bounded_fresh_source_evidence(client, db):
    _, org, lid, f = create(
        client, db, offer_expires_at=(datetime.now(UTC) + timedelta(days=30)).isoformat()
    )
    original(db, org, lid)
    assert revise(client, org, lid, f).status_code == 200
    assert approve(client, db, lid, 2).status_code == 200
    assert publish(client, org, lid).status_code == 409


def test_bulk_creation_is_atomic_and_idempotent_with_duplicate_protection(client, db):
    uid = account(client, "merchant")
    org = organization(client, db, uid)
    batch = {
        "listings": [{"facts": facts(source_sku="BULK-1")}, {"facts": facts(source_sku="BULK-2")}]
    }
    response = client.post(url(org) + "/bulk", json=batch, headers={"Idempotency-Key": "bulk"})
    assert response.status_code == 201
    assert (
        client.post(url(org) + "/bulk", json=batch, headers={"Idempotency-Key": "bulk"}).json()
        == response.json()
    )
    broken = {
        "listings": [{"facts": facts(source_sku="BULK-3")}, {"facts": facts(source_sku="BULK-1")}]
    }
    assert (
        client.post(
            url(org) + "/bulk", json=broken, headers={"Idempotency-Key": "broken-bulk"}
        ).status_code
        == 409
    )
    with db.connect() as c:
        assert c.scalar(text("SELECT count(*) FROM catalog_listing")) == 2


def test_bulk_publication_rolls_back_if_any_revision_is_unapproved(client, db, monkeypatch):
    _, org, lid, f = create(client, db)
    original(db, org, lid)
    assert revise(client, org, lid, f).status_code == 200
    assert approve(client, db, lid, 2).status_code == 200
    from glam_api import catalog

    # Ensure a successful publication precedes the failure in stable UUID lock order.
    with monkeypatch.context() as patch:
        patch.setattr(catalog, "uuid4", lambda: UUID(int=(1 << 128) - 1))
        second = client.post(
            url(org),
            json={"facts": facts(source_sku="UNREVIEWED")},
            headers={"Idempotency-Key": "second"},
        ).json()["id"]
    response = client.post(
        f"/v1/organizations/{org}/catalog/publish-bulk",
        json={
            "listings": [{"listing_id": lid, "revision": 2}, {"listing_id": second, "revision": 1}]
        },
    )
    assert response.status_code == 409
    assert client.get(url(org, lid)).json()["state"] == "draft"
    assert client.get(url(org, second)).json()["state"] == "draft"


def test_rental_obligations_cannot_be_bypassed_with_item_price_only(client, db):
    _, org, lid, f = create(client, db, condition="rental")
    original(db, org, lid)
    assert revise(client, org, lid, f).status_code == 200
    assert approve(client, db, lid, 2).status_code == 200
    assert publish(client, org, lid).status_code == 409


def test_unknown_additional_costs_do_not_become_a_firm_delivered_total(client, db):
    ready(client, db, condition="used", other_costs_minor=None)
    result = client.post("/v1/recommendations/matches", json=req()).json()["organic"][0]
    assert result["condition"] == "used" and result["delivered_total_minor"] is None
    assert (
        client.post("/v1/recommendations/matches", json=req(budget_minor=999999)).json()["organic"]
        == []
    )


def test_latest_disabled_market_version_overrides_an_earlier_enabled_policy(client, db):
    uid, org, lid, f = ready(client, db)
    assert client.post("/v1/recommendations/matches", json=req()).json()["organic"]
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO market_policy_version(id,country,currency,capability,enabled,"
                "expires_at,policy_ref,reviewed_by) VALUES (:id,'ZA','ZAR',"
                "'catalog_discovery',false,now()+interval '1 day','test-disable',:u)"
            ),
            {"id": uuid4(), "u": uid},
        )
    result = client.post("/v1/recommendations/matches", json=req()).json()
    assert result["organic"] == [] and result["sponsored"] == []


def test_expired_ai_lease_retries_with_the_same_provider_idempotency_key(client, db, monkeypatch):
    _, org, lid, f = create(client, db)
    original(db, org, lid)
    adapter = TestOnlyProvider()
    monkeypatch.setattr(catalog_jobs, "_adapter", adapter)
    response = enhancement(client, org, lid)
    assert response.status_code == 201
    jid = response.json()["id"]
    with db.begin() as c:
        c.execute(
            text(
                "UPDATE catalog_ai_job SET state='processing',lease_token=:lease,"
                "lease_until=now()-interval '1 second',attempts=1 WHERE id=:id"
            ),
            {"lease": uuid4(), "id": jid},
        )
    assert process_ai_one(db) is True
    assert adapter.calls == [jid]
    with db.connect() as c:
        result = c.execute(
            text("SELECT state,attempts FROM catalog_ai_job WHERE id=:id"), {"id": jid}
        ).one()
        assert result.state == "review_ready" and result.attempts == 2


def test_stale_worker_response_cannot_overwrite_another_lease(client, db, monkeypatch):
    _, org, lid, f = create(client, db)
    original(db, org, lid)
    replacement = uuid4()

    class ReplacedLeaseProvider(TestOnlyProvider):
        def prepare(self, facts, originals, features, idempotency_key):
            with db.begin() as c:
                c.execute(
                    text("UPDATE catalog_ai_job SET lease_token=:lease WHERE id=:id"),
                    {"lease": replacement, "id": idempotency_key},
                )
            return super().prepare(facts, originals, features, idempotency_key)

    monkeypatch.setattr(catalog_jobs, "_adapter", ReplacedLeaseProvider())
    response = enhancement(client, org, lid)
    assert response.status_code == 201
    assert process_ai_one(db) is True
    with db.connect() as c:
        result = c.execute(
            text("SELECT state,lease_token,suggestions FROM catalog_ai_job WHERE id=:id"),
            {"id": response.json()["id"]},
        ).one()
        assert (
            result.state == "processing"
            and result.lease_token == replacement
            and result.suggestions is None
        )
