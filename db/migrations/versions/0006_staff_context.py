"""Separate expiring staff authority from all consumer and organization memberships."""

from alembic import op

revision = "0006_staff_context"
down_revision = "0005_workspace_invitations"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE staff_grant (
            user_id uuid NOT NULL REFERENCES app_user,
            role text NOT NULL CHECK(role IN
                ('super_admin','support','finance','ai_operations','content_moderation',
                 'trust_safety','compliance','regional_operations','analyst')),
            active boolean NOT NULL DEFAULT true,
            expires_at timestamptz NOT NULL,
            evidence_ref text NOT NULL CHECK(length(evidence_ref) BETWEEN 1 AND 160),
            PRIMARY KEY(user_id,role)
        );
        ALTER TABLE staff_grant ENABLE ROW LEVEL SECURITY;
        DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE staff_grant FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE staff_grant FROM authenticated;
            END IF;
        END $$;
    """)


def downgrade():
    raise RuntimeError("Removing staff authority evidence requires explicit review")
