"""Professional services, weekly availability and bookings (candidate migration 0019)."""

from datetime import UTC, date, datetime, timedelta
from typing import Literal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException
from pydantic import AwareDatetime, Field, field_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from glam_api.workspaces import Db, Identity, Key, Strict, authorize, eligible

GRID_MINUTES = 15
HORIZON_DAYS = 60
Currency = Literal["ZAR", "USD", "EUR", "GBP"]


class ServiceIn(Strict):
    name: str = Field(min_length=1, max_length=120, pattern=r".*\S.*")
    description: str = Field(default="", max_length=2000)
    duration_minutes: int = Field(strict=True, ge=15, le=480)
    price_minor: int = Field(strict=True, ge=0, le=100000000000)
    currency: Currency


class ServiceChange(ServiceIn):
    state: Literal["draft", "published", "archived"]


class Rule(Strict):
    weekday: int = Field(strict=True, ge=0, le=6)
    start_minute: int = Field(strict=True, ge=0, le=1439)
    end_minute: int = Field(strict=True, ge=1, le=1440)
    timezone: str = Field(min_length=1, max_length=64)

    @field_validator("timezone")
    @classmethod
    def known_zone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Unknown timezone") from None
        return value


class Availability(Strict):
    rules: list[Rule] = Field(max_length=50)

    @field_validator("rules")
    @classmethod
    def valid(cls, rules):
        for r in rules:
            if r.end_minute <= r.start_minute:
                raise ValueError("A rule must end after it starts")
        keyed = sorted(rules, key=lambda r: (r.timezone, r.weekday, r.start_minute))
        for a, b in zip(keyed, keyed[1:], strict=False):
            if (a.timezone, a.weekday) == (b.timezone, b.weekday) and b.start_minute < a.end_minute:
                raise ValueError("Availability rules must not overlap")
        return rules


class BookingRequest(Strict):
    service_id: UUID
    starts_at: AwareDatetime
    note: str = Field(default="", max_length=500)


class Decision(Strict):
    decision: Literal["accept", "decline", "complete", "cancel"]


TRANSITIONS = {
    "draft": {"published", "archived"},
    "published": {"draft", "archived"},
    "archived": set(),
}
SERVICE_COLS = "id,organization_id,name,description,duration_minutes,price_minor,currency,state"
PREFIXED_COLS = ",".join("s." + c for c in SERVICE_COLS.split(","))


def iso(value):
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def service_row(r):
    return {
        "id": str(r["id"]),
        "organization_id": str(r["organization_id"]),
        "name": r["name"],
        "description": r["description"],
        "duration_minutes": r["duration_minutes"],
        "price_minor": r["price_minor"],
        "currency": r["currency"],
        "state": r["state"],
    }


def generate_slots(db, org, duration, day: date, now=None):
    """Bookable start times on a local calendar day, minus held (accepted/completed) bookings."""
    now = now or datetime.now(UTC)
    rules = db.execute(
        text(
            "SELECT weekday,start_minute,end_minute,timezone FROM availability_rule "
            "WHERE organization_id=:o AND weekday=:w ORDER BY start_minute"
        ),
        {"o": org, "w": day.weekday()},
    ).mappings()
    slots = []
    for rule in rules:
        zone = ZoneInfo(rule["timezone"])
        midnight = datetime(day.year, day.month, day.day, tzinfo=zone)
        minute = rule["start_minute"]
        while minute + duration <= rule["end_minute"]:
            start = (midnight + timedelta(minutes=minute)).astimezone(UTC)
            if start > now:
                slots.append(start)
            minute += GRID_MINUTES
    if not slots:
        return []
    held = db.execute(
        text(
            "SELECT starts_at,ends_at FROM booking WHERE organization_id=:o "
            "AND state IN ('accepted','completed') AND starts_at<:hi AND ends_at>:lo"
        ),
        {"o": org, "lo": min(slots), "hi": max(slots) + timedelta(minutes=duration)},
    ).all()
    span = timedelta(minutes=duration)
    return [s for s in sorted(set(slots)) if not any(h[0] < s + span and h[1] > s for h in held)]


