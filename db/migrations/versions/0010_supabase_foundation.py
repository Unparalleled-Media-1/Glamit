"""Application foundation; sibling to preserved test-only Stripe revision0009."""

from pathlib import Path

from alembic import op

revision = "0010_supabase_foundation"
down_revision = "0008_catalog_market_policy"
branch_labels = ("application",)
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    raise RuntimeError("Foundation rollback requires a reviewed, data-preserving migration")
