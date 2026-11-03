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
