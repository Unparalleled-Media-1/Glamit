"""Professional services and bookings: role isolation, slot rules, no double booking."""

import threading
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from glam_api.main import app  # noqa: F401
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from test_workspaces import account, as_user, organization, qualify

ZONE = "Africa/Johannesburg"  # UTC+2, no DST: 09:00 local is 07:00 UTC


def service_body(**changes):
    return {
        "name": "Bridal makeup",
        "description": "",
        "duration_minutes": 60,
        "price_minor": 80000,
        "currency": "ZAR",
        **changes,
    }


def day_ahead(days=2):
    return (datetime.now(UTC) + timedelta(days=days)).date()


def slot(days=2, hour=9, minute=0):
    d = day_ahead(days)
    return datetime(d.year, d.month, d.day, hour - 2, minute, tzinfo=UTC)


def setup_provider(client, db, publish=True):
    owner = account(client, "pro")
    org = organization(client, db, owner, "professional")
    rules = [
        {"weekday": w, "start_minute": 540, "end_minute": 720, "timezone": ZONE} for w in range(7)
    ]
    assert (
        client.put(f"/v1/organizations/{org}/availability", json={"rules": rules}).status_code
        == 200
    )
    r = client.post(
        f"/v1/organizations/{org}/services",
        json=service_body(),
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    if publish:
        r = client.post(
            f"/v1/organizations/{org}/services/{sid}", json={**service_body(), "state": "published"}
        )
        assert r.status_code == 200, r.text
    return org, sid


def make_client(client, db, subject="client"):
    uid = account(client, subject)
    qualify(db, uid)
    as_user(subject)
    return uid


def request(client, sid, starts, key=None):
    return client.post(
        "/v1/bookings",
        json={"service_id": sid, "starts_at": starts.isoformat(), "note": "hello"},
        headers={"Idempotency-Key": key or str(uuid4())},
    )


def slots_for(client, org, sid, days=2):
    r = client.get(
        f"/v1/professionals/{org}/services/{sid}/slots", params={"day": str(day_ahead(days))}
    )
    assert r.status_code == 200, r.text
    return r.json()["slots"]


def test_only_the_organization_can_manage_services_and_availability(client, db):
    org, sid = setup_provider(client, db)
    account(client, "stranger")
    as_user("stranger")
    base = f"/v1/organizations/{org}"
    assert client.get(base + "/services").status_code == 404
    assert (
        client.post(
            base + "/services", json=service_body(), headers={"Idempotency-Key": "k"}
        ).status_code
        == 404
    )
    assert client.put(base + "/availability", json={"rules": []}).status_code == 404
    assert client.get(base + "/bookings").status_code == 404


def test_invalid_services_and_overlapping_rules_are_rejected(client, db):
    org, _ = setup_provider(client, db)
    as_user("pro")
    bad = client.post(
        f"/v1/organizations/{org}/services",
        json=service_body(duration_minutes=5),
        headers={"Idempotency-Key": "x"},
    )
    assert bad.status_code == 422
    rule = {"weekday": 1, "start_minute": 600, "end_minute": 700, "timezone": ZONE}
    overlap = [rule, {**rule, "start_minute": 650, "end_minute": 800}]
    assert (
        client.put(f"/v1/organizations/{org}/availability", json={"rules": overlap}).status_code
        == 422
    )
    unknown = [{**rule, "timezone": "Mars/Base"}]
    assert (
        client.put(f"/v1/organizations/{org}/availability", json={"rules": unknown}).status_code
        == 422
    )


def test_slots_follow_local_availability_and_duration(client, db):
    org, sid = setup_provider(client, db)
    make_client(client, db)
    found = slots_for(client, org, sid)
    # 09:00-12:00 local with a 60-minute service on a 15-minute grid: 09:00 .. 11:00 inclusive
    assert len(found) == 9
    assert found[0] == slot().isoformat().replace("+00:00", "Z")
    assert found[-1] == slot(hour=11).isoformat().replace("+00:00", "Z")


def test_unpublished_services_are_invisible_and_cannot_be_booked(client, db):
    org, sid = setup_provider(client, db, publish=False)
    make_client(client, db)
    assert client.get(f"/v1/professionals/{org}/services").json() == []
    assert (
        client.get(
            f"/v1/professionals/{org}/services/{sid}/slots", params={"day": str(day_ahead())}
        ).status_code
        == 404
    )
    assert request(client, sid, slot()).status_code == 404


def test_request_must_be_an_offered_slot_and_is_idempotent(client, db):
    org, sid = setup_provider(client, db)
    make_client(client, db)
    assert request(client, sid, slot(hour=8)).status_code == 409  # before opening hours
    assert request(client, sid, slot(minute=7)).status_code == 409  # off the grid
    assert request(client, sid, datetime.now(UTC) - timedelta(days=1)).status_code == 409
    key = str(uuid4())
    first = request(client, sid, slot(), key)
    again = request(client, sid, slot(), key)
    assert first.status_code == 201 and again.json() == first.json()
    assert first.json()["state"] == "requested"
    assert len(client.get("/v1/me/bookings").json()) == 1


def test_accepting_holds_the_slot_and_overlapping_requests_cannot_also_be_accepted(client, db):
    org, sid = setup_provider(client, db)
    make_client(client, db, "client-a")
    a = request(client, sid, slot()).json()["id"]
    make_client(client, db, "client-b")
    b = request(client, sid, slot(minute=30)).json()["id"]  # overlaps a by 30 minutes
    as_user("pro")
    accept = lambda bid: client.post(  # noqa: E731
        f"/v1/organizations/{org}/bookings/{bid}/decision", json={"decision": "accept"}
    )
    assert accept(a).status_code == 200
    clash = accept(b)
    assert clash.status_code == 409 and "holds this time" in clash.text
    assert (
        client.post(
            f"/v1/organizations/{org}/bookings/{b}/decision", json={"decision": "decline"}
        ).json()["state"]
        == "declined"
    )
    # The accepted booking removes those slots from what clients are offered.
    make_client(client, db, "client-c")
    offered = slots_for(client, org, sid)
    assert slot().isoformat().replace("+00:00", "Z") not in offered
    assert slot(hour=10).isoformat().replace("+00:00", "Z") in offered


def test_provider_cancel_frees_the_slot_and_states_cannot_skip(client, db):
    org, sid = setup_provider(client, db)
    make_client(client, db)
    bid = request(client, sid, slot()).json()["id"]
    as_user("pro")
    url = f"/v1/organizations/{org}/bookings/{bid}/decision"
    assert client.post(url, json={"decision": "complete"}).status_code == 409  # not accepted yet
    assert client.post(url, json={"decision": "accept"}).status_code == 200
    assert client.post(url, json={"decision": "accept"}).status_code == 409  # already decided
    assert client.post(url, json={"decision": "complete"}).status_code == 409  # not ended
    assert client.post(url, json={"decision": "cancel"}).json()["state"] == "cancelled"
    make_client(client, db, "client-2")
    assert slot().isoformat().replace("+00:00", "Z") in slots_for(client, org, sid)


def test_clients_see_and_cancel_only_their_own_bookings(client, db):
    org, sid = setup_provider(client, db)
    make_client(client, db, "client-a")
    bid = request(client, sid, slot()).json()["id"]
    make_client(client, db, "client-b")
    assert client.get("/v1/me/bookings").json() == []
    assert client.post(f"/v1/me/bookings/{bid}/cancel").status_code == 404
    as_user("client-a")
    assert client.post(f"/v1/me/bookings/{bid}/cancel").json()["state"] == "cancelled"
    assert client.post(f"/v1/me/bookings/{bid}/cancel").status_code == 409


def test_provider_sees_a_pseudonymous_client_reference_only(client, db):
    org, sid = setup_provider(client, db)
    uid = make_client(client, db)
    request(client, sid, slot())
    as_user("pro")
    row = client.get(f"/v1/organizations/{org}/bookings").json()[0]
    assert row["client_ref"] == uid[:8]
    assert not {"client_id", "email", "display_name"} & set(row)


def test_ineligible_accounts_cannot_book(client, db):
    org, sid = setup_provider(client, db)
    account(client, "minor")  # never qualified as an eligible adult
    as_user("minor")
    assert request(client, sid, slot()).status_code == 403


def test_database_constraint_forbids_overlapping_held_bookings(client, db):
    org, sid = setup_provider(client, db)
    uid = make_client(client, db)
    start = slot()

    def insert(c, offset, state):
        c.execute(
            text(
                "INSERT INTO booking(id,organization_id,service_id,client_id,starts_at,ends_at,"
                "state) "
                "VALUES (:id,:o,:s,:c,:a,:b,:st)"
            ),
            {
                "id": uuid4(), "o": org, "s": sid, "c": uid, "st": state,
                "a": start + timedelta(minutes=offset), "b": start + timedelta(minutes=offset + 60),
            },
        )  # fmt: skip

    with db.begin() as c:
        insert(c, 0, "accepted")
        insert(c, 30, "requested")  # requests never hold time, so overlap is allowed
        insert(c, 60, "accepted")  # touching, not overlapping
    with pytest.raises(IntegrityError), db.begin() as c:
        insert(c, 15, "accepted")


def test_two_providers_accepting_overlapping_requests_at_once_book_exactly_one(client, db):
    org, sid = setup_provider(client, db)
    make_client(client, db, "client-a")
    a = request(client, sid, slot()).json()["id"]
    make_client(client, db, "client-b")
    b = request(client, sid, slot(minute=15)).json()["id"]
    as_user("pro")
    results, barrier = [], threading.Barrier(2)

    def go(bid):
        barrier.wait()
        results.append(
            client.post(
                f"/v1/organizations/{org}/bookings/{bid}/decision", json={"decision": "accept"}
            ).status_code
        )

    threads = [threading.Thread(target=go, args=(x,)) for x in (a, b)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert sorted(results) == [200, 409]
    with db.begin() as c:
        assert c.scalar(text("SELECT count(*) FROM booking WHERE state='accepted'")) == 1
