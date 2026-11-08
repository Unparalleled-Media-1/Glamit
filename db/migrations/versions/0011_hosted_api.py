"""JWT-scoped hosted core API, rate limits and existing-contract RPC transport."""

from pathlib import Path

from alembic import op

revision = "0011_hosted_api"
down_revision = "0010_supabase_foundation"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    raise RuntimeError("Data-preserving reviewed rollback required")
