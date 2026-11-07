from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text


def test_canonical_application_head_is_separate_from_guarded_test_sandbox(db):
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    heads = set(script.get_heads())
    assert heads == {"0009_stripe_test_ledger", "0013_passwordless_accounts"}
    assert script.get_revision("application@head").revision == "0013_passwordless_accounts"
    lineage = {r.revision for r in script.walk_revisions("base", "application@head")}
    assert "0008_catalog_market_policy" in lineage
    assert "0009_stripe_test_ledger" not in lineage
    with db.connect() as connection:
        assert set(connection.scalars(text("SELECT version_num FROM alembic_version"))) == heads
