import os
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from glam_api.auth import Principal, get_principal
from glam_api.config import get_settings
from glam_api.db import get_session
from glam_api.main import app
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


@pytest.fixture(scope="session")
def engine():
    url = os.environ.get("GLAM_TEST_DATABASE_URL")
    if not url or not (make_url(url).database or "").endswith("_test"):
        pytest.fail("Set GLAM_TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test")
    previous = os.environ.get("GLAM_DATABASE_URL")
    os.environ["GLAM_DATABASE_URL"] = url
    get_settings.cache_clear()
    command.upgrade(Config("alembic.ini"), "head")
    engine = create_engine(url, hide_parameters=True)
    yield engine
    engine.dispose()
    if previous is None:
        os.environ.pop("GLAM_DATABASE_URL", None)
    else:
        os.environ["GLAM_DATABASE_URL"] = previous
    get_settings.cache_clear()


@pytest.fixture
def db(engine):
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE app_user, organization, policy_document, outbox_event, audit_event "
                "RESTART IDENTITY CASCADE"
            )
        )
    return engine


@pytest.fixture
def client(db):
    def session():
        with Session(db) as value, value.begin():
            yield value

    app.dependency_overrides[get_session] = session
    app.dependency_overrides[get_principal] = lambda: Principal("https://test.invalid", "alice")
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def policy(db):
    policy_id = uuid4()
    with db.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO policy_document(id,purpose,version,content,approved_at) "
                "VALUES (:id,'private_look_storage','test-only','Test fixture',now())"
            ),
            {"id": policy_id},
        )
    return policy_id


@pytest.fixture
def customer(db):
    user_id = uuid4()
    with db.begin() as connection:
        connection.execute(
            text("INSERT INTO app_user(id,issuer,subject) VALUES (:id,'test','customer')"),
            {"id": user_id},
        )
        connection.execute(
            text("INSERT INTO credit_account(user_id) VALUES (:id)"), {"id": user_id}
        )
    return user_id
