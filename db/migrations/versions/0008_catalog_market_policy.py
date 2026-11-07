"""Immutable country/currency catalog activation; default deny when unqualified."""

from alembic import op

revision = "0008_catalog_market_policy"
down_revision = "0007_contextual_catalog"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE market_policy_version (
            id uuid PRIMARY KEY,
            sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
            country text NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
            currency text NOT NULL CHECK(currency IN ('ZAR','USD','EUR','GBP')),
            capability text NOT NULL CHECK(capability='catalog_discovery'),
            enabled boolean NOT NULL DEFAULT false,
            expires_at timestamptz NOT NULL,
            policy_ref text NOT NULL CHECK(length(policy_ref) BETWEEN 1 AND 160),
            reviewed_by uuid NOT NULL REFERENCES app_user
        );
        CREATE INDEX market_policy_latest ON market_policy_version(country,currency,sequence DESC);
        CREATE TRIGGER market_policy_immutable BEFORE UPDATE OR DELETE ON market_policy_version
            FOR EACH ROW EXECUTE FUNCTION reject_mutation();
        ALTER TABLE market_policy_version ENABLE ROW LEVEL SECURITY;
        DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE market_policy_version FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE market_policy_version FROM authenticated;
            END IF;
        END $$;
    """)


def downgrade():
    raise RuntimeError("Removing market-policy evidence requires explicit review")
