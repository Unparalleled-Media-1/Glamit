"""Candidate server-only consumer referral awards; production approval remains separate."""

from pathlib import Path

from alembic import op

revision = "0018_referral_months"
down_revision = "0017_analysis_passport"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    op.execute("""
      LOCK TABLE public.subscription_referral_award IN ACCESS EXCLUSIVE MODE;
      DO $$ BEGIN
        IF EXISTS(SELECT 1 FROM public.subscription_referral_award) THEN
          RAISE EXCEPTION 'Referral rollback requires an empty award registry';
        END IF;
      END $$;
      DROP TABLE public.subscription_referral_award;
      DROP FUNCTION public.guard_referral_award();
    """)
