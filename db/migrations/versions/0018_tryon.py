"""Candidate virtual try-on registry; exact production SQL approval required."""

from pathlib import Path

from alembic import op

revision = "0018_tryon"
down_revision = "0017_analysis_passport"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    op.execute("""
      LOCK TABLE public.tryon_job, public.tryon_result, public.generation_cost_event,
        public.generation_price_rule IN ACCESS EXCLUSIVE MODE;
      DO $$ BEGIN
        IF EXISTS(SELECT 1 FROM public.tryon_job)
           OR EXISTS(SELECT 1 FROM public.generation_cost_event)
           OR EXISTS(SELECT 1 FROM public.generation_price_rule) THEN
          RAISE EXCEPTION 'Try-on rollback requires empty registries';
        END IF;
      END $$;
      DROP VIEW public.generation_cost_summary;
      DROP TABLE public.generation_cost_event;
      DROP TABLE public.tryon_result;
      DROP TABLE public.tryon_job;
      DROP TABLE public.generation_price_rule;
      ALTER TABLE public.credit_account DROP COLUMN credit_kind;
    """)
