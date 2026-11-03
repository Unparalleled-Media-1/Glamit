"""Defend credit account balances and use real event time for privacy deletion boundaries."""

from alembic import op

revision = "0002_credit_safety"
down_revision = "0001_foundations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE look ALTER COLUMN created_at SET DEFAULT clock_timestamp()")
    op.execute("""
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
    """)
    op.execute("""
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
    """)


def downgrade() -> None:
    raise RuntimeError("Removing financial safeguards requires explicit review and approval")
