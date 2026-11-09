"""Private versioned corrections and an extension of the existing Style Passport."""

from pathlib import Path

from alembic import op

revision = "0017_analysis_passport"
down_revision = "0016_analysis_jobs"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    op.execute("""
      LOCK TABLE public.analysis_correction,public.style_passport_analysis IN ACCESS EXCLUSIVE MODE;
      DO $$ BEGIN
        IF EXISTS(SELECT 1 FROM public.analysis_correction) OR
           EXISTS(SELECT 1 FROM public.style_passport_analysis) THEN
          RAISE EXCEPTION 'Analysis passport rollback requires empty registries';
        END IF;
      END $$;
      DROP TABLE public.style_passport_analysis;
      DROP TABLE public.analysis_correction;
      DROP FUNCTION public.guard_analysis_correction();
      DROP FUNCTION public.guard_analysis_passport_owner();
      DROP INDEX public.analysis_job_id_owner_for_passport;
    """)
