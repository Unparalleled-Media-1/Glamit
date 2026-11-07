"""Versioned merchant catalog, private recommendations and asynchronous preparation."""

from alembic import op

revision = "0007_contextual_catalog"
down_revision = "0006_staff_context"
branch_labels = None
depends_on = None

TABLES = (
    "catalog_listing",
    "catalog_revision",
    "catalog_approval",
    "catalog_media",
    "catalog_projection",
    "catalog_ai_job",
    "saved_requirement",
)


def upgrade():
    op.execute("""
        CREATE TABLE catalog_listing (
            id uuid PRIMARY KEY,
            organization_id uuid NOT NULL REFERENCES organization,
            source_sku text NOT NULL,
            workspace text NOT NULL CHECK(workspace IN ('merchant','professional')),
            current_revision integer NOT NULL DEFAULT 1 CHECK(current_revision>0),
            published_revision integer,
            state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published','withdrawn')),
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE(id,organization_id),
            UNIQUE(organization_id,workspace,source_sku),
            CHECK((state='published')=(published_revision IS NOT NULL))
        );
        CREATE TABLE catalog_revision (
            listing_id uuid NOT NULL REFERENCES catalog_listing ON DELETE CASCADE,
            revision integer NOT NULL CHECK(revision>0),
            facts jsonb NOT NULL CHECK(jsonb_typeof(facts)='object'),
            merchant_reviewed boolean NOT NULL DEFAULT false,
            author_id uuid NOT NULL REFERENCES app_user,
            created_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY(listing_id,revision)
        );
        ALTER TABLE catalog_listing ADD FOREIGN KEY(id,current_revision)
            REFERENCES catalog_revision(listing_id,revision) DEFERRABLE INITIALLY DEFERRED;
        ALTER TABLE catalog_listing ADD FOREIGN KEY(id,published_revision)
            REFERENCES catalog_revision(listing_id,revision) DEFERRABLE INITIALLY DEFERRED;
        CREATE TRIGGER catalog_revision_immutable BEFORE UPDATE ON catalog_revision
            FOR EACH ROW EXECUTE FUNCTION reject_mutation();
        CREATE TABLE catalog_approval (
            listing_id uuid NOT NULL,
            revision integer NOT NULL,
            decision text NOT NULL CHECK(decision IN ('approved','rejected')),
            identifier_verified boolean NOT NULL DEFAULT false,
            reviewer_id uuid NOT NULL REFERENCES app_user,
            reviewed_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY(listing_id,revision),
            FOREIGN KEY(listing_id,revision) REFERENCES catalog_revision ON DELETE CASCADE
        );
        CREATE TRIGGER catalog_approval_immutable BEFORE UPDATE ON catalog_approval
            FOR EACH ROW EXECUTE FUNCTION reject_mutation();
        CREATE TABLE catalog_media (
            id uuid PRIMARY KEY,
            listing_id uuid NOT NULL,
            organization_id uuid NOT NULL,
            original_id uuid REFERENCES catalog_media,
            storage_ref text NOT NULL CHECK(length(storage_ref) BETWEEN 1 AND 300),
            sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
            rights_confirmed boolean NOT NULL DEFAULT false,
            validated boolean NOT NULL DEFAULT false,
            generated_advertising boolean NOT NULL DEFAULT false,
            FOREIGN KEY(listing_id,organization_id)
                REFERENCES catalog_listing(id,organization_id) ON DELETE CASCADE
        );
        CREATE TABLE catalog_projection (
            listing_id uuid PRIMARY KEY REFERENCES catalog_listing ON DELETE CASCADE,
            revision integer NOT NULL,
            indexed_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE catalog_ai_job (
            id uuid PRIMARY KEY,
            listing_id uuid NOT NULL,
            base_revision integer NOT NULL,
            requester_id uuid NOT NULL REFERENCES app_user,
            provider text NOT NULL,
            features jsonb NOT NULL,
            state text NOT NULL CHECK(state IN
                ('queued','processing','review_ready','failed','cancelled')),
            lease_token uuid,
            lease_until timestamptz,
            attempts integer NOT NULL DEFAULT 0,
            suggestions jsonb,
            created_at timestamptz NOT NULL DEFAULT now(),
            FOREIGN KEY(listing_id,base_revision) REFERENCES catalog_revision ON DELETE CASCADE
        );
        CREATE TABLE saved_requirement (
            id uuid PRIMARY KEY,
            owner_id uuid NOT NULL REFERENCES app_user,
            requirement jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX catalog_listing_org ON catalog_listing(organization_id);
        CREATE INDEX saved_requirement_owner ON saved_requirement(owner_id);
    """)
    for table in TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
        op.execute(f"""DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."{table}" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."{table}" FROM authenticated;
            END IF;
        END $$;""")


def downgrade():
    raise RuntimeError("Removing catalog and private recommendation data requires explicit review")
