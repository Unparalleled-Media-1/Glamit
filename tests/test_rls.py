from sqlalchemy import text


def test_foundation_tables_have_deny_by_default_client_rls(db, client, policy):
    assert (
        client.post(
            f"/v1/policies/{policy}/consent",
            json={"action": "granted"},
            headers={"Idempotency-Key": "consent"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/v1/looks", json={"title": "Private"}, headers={"Idempotency-Key": "private"}
        ).status_code
        == 201
    )
    with db.begin() as connection:
        # A non-login probe role in the disposable test cluster; no customer credentials.
        connection.execute(
            text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='glam_rls_test_probe') THEN
                    CREATE ROLE glam_rls_test_probe NOLOGIN;
                END IF;
            END $$;
        """)
        )
        assert (
            connection.scalar(
                text("SELECT relrowsecurity FROM pg_class WHERE oid='public.look'::regclass")
            )
            is True
        )
        assert connection.scalar(text("SELECT count(*) FROM look")) == 1
        # Even an accidental table SELECT grant must not expose customer rows.
        connection.execute(text("GRANT SELECT ON look TO glam_rls_test_probe"))
        connection.execute(text("SET LOCAL ROLE glam_rls_test_probe"))
        assert connection.scalar(text("SELECT count(*) FROM look")) == 0
