"""Expose existing canonical private routines through the hosted transport."""

from pathlib import Path

from alembic import op

revision = "0012_hosted_routines"
down_revision = "0011_hosted_api"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    raise RuntimeError("Reviewed data-preserving rollback required")
