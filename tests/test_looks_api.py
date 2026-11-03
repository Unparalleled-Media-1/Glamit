from uuid import uuid4

from glam_api.auth import Principal, get_principal
from glam_api.main import app
from glam_api.worker import process_one
from sqlalchemy import text

COMPONENT = {
    "key": "braiding",
    "category": "hair-service",
    "role": "service",
    "quantity_min": "1",
    "quantity_max": "1",
    "unit": "appointment",
}


def grant_consent(client, policy):
    response = client.post(
        f"/v1/policies/{policy}/consent",
        json={"action": "granted"},
        headers={"Idempotency-Key": "consent-1"},
    )
    assert response.status_code == 201, response.text


def test_consent_idempotent_revision_and_owner_isolation(client, policy, db):
    assert (
        client.post(
            "/v1/looks", json={"title": "Braids"}, headers={"Idempotency-Key": "look"}
        ).status_code
        == 403
    )
    grant_consent(client, policy)
    payload = {"title": "Braids"}
    headers = {"Idempotency-Key": "look"}
    look = client.post("/v1/looks", json=payload, headers=headers)
    assert look.status_code == 201, look.text
    assert client.post("/v1/looks", json=payload, headers=headers).json() == look.json()
    assert client.post("/v1/looks", json={"title": "Changed"}, headers=headers).status_code == 409
    look_id = look.json()["id"]
    route = f"/v1/looks/{look_id}/revisions"
    body = {"base_revision": 0, "components": [COMPONENT]}
    revision = client.post(route, json=body, headers={"Idempotency-Key": "revision-1"})
    assert revision.status_code == 201, revision.text
    assert (
        client.post(route, json=body, headers={"Idempotency-Key": "revision-1"}).json()
        == revision.json()
    )
    assert (
        client.post(route, json=body, headers={"Idempotency-Key": "revision-2"}).status_code == 412
    )
    result = client.get(f"{route}/1")
    assert result.status_code == 200
    assert result.json()["content_hash"] == revision.json()["content_hash"]
    app.dependency_overrides[get_principal] = lambda: Principal("https://test.invalid", "bob")
    assert client.get(f"{route}/1").status_code == 404
    assert client.delete(f"/v1/looks/{look_id}").status_code == 404
    with db.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM look_revision")) == 1


def test_no_fabricated_ai_or_sponsor_fields(client, policy):
    grant_consent(client, policy)
    response = client.post(
        "/v1/looks",
        json={"title": "Fake", "source_type": "ai_generated"},
        headers={"Idempotency-Key": "fake"},
    )
    assert response.status_code == 422
    look_id = client.post(
        "/v1/looks", json={"title": "Manual"}, headers={"Idempotency-Key": "manual"}
    ).json()["id"]
    for components in [
        [{**COMPONENT, "bid_minor": 999}],
        [{**COMPONENT, "quantity_max": "0"}],
        [COMPONENT, COMPONENT],
    ]:
        response = client.post(
            f"/v1/looks/{look_id}/revisions",
            json={"base_revision": 0, "components": components},
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert response.status_code == 422


def test_consent_withdrawal_blocks_writes_and_worker_deletes_private_data(client, policy, db):
    grant_consent(client, policy)
    look_id = client.post(
        "/v1/looks", json={"title": "Private"}, headers={"Idempotency-Key": "look"}
    ).json()["id"]
    assert (
        client.post(
            f"/v1/looks/{look_id}/revisions",
            json={"base_revision": 0, "components": [COMPONENT]},
            headers={"Idempotency-Key": "r"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/v1/policies/{policy}/consent",
            json={"action": "withdrawn"},
            headers={"Idempotency-Key": "withdraw"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/v1/looks", json={"title": "Denied"}, headers={"Idempotency-Key": "denied"}
        ).status_code
        == 403
    )
    assert process_one(db) is True
    assert process_one(db) is False
    assert client.get(f"/v1/looks/{look_id}/revisions/1").status_code == 404
    with db.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM look_revision")) == 0
        assert (
            connection.scalar(
                text("SELECT count(*) FROM idempotency_record WHERE route LIKE 'looks%'")
            )
            == 0
        )


def test_delete_removes_private_revisions(client, policy):
    grant_consent(client, policy)
    look_id = client.post(
        "/v1/looks", json={"title": "Delete"}, headers={"Idempotency-Key": "look"}
    ).json()["id"]
    assert client.delete(f"/v1/looks/{look_id}").status_code == 204
    assert client.get(f"/v1/looks/{look_id}/revisions/1").status_code == 404


def test_organization_membership_not_taken_from_client(client):
    headers = {"Idempotency-Key": "org"}
    result = client.post("/v1/organizations", json={"name": "Test salon"}, headers=headers)
    assert result.status_code == 201
    route = f"/v1/organizations/{result.json()['id']}"
    assert client.get(route).json()["role"] == "owner"
    app.dependency_overrides[get_principal] = lambda: Principal("https://test.invalid", "other")
    assert client.get(route).status_code == 404
    assert (
        client.post(
            "/v1/organizations", json={"name": "x", "role": "owner"}, headers=headers
        ).status_code
        == 422
    )
