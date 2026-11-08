"""Real PostgreSQL ownership/policy/integrity tests. Fixture users never go to Supabase."""

import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

EXPECTED = {
    "profiles",
    "organizations",
    "organization_members",
    "user_preferences",
    "style_passports",
    "merchant_profiles",
    "professional_profiles",
    "product_categories",
    "products",
    "product_variants",
}
ISSUER = "https://fixture.invalid/auth/v1"


@pytest.fixture
def foundation(db):
    entries = []
    with db.begin() as c:
        for _ in range(2):
            v = {
                k: uuid4()
                for k in [
                    "uid",
                    "internal",
                    "org",
                    "merchant",
                    "professional",
                    "product",
                    "variant",
                ]
            }
            c.execute(text("INSERT INTO auth.users(id) VALUES(:id)"), {"id": v["uid"]})
            c.execute(
                text("INSERT INTO profiles(id,display_name) VALUES(:id,'Local fixture')"),
                {"id": v["uid"]},
            )
            c.execute(
                text("INSERT INTO app_user(id,issuer,subject) VALUES(:id,:iss,:sub)"),
                {"id": v["internal"], "iss": ISSUER, "sub": str(v["uid"])},
            )
            c.execute(
                text("INSERT INTO organizations(id,name) VALUES(:id,'Local fixture')"),
                {"id": v["org"]},
            )
            c.execute(
                text(
                    "INSERT INTO organization_members(organization_id,user_id,role) VA"
                    "LUES(:o,:u,'owner')"
                ),
                {"o": v["org"], "u": v["internal"]},
            )
            c.execute(
                text(
                    "INSERT INTO merchant_profiles(id,organization_id,display_name) VA"
                    "LUES(:id,:o,'Fixture')"
                ),
                {"id": v["merchant"], "o": v["org"]},
            )
            c.execute(
                text(
                    "INSERT INTO professional_profiles(id,organization_id,display_name"
                    ") VALUES(:id,:o,'Fixture')"
                ),
                {"id": v["professional"], "o": v["org"]},
            )
            c.execute(
                text(
                    "INSERT INTO catalog_listing(id,organization_id,source_sku,workspa"
                    "ce) VALUES(:id,:o,:sku,'merchant')"
                ),
                {"id": v["product"], "o": v["org"], "sku": str(v["product"])},
            )
            c.execute(
                text(
                    "INSERT INTO catalog_revision(listing_id,revision,facts,author_id)"
                    " VALUES(:id,1,'{}',:u)"
                ),
                {"id": v["product"], "u": v["internal"]},
            )
            c.execute(
                text(
                    "INSERT INTO products(id,organization_id,merchant_profile_id,title"
                    ") VALUES(:id,:o,:m,'Fixture')"
                ),
                {"id": v["product"], "o": v["org"], "m": v["merchant"]},
            )
            c.execute(
                text(
                    "INSERT INTO product_variants(id,product_id,organization_id,sku) V"
                    "ALUES(:id,:p,:o,:sku)"
                ),
                {"id": v["variant"], "p": v["product"], "o": v["org"], "sku": str(v["variant"])},
            )
            c.execute(
                text("INSERT INTO user_preferences(profile_id) VALUES(:id)"), {"id": v["uid"]}
            )
            c.execute(text("INSERT INTO style_passports(profile_id) VALUES(:id)"), {"id": v["uid"]})
            entries.append(v)
    return entries


def as_user(c, uid, role="authenticated"):
    c.execute(text("SELECT set_config('request.jwt.claim.sub',:id,true)"), {"id": str(uid)})
    c.execute(
        text("SELECT set_config('request.jwt.claims',:claims,true)"),
        {
            "claims": json.dumps(
                {"iss": ISSUER, "sub": str(uid), "role": role, "session_id": str(uid)}
            )
        },
    )
    assert role in {"authenticated", "anon"}
    c.execute(text("SET LOCAL ROLE " + role))


def test_requested_base_tables_rls_and_policies_exist_without_duplicate_orgs(db):
    with db.connect() as c:
        names = set(
            c.scalars(
                text(
                    "SELECT table_name FROM information_schema.tables WHERE table_sche"
                    "ma='public' AND table_type='BASE TABLE'"
                )
            )
        )
        assert EXPECTED <= names
        assert not {"organization", "organization_member"} & names
        for name in EXPECTED:
            assert c.scalar(
                text("SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(:name)"),
                {"name": "public." + name},
            )
            assert (
                c.scalar(
                    text(
                        "SELECT count(*) FROM pg_policies WHERE schemaname='public' AND ta"
                        "blename=:name"
                    ),
                    {"name": name},
                )
                > 0
            )
        assert (
            c.scalar(
                text(
                    "SELECT count(*) FROM pg_constraint WHERE contype='f' AND conrelid"
                    "='profiles'::regclass AND confrelid='auth.users'::regclass"
                )
            )
            == 1
        )


