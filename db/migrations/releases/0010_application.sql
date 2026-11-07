-- GENERATED from canonical Alembic application@head; do not edit.
-- Includes existing application prerequisites; excludes Stripe sandbox0009.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE alembic_version (
	version_num VARCHAR(32) NOT NULL, 
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

CREATE TABLE app_user (
    id uuid PRIMARY KEY,
    issuer text NOT NULL,
    subject text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (issuer, subject)
);
CREATE TABLE organization (
    id uuid PRIMARY KEY,
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organization_member (
    organization_id uuid NOT NULL REFERENCES organization,
    user_id uuid NOT NULL REFERENCES app_user,
    role text NOT NULL CHECK (role IN ('owner', 'catalog_manager', 'analyst')),
    PRIMARY KEY (organization_id, user_id)
);
CREATE TABLE policy_document (
    id uuid PRIMARY KEY,
    purpose text NOT NULL,
    version text NOT NULL,
    content text NOT NULL,
    approved_at timestamptz NOT NULL,
    UNIQUE (purpose, version)
);
CREATE TABLE consent_event (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_user,
    policy_id uuid NOT NULL REFERENCES policy_document,
    action text NOT NULL CHECK (action IN ('granted', 'withdrawn')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
CREATE INDEX consent_latest ON consent_event(user_id, policy_id, sequence DESC);
CREATE TABLE look (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES app_user,
    title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
    source_type text NOT NULL CHECK (source_type = 'user_authored'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE look_revision (
    id uuid PRIMARY KEY,
    look_id uuid NOT NULL REFERENCES look ON DELETE CASCADE,
    revision_no integer NOT NULL CHECK (revision_no > 0),
    components jsonb NOT NULL CHECK (jsonb_typeof(components) = 'array'),
    content_hash text NOT NULL CHECK (length(content_hash) = 64),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (look_id, revision_no)
);
CREATE INDEX look_owner ON look(owner_id, created_at);
CREATE TABLE credit_account (
    user_id uuid PRIMARY KEY REFERENCES app_user
);
CREATE TABLE credit_reservation (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES credit_account,
    business_key text NOT NULL,
    units bigint NOT NULL CHECK (units > 0),
    state text NOT NULL CHECK (state IN ('held', 'captured', 'released')),
    expires_at timestamptz NOT NULL,
    UNIQUE (user_id, business_key),
    UNIQUE (id, user_id)
);
CREATE TABLE credit_journal (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES credit_account,
    operation text NOT NULL CHECK (operation IN ('grant', 'reserve', 'capture', 'release')),
    business_key text NOT NULL,
    units bigint NOT NULL CHECK (units > 0),
    sealed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, operation, business_key)
);
CREATE TABLE credit_posting (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    journal_id uuid NOT NULL REFERENCES credit_journal,
    user_id uuid REFERENCES credit_account,
    bucket text NOT NULL CHECK (bucket IN ('available', 'held', 'issuance', 'consumed')),
    units bigint NOT NULL CHECK (units <> 0),
    CHECK ((user_id IS NOT NULL AND bucket IN ('available', 'held')) OR
           (user_id IS NULL AND bucket IN ('issuance', 'consumed')))
);
CREATE INDEX credit_balance ON credit_posting(user_id, bucket);
CREATE TABLE outbox_event (
    id uuid PRIMARY KEY,
    event_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    available_at timestamptz NOT NULL DEFAULT now(),
    claimed_until timestamptz,
    attempts integer NOT NULL DEFAULT 0,
    delivered_at timestamptz
);
CREATE INDEX outbox_pending ON outbox_event(available_at) WHERE delivered_at IS NULL;
CREATE TABLE audit_event (
    id uuid PRIMARY KEY,
    actor_id uuid REFERENCES app_user,
    action text NOT NULL,
    resource_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE idempotency_record (
    user_id uuid NOT NULL REFERENCES app_user,
    route text NOT NULL,
    key text NOT NULL CHECK (length(key) BETWEEN 1 AND 160),
    request_hash text NOT NULL,
    response jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, route, key)
);
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'append-only record';
END; $$;
CREATE TRIGGER immutable_look_revision BEFORE UPDATE ON look_revision
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_consent BEFORE UPDATE OR DELETE ON consent_event
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_event
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_posting BEFORE UPDATE OR DELETE ON credit_posting
    FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE FUNCTION protect_journal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD.sealed THEN
        RAISE EXCEPTION 'sealed journal is immutable';
    END IF;
    IF (to_jsonb(OLD) - 'sealed') <> (to_jsonb(NEW) - 'sealed') OR NOT NEW.sealed THEN
        RAISE EXCEPTION 'only journal sealing is permitted';
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER immutable_journal BEFORE UPDATE OR DELETE ON credit_journal
    FOR EACH ROW EXECUTE FUNCTION protect_journal();
CREATE FUNCTION protect_posting_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal credit_journal;
BEGIN
    SELECT * INTO journal FROM credit_journal WHERE id = NEW.journal_id FOR UPDATE;
    IF journal.sealed OR (NEW.user_id IS NOT NULL AND NEW.user_id <> journal.user_id) THEN
        RAISE EXCEPTION 'posting requires open journal and matching owner';
    END IF;
    RETURN NEW;
END; $$;
CREATE TRIGGER validate_posting BEFORE INSERT ON credit_posting
    FOR EACH ROW EXECUTE FUNCTION protect_posting_insert();
CREATE FUNCTION enforce_credit_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total numeric; count_rows integer; is_sealed boolean;
BEGIN
    SELECT sum(units), count(*) INTO total, count_rows FROM credit_posting WHERE journal_id = NEW.id;
    SELECT sealed INTO is_sealed FROM credit_journal WHERE id = NEW.id;
    IF NOT is_sealed OR count_rows < 2 OR total IS DISTINCT FROM 0::numeric THEN
        RAISE EXCEPTION 'credit journal must be sealed and balanced';
    END IF;
    RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER balanced_credit_journal AFTER INSERT OR UPDATE ON credit_journal
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_credit_balance();

INSERT INTO alembic_version (version_num) VALUES ('0001_foundations') RETURNING alembic_version.version_num;

ALTER TABLE look ALTER COLUMN created_at SET DEFAULT clock_timestamp();

CREATE OR REPLACE FUNCTION protect_posting_insert() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE journal credit_journal;
        BEGIN
            SELECT * INTO journal FROM credit_journal WHERE id=NEW.journal_id FOR UPDATE;
            IF journal.sealed OR (NEW.user_id IS NOT NULL AND NEW.user_id<>journal.user_id) THEN
                RAISE EXCEPTION 'posting requires open journal and matching owner';
            END IF;
            PERFORM user_id FROM credit_account WHERE user_id=journal.user_id FOR UPDATE;
            RETURN NEW;
        END; $$;

CREATE OR REPLACE FUNCTION enforce_credit_balance() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE total numeric; count_rows integer; is_sealed boolean; owner uuid;
        BEGIN
            SELECT sum(units),count(*) INTO total,count_rows
                FROM credit_posting WHERE journal_id=NEW.id;
            SELECT sealed,user_id INTO is_sealed,owner FROM credit_journal WHERE id=NEW.id;
            IF NOT is_sealed OR count_rows<2 OR total IS DISTINCT FROM 0::numeric THEN
                RAISE EXCEPTION 'credit journal must be sealed and balanced';
            END IF;
            IF EXISTS (SELECT bucket FROM credit_posting WHERE user_id=owner
                       GROUP BY bucket HAVING sum(units)<0) THEN
                RAISE EXCEPTION 'credit account cannot have a negative balance';
            END IF;
            RETURN NULL;
        END; $$;

UPDATE alembic_version SET version_num='0002_credit_safety' WHERE alembic_version.version_num = '0001_foundations';

ALTER TABLE public."app_user" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."app_user" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."app_user" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."organization" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."organization" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."organization" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."organization_member" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."organization_member" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."organization_member" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."policy_document" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."policy_document" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."policy_document" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."consent_event" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."consent_event" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."consent_event" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."look" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."look" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."look" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."look_revision" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."look_revision" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."look_revision" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."credit_account" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."credit_account" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."credit_account" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."credit_reservation" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."credit_reservation" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."credit_reservation" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."credit_journal" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."credit_journal" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."credit_journal" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."credit_posting" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."credit_posting" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."credit_posting" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."outbox_event" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."outbox_event" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."outbox_event" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."audit_event" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."audit_event" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."audit_event" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."idempotency_record" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."idempotency_record" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."idempotency_record" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."alembic_version" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."alembic_version" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."alembic_version" FROM authenticated;
                END IF;
            END $$;

UPDATE alembic_version SET version_num='0003_server_only_access' WHERE alembic_version.version_num = '0002_credit_safety';

ALTER TABLE organization ADD COLUMN suspended boolean NOT NULL DEFAULT false;

ALTER TABLE organization_member ADD COLUMN active boolean NOT NULL DEFAULT true;

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

ALTER TABLE public."account_eligibility" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."account_eligibility" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."account_eligibility" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."workspace_capability" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."workspace_capability" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."workspace_capability" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."workspace_role" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."workspace_role" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."workspace_role" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."workspace_draft" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."workspace_draft" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."workspace_draft" FROM authenticated;
                END IF;
            END $$;

ALTER TABLE public."personal_routine" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    REVOKE ALL ON TABLE public."personal_routine" FROM anon;
                END IF;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    REVOKE ALL ON TABLE public."personal_routine" FROM authenticated;
                END IF;
            END $$;

UPDATE alembic_version SET version_num='0004_analysis_workspaces' WHERE alembic_version.version_num = '0003_server_only_access';

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

UPDATE alembic_version SET version_num='0005_workspace_invitations' WHERE alembic_version.version_num = '0004_analysis_workspaces';

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

UPDATE alembic_version SET version_num='0006_staff_context' WHERE alembic_version.version_num = '0005_workspace_invitations';

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

ALTER TABLE public."catalog_listing" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."catalog_listing" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."catalog_listing" FROM authenticated;
            END IF;
        END $$;

ALTER TABLE public."catalog_revision" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."catalog_revision" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."catalog_revision" FROM authenticated;
            END IF;
        END $$;

ALTER TABLE public."catalog_approval" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."catalog_approval" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."catalog_approval" FROM authenticated;
            END IF;
        END $$;

ALTER TABLE public."catalog_media" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."catalog_media" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."catalog_media" FROM authenticated;
            END IF;
        END $$;

ALTER TABLE public."catalog_projection" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."catalog_projection" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."catalog_projection" FROM authenticated;
            END IF;
        END $$;

ALTER TABLE public."catalog_ai_job" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."catalog_ai_job" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."catalog_ai_job" FROM authenticated;
            END IF;
        END $$;

ALTER TABLE public."saved_requirement" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                REVOKE ALL ON TABLE public."saved_requirement" FROM anon;
            END IF;
            IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                REVOKE ALL ON TABLE public."saved_requirement" FROM authenticated;
            END IF;
        END $$;

UPDATE alembic_version SET version_num='0007_contextual_catalog' WHERE alembic_version.version_num = '0006_staff_context';

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

UPDATE alembic_version SET version_num='0008_catalog_market_policy' WHERE alembic_version.version_num = '0007_contextual_catalog';

-- Canonical application continuation from0008. Stripe sandbox0009 stays a sibling.
-- Supabase Auth is required; it is never recreated by this migration.
DO $$ BEGIN
  IF to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL
     OR to_regprocedure('auth.jwt()') IS NULL THEN
    RAISE EXCEPTION 'Supabase Auth schema/functions are required';
  END IF;
END $$;

-- Rename existing entities: never create competing organization stores.
ALTER TABLE public.organization RENAME TO organizations;
ALTER TABLE public.organization_member RENAME TO organization_members;
ALTER TABLE public.organizations ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.organization_members ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE public.organization_members ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.organization_members ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
-- Retain the UUID composite PK referenced by workspace_role; add a stable UUID row ID.
CREATE INDEX organization_members_user ON public.organization_members(user_id, organization_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 160),
  avatar_object_key text CHECK (avatar_object_key IS NULL OR length(avatar_object_key)<=512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'en' CHECK(length(locale) BETWEEN 2 AND 35),
  currency text NOT NULL DEFAULT 'USD' CHECK(currency ~ '^[A-Z]{3}$'),
  measurement_system text NOT NULL DEFAULT 'metric' CHECK(measurement_system IN ('metric','imperial')),
  personalization_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.style_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_colors text[] NOT NULL DEFAULT '{}',
  preferred_styles text[] NOT NULL DEFAULT '{}',
  coverage_preference text CHECK(coverage_preference IS NULL OR length(coverage_preference)<=240),
  sizing_notes text CHECK(sizing_notes IS NULL OR length(sizing_notes)<=1000),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(cardinality(preferred_colors)<=30 AND cardinality(preferred_styles)<=30)
);
CREATE TABLE public.merchant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id),
  display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 160),
  verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, organization_id)
);
CREATE TABLE public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id),
  display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 160),
  bio text CHECK(bio IS NULL OR length(bio)<=4000),
  verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.product_categories(id),
  slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(parent_id IS NULL OR parent_id<>id)
);
CREATE INDEX product_categories_parent ON public.product_categories(parent_id);
CREATE TABLE public.products (
  -- One product detail per existing canonical listing, not a duplicate catalog authority.
  id uuid PRIMARY KEY REFERENCES public.catalog_listing(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  merchant_profile_id uuid NOT NULL,
  category_id uuid REFERENCES public.product_categories(id),
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
  description text CHECK(description IS NULL OR length(description)<=10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,organization_id),
  FOREIGN KEY(id,organization_id) REFERENCES public.catalog_listing(id,organization_id),
  FOREIGN KEY(merchant_profile_id,organization_id) REFERENCES public.merchant_profiles(id,organization_id)
);
CREATE INDEX products_org ON public.products(organization_id);
CREATE INDEX products_merchant ON public.products(merchant_profile_id);
CREATE INDEX products_category ON public.products(category_id);
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sku text NOT NULL CHECK(length(sku) BETWEEN 1 AND 160),
  shade text CHECK(shade IS NULL OR length(shade)<=160),
  size_label text CHECK(size_label IS NULL OR length(size_label)<=100),
  currency text CHECK(currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  unit_price_minor bigint CHECK(unit_price_minor IS NULL OR unit_price_minor>=0),
  stock_on_hand integer CHECK(stock_on_hand IS NULL OR stock_on_hand>=0),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,sku),
  FOREIGN KEY(product_id,organization_id) REFERENCES public.products(id,organization_id),
  CHECK((unit_price_minor IS NULL)=(currency IS NULL))
);
CREATE INDEX product_variants_product ON public.product_variants(product_id,organization_id);
CREATE INDEX product_variants_org ON public.product_variants(organization_id);