def build_booking_router(user, audit, replay, remember):
    router = APIRouter()

    def provider(db, identity, org, write=False):
        uid = user(db, identity)
        authorize(db, uid, org, "professional", write=write)
        return uid

    def get_service(db, org, sid, lock=False):
        row = (
            db.execute(
                text(
                    f"SELECT {SERVICE_COLS} FROM professional_service WHERE id=:id "
                    f"AND organization_id=:o{' FOR UPDATE' if lock else ''}"
                ),
                {"id": sid, "o": org},
            )
            .mappings()
            .first()
        )
        if not row:
            raise HTTPException(404, "Service not available")
        return row

    # ---- provider: services -------------------------------------------------
    @router.post("/v1/organizations/{org}/services", status_code=201)
    def create_service(org: UUID, body: ServiceIn, db: Db, identity: Identity, key: Key):
        uid = provider(db, identity, org, write=True)
        route = f"services/{org}"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            return result
        sid = uuid4()
        db.execute(
            text(
                "INSERT INTO professional_service(id,organization_id,name,description,"
                "duration_minutes,price_minor,currency) VALUES (:id,:o,:name,:description,"
                ":duration_minutes,:price_minor,:currency)"
            ),
            {"id": sid, "o": org, **payload},
        )
        audit(db, uid, "service.created", sid)
        return remember(db, uid, route, key, payload, service_row(get_service(db, org, sid)))

    @router.get("/v1/organizations/{org}/services")
    def list_services(org: UUID, db: Db, identity: Identity):
        provider(db, identity, org)
        rows = db.execute(
            text(
                f"SELECT {SERVICE_COLS} FROM professional_service WHERE organization_id=:o "
                "ORDER BY created_at DESC,id LIMIT 200"
            ),
            {"o": org},
        ).mappings()
        return [service_row(r) for r in rows]

    @router.post("/v1/organizations/{org}/services/{sid}")
    def change_service(org: UUID, sid: UUID, body: ServiceChange, db: Db, identity: Identity):
        uid = provider(db, identity, org, write=True)
        current = get_service(db, org, sid, lock=True)
        if body.state != current["state"] and body.state not in TRANSITIONS[current["state"]]:
            raise HTTPException(409, f"A {current['state']} service cannot become {body.state}")
        if current["state"] == "archived":
            raise HTTPException(409, "Archived services cannot be edited")
        db.execute(
            text(
                "UPDATE professional_service SET name=:name,description=:description,"
                "duration_minutes=:duration_minutes,price_minor=:price_minor,currency=:currency,"
                "state=:state,updated_at=clock_timestamp() WHERE id=:id"
            ),
            {"id": sid, **body.model_dump()},
        )
        audit(db, uid, f"service.{body.state}", sid)
        return service_row(get_service(db, org, sid))

    # ---- provider: availability --------------------------------------------
    @router.get("/v1/organizations/{org}/availability")
    def get_availability(org: UUID, db: Db, identity: Identity):
        provider(db, identity, org)
        rows = db.execute(
            text(
                "SELECT weekday,start_minute,end_minute,timezone FROM availability_rule "
                "WHERE organization_id=:o ORDER BY weekday,start_minute"
            ),
            {"o": org},
        ).mappings()
        return {"rules": [dict(r) for r in rows]}

    @router.put("/v1/organizations/{org}/availability")
    def put_availability(org: UUID, body: Availability, db: Db, identity: Identity):
        uid = provider(db, identity, org, write=True)
        db.execute(text("DELETE FROM availability_rule WHERE organization_id=:o"), {"o": org})
        for rule in body.rules:
            db.execute(
                text(
                    "INSERT INTO availability_rule(id,organization_id,weekday,start_minute,"
                    "end_minute,timezone) VALUES (:id,:o,:weekday,:start_minute,:end_minute,"
                    ":timezone)"
                ),
                {"id": uuid4(), "o": org, **rule.model_dump()},
            )
        audit(db, uid, "availability.replaced", org)
        return body.model_dump()

    # ---- provider: bookings -------------------------------------------------
    def booking_view(r, with_client=False):
        view = {
            "id": str(r["id"]),
            "organization_id": str(r["organization_id"]),
            "service_id": str(r["service_id"]),
            "service_name": r["service_name"],
            "starts_at": iso(r["starts_at"]),
            "ends_at": iso(r["ends_at"]),
            "state": r["state"],
            "note": r["note"],
        }
        if with_client:
            # Pseudonymous reference only; no profile data is shared with the provider.
            view["client_ref"] = str(r["client_id"])[:8]
        return view

    cols = (
        "b.id,b.organization_id,b.service_id,s.name AS service_name,b.starts_at,b.ends_at,"
        "b.state,b.note,b.client_id"
    )

    @router.get("/v1/organizations/{org}/bookings")
    def list_bookings(org: UUID, db: Db, identity: Identity, state: str | None = None):
        provider(db, identity, org)
        if state is not None and state not in {
            "requested",
            "accepted",
            "declined",
            "cancelled",
            "completed",
        }:
            raise HTTPException(422, "Unknown booking state")
        rows = db.execute(
            text(
                f"SELECT {cols} FROM booking b JOIN professional_service s ON s.id=b.service_id "
                "WHERE b.organization_id=:o AND (CAST(:s AS text) IS NULL OR b.state=:s) "
                "ORDER BY b.starts_at DESC LIMIT 200"
            ),
            {"o": org, "s": state},
        ).mappings()
        return [booking_view(r, with_client=True) for r in rows]

    @router.post("/v1/organizations/{org}/bookings/{bid}/decision")
    def decide(org: UUID, bid: UUID, body: Decision, db: Db, identity: Identity):
        uid = provider(db, identity, org, write=True)
        row = (
            db.execute(
                text(
                    "SELECT id,state,starts_at,ends_at FROM booking WHERE id=:id "
                    "AND organization_id=:o FOR UPDATE"
                ),
                {"id": bid, "o": org},
            )
            .mappings()
            .first()
        )
        if not row:
            raise HTTPException(404, "Booking not available")
        now = datetime.now(UTC)
        allowed = {
            "accept": ("requested", "accepted"),
            "decline": ("requested", "declined"),
            "cancel": ("accepted", "cancelled"),
            "complete": ("accepted", "completed"),
        }[body.decision]
        if row["state"] != allowed[0]:
            raise HTTPException(409, f"Only a {allowed[0]} booking can be {allowed[1]}")
        if body.decision == "accept" and row["starts_at"] <= now:
            raise HTTPException(409, "This time has already passed")
        if body.decision == "complete" and row["ends_at"] > now:
            raise HTTPException(409, "A booking can only be completed after it ends")
        try:
            with db.begin_nested():
                db.execute(
                    text(
                        "UPDATE booking SET state=:s,decided_by=:u,decided_at=clock_timestamp() "
                        "WHERE id=:id"
                    ),
                    {"s": allowed[1], "u": uid, "id": bid},
                )
        except IntegrityError:
            raise HTTPException(409, "Another booking already holds this time") from None
        audit(db, uid, f"booking.{allowed[1]}", bid)
        return booking_view(
            db.execute(
                text(
                    f"SELECT {cols} FROM booking b JOIN professional_service s "
                    "ON s.id=b.service_id WHERE b.id=:id"
                ),
                {"id": bid},
            )
            .mappings()
            .one(),
            with_client=True,
        )

    # ---- clients ------------------------------------------------------------
    def client(db, identity):
        uid = user(db, identity)
        if not eligible(db, uid):
            raise HTTPException(403, "An eligible adult account is required to book")
        return uid

    def published(db, org, sid=None):
        rows = db.execute(
            text(
                f"SELECT {PREFIXED_COLS} FROM professional_service s "
                "JOIN organizations o ON o.id=s.organization_id "
                "JOIN workspace_capability c ON c.organization_id=o.id "
                "AND c.workspace='professional' AND c.status='verified' AND c.expires_at>now() "
                "WHERE s.organization_id=:o AND s.state='published' AND NOT o.suspended "
                "AND (CAST(:id AS uuid) IS NULL OR s.id=:id) ORDER BY s.created_at,s.id"
            ),
            {"o": org, "id": sid},
        ).mappings()
        return list(rows)

    @router.get("/v1/professionals/{org}/services")
    def public_services(org: UUID, db: Db, identity: Identity):
        client(db, identity)
        return [service_row(r) for r in published(db, org)]

    @router.get("/v1/professionals/{org}/services/{sid}/slots")
    def slots(org: UUID, sid: UUID, day: date, db: Db, identity: Identity):
        client(db, identity)
        today = datetime.now(UTC).date()
        if day < today - timedelta(days=1) or day > today + timedelta(days=HORIZON_DAYS):
            raise HTTPException(422, f"Choose a date within the next {HORIZON_DAYS} days")
        rows = published(db, org, sid)
        if not rows:
            raise HTTPException(404, "Service not available")
        found = generate_slots(db, org, rows[0]["duration_minutes"], day)
        return {"slots": [iso(s) for s in found], "duration_minutes": rows[0]["duration_minutes"]}

    @router.post("/v1/bookings", status_code=201)
    def request_booking(body: BookingRequest, db: Db, identity: Identity, key: Key):
        uid = client(db, identity)
        route = "bookings"
        payload = body.model_dump(mode="json")
        if result := replay(db, uid, route, key, payload):
            return result
        found = (
            db.execute(
                text(
                    "SELECT organization_id FROM professional_service WHERE id=:id "
                    "AND state='published'"
                ),
                {"id": body.service_id},
            )
            .mappings()
            .first()
        )
        rows = published(db, found["organization_id"], body.service_id) if found else []
        if not rows:
            raise HTTPException(404, "Service not available")
        org, duration = rows[0]["organization_id"], rows[0]["duration_minutes"]
        start = body.starts_at.astimezone(UTC)
        day = start.date()
        offered = {
            s
            for d in (day - timedelta(days=1), day, day + timedelta(days=1))
            for s in generate_slots(db, org, duration, d)
        }
        if start not in offered:
            raise HTTPException(409, "That time is not available; choose another slot")
        bid = uuid4()
        db.execute(
            text(
                "INSERT INTO booking(id,organization_id,service_id,client_id,starts_at,ends_at,"
                "note) VALUES (:id,:o,:s,:c,:start,:end,:note)"
            ),
            {
                "id": bid,
                "o": org,
                "s": body.service_id,
                "c": uid,
                "start": start,
                "end": start + timedelta(minutes=duration),
                "note": body.note,
            },
        )
        audit(db, uid, "booking.requested", bid)
        result = booking_view(
            db.execute(
                text(
                    f"SELECT {cols} FROM booking b JOIN professional_service s "
                    "ON s.id=b.service_id WHERE b.id=:id"
                ),
                {"id": bid},
            )
            .mappings()
            .one()
        )
        return remember(db, uid, route, key, payload, result)

    @router.get("/v1/me/bookings")
    def my_bookings(db: Db, identity: Identity):
        uid = user(db, identity)
        rows = db.execute(
            text(
                f"SELECT {cols} FROM booking b JOIN professional_service s ON s.id=b.service_id "
                "WHERE b.client_id=:u ORDER BY b.starts_at DESC LIMIT 100"
            ),
            {"u": uid},
        ).mappings()
        return [booking_view(r) for r in rows]

    @router.post("/v1/me/bookings/{bid}/cancel")
    def cancel_mine(bid: UUID, db: Db, identity: Identity):
        uid = user(db, identity)
        row = (
            db.execute(
                text("SELECT state FROM booking WHERE id=:id AND client_id=:u FOR UPDATE"),
                {"id": bid, "u": uid},
            )
            .mappings()
            .first()
        )
        if not row:
            raise HTTPException(404, "Booking not available")
        if row["state"] not in {"requested", "accepted"}:
            raise HTTPException(409, "This booking can no longer be cancelled")
        db.execute(
            text("UPDATE booking SET state='cancelled',decided_at=clock_timestamp() WHERE id=:id"),
            {"id": bid},
        )
        audit(db, uid, "booking.cancelled_by_client", bid)
        return booking_view(
            db.execute(
                text(
                    f"SELECT {cols} FROM booking b JOIN professional_service s "
                    "ON s.id=b.service_id WHERE b.id=:id"
                ),
                {"id": bid},
            )
            .mappings()
            .one()
        )

    return router