@pytest.mark.parametrize(
    "name",
    [
        "profiles",
        "user_preferences",
        "style_passports",
        "organizations",
        "organization_members",
        "merchant_profiles",
        "professional_profiles",
        "products",
        "product_variants",
    ],
)
def test_two_user_and_org_isolation(db, foundation, name):
    with db.begin() as c:
        as_user(c, foundation[0]["uid"])
        assert c.scalar(text("SELECT count(*) FROM " + name)) == 1


def test_preference_update_works_only_for_owner_without_ownership_reassignment(db, foundation):
    a, b = foundation
    with db.begin() as c:
        as_user(c, a["uid"])
        assert (
            c.execute(
                text("UPDATE user_preferences SET locale='fr' WHERE profile_id=:id"),
                {"id": a["uid"]},
            ).rowcount
            == 1
        )
        assert (
            c.execute(
                text("UPDATE user_preferences SET locale='de' WHERE profile_id=:id"),
                {"id": b["uid"]},
            ).rowcount
            == 0
        )
    with pytest.raises(DBAPIError), db.begin() as c:
        as_user(c, a["uid"])
        c.execute(
            text("UPDATE user_preferences SET profile_id=:b WHERE profile_id=:a"),
            {"a": a["uid"], "b": b["uid"]},
        )


def test_cannot_insert_another_users_profile_or_passport(db, foundation):
    with pytest.raises(DBAPIError), db.begin() as c:
        as_user(c, foundation[0]["uid"])
        c.execute(text("INSERT INTO profiles(id) VALUES(:id)"), {"id": uuid4()})
    with pytest.raises(DBAPIError), db.begin() as c:
        as_user(c, foundation[0]["uid"])
        c.execute(
            text("INSERT INTO style_passports(profile_id) VALUES(:id)"),
            {"id": foundation[1]["uid"]},
        )


@pytest.mark.parametrize(
    "name",
    [
        "organizations",
        "organization_members",
        "merchant_profiles",
        "professional_profiles",
        "products",
        "product_variants",
    ],
)
def test_membership_revocation_denies_org_reads(db, foundation, name):
    with db.begin() as c:
        c.execute(
            text("UPDATE organization_members SET active=false WHERE user_id=:id"),
            {"id": foundation[0]["internal"]},
        )
        as_user(c, foundation[0]["uid"])
        assert c.scalar(text("SELECT count(*) FROM " + name)) == 0


def test_client_cannot_promote_membership_or_publish_catalog(db, foundation):
    for statement, params in [
        (
            "UPDATE organization_members SET role='owner' WHERE user_id=:id",
            {"id": foundation[0]["internal"]},
        ),
        ("UPDATE products SET title='Unreviewed' WHERE id=:id", {"id": foundation[0]["product"]}),
        (
            "UPDATE merchant_profiles SET verification_status='verified' WHERE id=:id",
            {"id": foundation[0]["merchant"]},
        ),
    ]:
        with pytest.raises(DBAPIError), db.begin() as c:
            as_user(c, foundation[0]["uid"])
            c.execute(text(statement), params)


def test_cross_org_product_variant_reference_is_rejected(db, foundation):
    with pytest.raises(DBAPIError), db.begin() as c:
        c.execute(
            text(
                "INSERT INTO product_variants(product_id,organization_id,sku) VALU"
                "ES(:p,:o,'wrong-org')"
            ),
            {"p": foundation[0]["product"], "o": foundation[1]["org"]},
        )


def test_anonymous_only_reads_approved_categories(db, foundation):
    with db.begin() as c:
        c.execute(
            text(
                "INSERT INTO product_categories(slug,name,is_active) VALUES('activ"
                "e','Active',true),('draft','Draft',false)"
            )
        )
        as_user(c, foundation[0]["uid"], "anon")
        assert list(c.scalars(text("SELECT slug FROM product_categories"))) == ["active"]
    with pytest.raises(DBAPIError), db.begin() as c:
        as_user(c, foundation[0]["uid"], "anon")
        c.execute(text("SELECT * FROM profiles"))
