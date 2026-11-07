"""Session-bound account policies and non-secret device/notification preferences."""

from pathlib import Path

from alembic import op

revision = "0013_passwordless_accounts"
down_revision = "0012_hosted_routines"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    raise RuntimeError("Reviewed data-preserving rollback required")
