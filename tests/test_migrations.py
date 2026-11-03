from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text


def test_single_canonical_head_matches_database(db):
    heads = ScriptDirectory.from_config(Config("alembic.ini")).get_heads()
    assert heads == ["0002_credit_safety"]
    with db.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == heads[0]
