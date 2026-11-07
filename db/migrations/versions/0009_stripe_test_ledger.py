"""Additive Stripe sandbox journal only. Never apply this revision to production."""

from alembic import op

revision = "0009_stripe_test_ledger"
down_revision = "0008_catalog_market_policy"
branch_labels = None
depends_on = None


def upgrade():
    if not (op.get_bind().engine.url.database or "").endswith("_test"):
        raise RuntimeError(
            "Stripe sandbox migration requires an explicitly selected _test database"
        )
    op.execute("""
        CREATE TABLE stripe_test_offer (
            id uuid PRIMARY KEY, account text NOT NULL, owner_ref text NOT NULL,
            title text NOT NULL, currency text NOT NULL CHECK(currency='usd'),
            unit_minor bigint NOT NULL CHECK(unit_minor>0 AND unit_minor<100000000),
            shipping_minor bigint NOT NULL CHECK(shipping_minor>=0),
            tax_minor bigint NOT NULL CHECK(tax_minor>=0),
            stock integer NOT NULL CHECK(stock>=0),
            kind text NOT NULL CHECK(kind='physical'),
            source text NOT NULL CHECK(source='sandbox_operator_fixture'),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE stripe_test_order (
            id uuid PRIMARY KEY, owner_ref text NOT NULL, request_key text NOT NULL,
            request_hash text NOT NULL, currency text NOT NULL CHECK(currency='usd'),
            amount bigint NOT NULL CHECK(amount>0 AND amount<=99999999),
            flow text NOT NULL CHECK(flow IN ('hosted','api_test')),
            state text NOT NULL DEFAULT 'created',
            payment_intent text UNIQUE, charge text UNIQUE, balance_transaction text UNIQUE,
            created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_ref,request_key)
        );
        CREATE TABLE stripe_test_line (
            id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES stripe_test_order,
            offer_id uuid NOT NULL REFERENCES stripe_test_offer,
            account text NOT NULL, quantity integer NOT NULL CHECK(quantity>0 AND quantity<=100),
            item_minor bigint NOT NULL CHECK(item_minor>0),
            shipping_minor bigint NOT NULL CHECK(shipping_minor>=0),
            tax_minor bigint NOT NULL CHECK(tax_minor>=0), UNIQUE(order_id,offer_id)
        );
        CREATE TABLE stripe_test_operation (
            key text PRIMARY KEY, order_id uuid REFERENCES stripe_test_order,
            kind text NOT NULL, request_hash text NOT NULL, fields jsonb NOT NULL,
            state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','complete')),
            remote_id text, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE stripe_test_event (
            id text PRIMARY KEY, type text NOT NULL, object_id text NOT NULL,
            digest text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE stripe_test_journal (
            id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES stripe_test_order,
            business_key text NOT NULL UNIQUE, kind text NOT NULL, currency text NOT NULL,
            evidence jsonb NOT NULL, tx bigint NOT NULL DEFAULT txid_current(),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE stripe_test_posting (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            journal_id uuid NOT NULL REFERENCES stripe_test_journal,
            account text NOT NULL, amount bigint NOT NULL CHECK(amount<>0)
        );
        CREATE TABLE stripe_test_fulfillment (
            line_id uuid PRIMARY KEY REFERENCES stripe_test_line,
            evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE stripe_test_transfer (
            id text PRIMARY KEY, line_id uuid NOT NULL UNIQUE REFERENCES stripe_test_line,
            amount bigint NOT NULL CHECK(amount>0), balance_transaction text,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE stripe_test_refund (
            id text PRIMARY KEY, line_id uuid NOT NULL REFERENCES stripe_test_line,
            operation_key text NOT NULL UNIQUE, item_minor bigint NOT NULL CHECK(item_minor>=0),
            shipping_minor bigint NOT NULL CHECK(shipping_minor>=0),
            tax_minor bigint NOT NULL CHECK(tax_minor>=0), balance_transaction text,
            created_at timestamptz NOT NULL DEFAULT now(),
            CHECK(item_minor+shipping_minor+tax_minor>0)
        );
        CREATE TABLE stripe_test_reversal (
            id text PRIMARY KEY, transfer_id text NOT NULL REFERENCES stripe_test_transfer,
            refund_id text NOT NULL UNIQUE REFERENCES stripe_test_refund,
            amount bigint NOT NULL CHECK(amount>0), balance_transaction text,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE stripe_test_balance_evidence (
            id text PRIMARY KEY, order_id uuid NOT NULL REFERENCES stripe_test_order,
            source text NOT NULL, kind text NOT NULL, currency text NOT NULL,
            amount bigint NOT NULL, fee bigint NOT NULL, net bigint NOT NULL,
            fee_details jsonb NOT NULL, CHECK(amount-fee=net),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE FUNCTION stripe_test_immutable_operation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.key IS DISTINCT FROM OLD.key OR NEW.order_id IS DISTINCT FROM OLD.order_id

                OR NEW.kind IS DISTINCT FROM OLD.kind
                OR NEW.request_hash IS DISTINCT FROM OLD.request_hash

                OR NEW.fields IS DISTINCT FROM OLD.fields
                OR NEW.created_at IS DISTINCT FROM OLD.created_at
                OR (OLD.state='complete' AND NEW IS DISTINCT FROM OLD) THEN
                RAISE EXCEPTION 'Immutable payment operation facts';
            END IF;
            RETURN NEW;
        END $$;
        CREATE TRIGGER stripe_test_operation_facts BEFORE UPDATE ON stripe_test_operation
            FOR EACH ROW EXECUTE FUNCTION stripe_test_immutable_operation();
        CREATE TRIGGER stripe_test_operation_delete BEFORE DELETE ON stripe_test_operation
            FOR EACH ROW EXECUTE FUNCTION reject_mutation();
        CREATE FUNCTION stripe_test_order_facts() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.id IS DISTINCT FROM OLD.id OR NEW.owner_ref IS DISTINCT FROM OLD.owner_ref
                OR NEW.request_key IS DISTINCT FROM OLD.request_key
                OR NEW.request_hash IS DISTINCT FROM OLD.request_hash

                OR NEW.currency IS DISTINCT FROM OLD.currency
                OR NEW.amount IS DISTINCT FROM OLD.amount

                OR NEW.flow IS DISTINCT FROM OLD.flow
                OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
                RAISE EXCEPTION 'Immutable order price and owner';
            END IF;
            RETURN NEW;
        END $$;
        CREATE TRIGGER stripe_test_order_facts BEFORE UPDATE ON stripe_test_order
            FOR EACH ROW EXECUTE FUNCTION stripe_test_order_facts();
        CREATE FUNCTION stripe_test_posting_new_tx() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF NOT EXISTS(SELECT 1 FROM stripe_test_journal
                WHERE id=NEW.journal_id AND tx=txid_current()) THEN
                RAISE EXCEPTION 'Journal is immutable after its creating transaction';
            END IF;
            RETURN NEW;
        END $$;
        CREATE TRIGGER stripe_test_posting_insert BEFORE INSERT ON stripe_test_posting
            FOR EACH ROW EXECUTE FUNCTION stripe_test_posting_new_tx();
        CREATE FUNCTION stripe_test_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF (SELECT count(*)<2 OR coalesce(sum(amount),0)<>0 FROM stripe_test_posting
                WHERE journal_id=NEW.id) THEN RAISE EXCEPTION 'Unbalanced payment journal'; END IF;
            RETURN NEW;
        END $$;
        CREATE CONSTRAINT TRIGGER stripe_test_balance AFTER INSERT ON stripe_test_journal
            DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION stripe_test_balanced();
        DO $$ DECLARE t text; BEGIN
            FOREACH t IN ARRAY ARRAY['stripe_test_offer','stripe_test_line','stripe_test_event',
                'stripe_test_journal','stripe_test_posting','stripe_test_fulfillment',
                'stripe_test_transfer','stripe_test_refund','stripe_test_reversal',
                'stripe_test_balance_evidence'] LOOP
                EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I '
                    'FOR EACH ROW EXECUTE FUNCTION reject_mutation()',t);
            END LOOP;
            FOREACH t IN ARRAY ARRAY['stripe_test_offer','stripe_test_order','stripe_test_line',
                'stripe_test_operation','stripe_test_event','stripe_test_journal','stripe_test_posting',
                'stripe_test_fulfillment','stripe_test_transfer','stripe_test_refund',
                'stripe_test_reversal','stripe_test_balance_evidence'] LOOP
                EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
                IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
                    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon',t); END IF;
                IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
                    EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated',t); END IF;
            END LOOP;
        END $$;
    """)


def downgrade():
    raise RuntimeError(
        "Financial sandbox journals are append-only; destructive rollback prohibited"
    )