CREATE SCHEMA glam_private;
REVOKE ALL ON SCHEMA glam_private FROM PUBLIC;
GRANT USAGE ON SCHEMA glam_private TO authenticated;
CREATE FUNCTION glam_private.current_app_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT u.id FROM public.app_user u
      WHERE u.subject=auth.uid()::text AND u.issuer=auth.jwt()->>'iss' $$;
CREATE FUNCTION glam_private.is_org_member(org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
  WHERE m.organization_id=org_id AND m.user_id=glam_private.current_app_user_id()
    AND m.active AND NOT o.suspended
) $$;
REVOKE ALL ON FUNCTION glam_private.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION glam_private.is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION glam_private.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION glam_private.is_org_member(uuid) TO authenticated;

CREATE FUNCTION glam_private.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION glam_private.touch_updated_at() FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','organizations','organization_members','user_preferences',
    'style_passports','merchant_profiles','professional_profiles','product_categories','products','product_variants']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon,authenticated',t);
    EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION glam_private.touch_updated_at()',t);
  END LOOP;
END $$;

GRANT SELECT,INSERT ON public.profiles TO authenticated;
GRANT UPDATE(display_name,avatar_object_key) ON public.profiles TO authenticated;
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK(id=auth.uid());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());

GRANT SELECT,INSERT,DELETE ON public.user_preferences,public.style_passports TO authenticated;
GRANT UPDATE(locale,currency,measurement_system,personalization_opt_in,marketing_opt_in) ON public.user_preferences TO authenticated;
GRANT UPDATE(preferred_colors,preferred_styles,coverage_preference,sizing_notes,revision) ON public.style_passports TO authenticated;
CREATE POLICY preferences_select_self ON public.user_preferences FOR SELECT TO authenticated USING(profile_id=auth.uid());
CREATE POLICY preferences_insert_self ON public.user_preferences FOR INSERT TO authenticated WITH CHECK(profile_id=auth.uid());
CREATE POLICY preferences_update_self ON public.user_preferences FOR UPDATE TO authenticated USING(profile_id=auth.uid()) WITH CHECK(profile_id=auth.uid());
CREATE POLICY preferences_delete_self ON public.user_preferences FOR DELETE TO authenticated USING(profile_id=auth.uid());
CREATE POLICY passports_select_self ON public.style_passports FOR SELECT TO authenticated USING(profile_id=auth.uid());
CREATE POLICY passports_insert_self ON public.style_passports FOR INSERT TO authenticated WITH CHECK(profile_id=auth.uid());
CREATE POLICY passports_update_self ON public.style_passports FOR UPDATE TO authenticated USING(profile_id=auth.uid()) WITH CHECK(profile_id=auth.uid());
CREATE POLICY passports_delete_self ON public.style_passports FOR DELETE TO authenticated USING(profile_id=auth.uid());

-- Organization, catalog publication and verification writes stay behind existing authorized APIs.
GRANT SELECT ON public.organizations,public.organization_members,public.merchant_profiles,
 public.professional_profiles,public.products,public.product_variants TO authenticated;
CREATE POLICY organizations_read_member ON public.organizations FOR SELECT TO authenticated USING(glam_private.is_org_member(id));
CREATE POLICY members_read_org ON public.organization_members FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY merchants_read_org ON public.merchant_profiles FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY professionals_read_org ON public.professional_profiles FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY products_read_org ON public.products FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
CREATE POLICY variants_read_org ON public.product_variants FOR SELECT TO authenticated USING(glam_private.is_org_member(organization_id));
GRANT SELECT ON public.product_categories TO anon,authenticated;
CREATE POLICY categories_read_active ON public.product_categories FOR SELECT TO anon,authenticated USING(is_active);

UPDATE alembic_version SET version_num='0010_supabase_foundation' WHERE alembic_version.version_num = '0008_catalog_market_policy';
COMMIT;
