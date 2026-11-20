"""Candidate professional services, availability and bookings; exact SQL approval required."""

from pathlib import Path

from alembic import op

revision = "0019_professional_bookings"
down_revision = "0018_tryon"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(Path(__file__).with_suffix(".sql").read_text())


def downgrade():
    op.execute("""
      LOCK TABLE public.professional_service, public.availability_rule, public.booking
        IN ACCESS EXCLUSIVE MODE;
      DO $$ BEGIN
        IF EXISTS(SELECT 1 FROM public.booking)
           OR EXISTS(SELECT 1 FROM public.professional_service)
           OR EXISTS(SELECT 1 FROM public.availability_rule) THEN
          RAISE EXCEPTION 'Booking rollback requires empty tables';
        END IF;
      END $$;
      DROP TABLE public.booking;
      DROP TABLE public.availability_rule;
      DROP TABLE public.professional_service;
    """)
