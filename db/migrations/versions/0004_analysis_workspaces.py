"""Scoped workspace capabilities, grants and private routine/draft persistence."""

from alembic import op

revision = "0004_analysis_workspaces"
down_revision = "0003_server_only_access"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE organization ADD COLUMN suspended boolean NOT NULL DEFAULT false")
    op.execute("ALTER TABLE organization_member ADD COLUMN active boolean NOT NULL DEFAULT true")
    op.execute("""
        CREATE TABLE account_eligibility (
            user_id uuid PRIMARY KEY REFERENCES app_user,
            age_band text NOT NULL CHECK(age_band IN ('eligible_adult','restricted')),
            evidence_ref text NOT NULL CHECK(length(evidence_ref) BETWEEN 1 AND 160),
            expires_at timestamptz NOT NULL
        );
        CREATE TABLE workspace_capability (
            organization_id uuid NOT NULL REFERENCES organization,
            workspace text NOT NULL CHECK(workspace IN
                ('merchant','advertiser','professional','creator','affiliate')),
            status text NOT NULL CHECK(status IN ('pending','verified','suspended')),
            expires_at timestamptz NOT NULL,
            PRIMARY KEY(organization_id,workspace)
        );
        CREATE TABLE workspace_role (
            organization_id uuid NOT NULL,
            user_id uuid NOT NULL,
            workspace text NOT NULL,
            role text NOT NULL CHECK(role IN
                ('admin','catalog_manager','campaign_manager','booking_manager',
                 'creator','affiliate','analyst','finance_manager')),
            PRIMARY KEY(organization_id,user_id,workspace,role),
            FOREIGN KEY(organization_id,user_id)
                REFERENCES organization_member(organization_id,user_id),
            FOREIGN KEY(organization_id,workspace)
                REFERENCES workspace_capability(organization_id,workspace)
        );
        CREATE TABLE workspace_draft (
            id uuid PRIMARY KEY,
            organization_id uuid NOT NULL,
            workspace text NOT NULL,
            author_id uuid NOT NULL REFERENCES app_user,
            title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
            notes text NOT NULL CHECK(length(notes)<=4000),
            revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
            updated_at timestamptz NOT NULL DEFAULT now(),
            FOREIGN KEY(organization_id,workspace)
                REFERENCES workspace_capability(organization_id,workspace)
        );
        CREATE INDEX workspace_draft_tenant ON workspace_draft(organization_id,workspace);
        CREATE TABLE personal_routine (
            id uuid PRIMARY KEY,
            owner_id uuid NOT NULL REFERENCES app_user,
            title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
            steps jsonb NOT NULL CHECK(jsonb_typeof(steps)='array'),
            revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX personal_routine_owner ON personal_routine(owner_id);
    """)
    for table in (
        "account_eligibility",
        "workspace_capability",
        "workspace_role",
        "workspace_draft",
        "personal_routine",
    ):
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
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


def downgrade():
    raise RuntimeError("Removing private workspace/routine data requires explicit review")
