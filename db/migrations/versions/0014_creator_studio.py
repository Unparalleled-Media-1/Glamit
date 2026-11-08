"""Creator identity, manual social/content workflows and protected integration records."""

from pathlib import Path

from alembic import op

revision = "0014_creator_studio"
down_revision = "0013_passwordless_accounts"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    raise RuntimeError("Reviewed data-preserving rollback required")
