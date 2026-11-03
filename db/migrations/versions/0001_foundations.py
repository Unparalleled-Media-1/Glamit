"""Identity, consent, immutable look revisions, credit journal and transactional outbox."""

from pathlib import Path

from alembic import op

revision = "0001_foundations"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.get_bind().exec_driver_sql(Path(__file__).with_suffix(".sql").read_text())


def downgrade() -> None:
    raise RuntimeError("Destructive rollback requires explicit approval and a reviewed migration")
