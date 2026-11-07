"""Recipient-bound workspace invitations, not client-created role activation."""

from alembic import op

revision = "0005_workspace_invitations"
down_revision = "0004_analysis_workspaces"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE workspace_invitation (
            id uuid PRIMARY KEY,
            organization_id uuid NOT NULL,
            workspace text NOT NULL,
            recipient_id uuid NOT NULL REFERENCES app_user,
            invited_by uuid NOT NULL REFERENCES app_user,
            role text NOT NULL CHECK(role IN
                ('catalog_manager','campaign_manager','booking_manager','creator',
                 'affiliate','analyst')),
            state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','revoked')),
            expires_at timestamptz NOT NULL,
            FOREIGN KEY(organization_id,workspace)
                REFERENCES workspace_capability(organization_id,workspace)
        );
        ALTER TABLE workspace_invitation ENABLE ROW LEVEL SECURITY;
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE workspace_invitation FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE workspace_invitation FROM authenticated;
            END IF;
        END $$;
    """)


def downgrade():
    raise RuntimeError("Removing invitation evidence requires explicit review")
