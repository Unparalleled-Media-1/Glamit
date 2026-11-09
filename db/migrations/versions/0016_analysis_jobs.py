"""Candidate durable cosmetic-analysis jobs; exact production SQL approval required."""

from pathlib import Path

from alembic import op

revision = "0016_analysis_jobs"
down_revision = "0015_private_media"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    op.execute("""
      LOCK TABLE public.analysis_job IN ACCESS EXCLUSIVE MODE;
      DO $$ BEGIN
        IF EXISTS(SELECT 1 FROM public.analysis_job) THEN
          RAISE EXCEPTION 'Analysis rollback requires an empty job registry';
        END IF;
      END $$;
      DROP TABLE public.analysis_job;
      DROP INDEX public.private_media_id_owner_for_analysis;
    """)
