"""Keep foundation tables server-only when hosted in a Supabase PostgreSQL project."""

from alembic import op

revision = "0003_server_only_access"
down_revision = "0002_credit_safety"
branch_labels = None
depends_on = None

# These are our tables only: never revoke access to unrelated existing project tables.
TABLES = (
    "app_user",
    "organization",
    "organization_member",
    "policy_document",
    "consent_event",
    "look",
    "look_revision",
    "credit_account",
    "credit_reservation",
    "credit_journal",
    "credit_posting",
    "outbox_event",
    "audit_event",
    "idempotency_record",
    "alembic_version",
)


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
        # No client policies: anon/authenticated must use the authorized FastAPI endpoints.
        op.execute(f"""
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."{table}" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."{table}" FROM authenticated;
                END IF;
            END $$;
        """)


def downgrade() -> None:
    raise RuntimeError("Removing server-only privacy safeguards requires explicit approval")
