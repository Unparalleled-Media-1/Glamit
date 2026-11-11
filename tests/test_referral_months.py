"""Real disposable PostgreSQL awards; qualification proofs are explicit test fixtures."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from glam_api.payments.config import PaymentError
from glam_api.referrals import QualifiedReferral, ReferralPolicy, award_month, earned_months
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError


@pytest.fixture
def referral(db):
    ids = [uuid4() for _ in range(5)]
    with db.begin() as c:
        for identifier in ids:
            c.execute(
                text("INSERT INTO app_user(id,issuer,subject) VALUES(:id,'test',:subject)"),
                {"id": identifier, "subject": str(identifier)},
            )
    now = datetime.now(UTC)
    proof = QualifiedReferral(
        ids[0],
        ids[1],
        str(uuid4()),
        "first_subscription_payment",
        now - timedelta(minutes=3),
        now - timedelta(minutes=2),
        now,
        first_paid_subscription=True,
        paid_amount_minor=150,
    )
    return proof, ids


POLICY = ReferralPolicy()


def test_one_month_per_person_stacks_without_rewarding_the_same_person_twice(db, referral):
    proof, ids = referral
    with db.begin() as c:
        for person in ids[1:4]:
            p = replace(proof, referred_id=person, source_event_id=str(uuid4()))
            first = award_month(c, p, policy=POLICY)
            again = award_month(c, p, policy=POLICY)
            assert first["new_award"] is True and again["new_award"] is False
            assert first["id"] == again["id"] and first["months"] == 1
        assert earned_months(c, proof.referrer_id) == 3
        assert earned_months(c, proof.referred_id) == 0


def test_parallel_event_replays_award_exactly_one_month(db, referral):
    proof, _ = referral

    def run(_):
        with db.begin() as c:
            return award_month(c, proof, policy=POLICY)

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(run, range(4)))
    assert sum(r["new_award"] for r in results) == 1
    with db.connect() as c:
        assert earned_months(c, proof.referrer_id) == 1


def test_self_referral_is_rejected_in_code_and_database(db, referral):
    proof, _ = referral
    with db.begin() as c:
        with pytest.raises(PaymentError, match="self_or_invalid"):
            award_month(c, replace(proof, referred_id=proof.referrer_id), policy=POLICY)
        with pytest.raises(DBAPIError), c.begin_nested():
            c.execute(
                text("""INSERT INTO subscription_referral_award
                (id,referrer_id,referred_id,source_event_id,qualification_kind,policy_version,reward_months)
                VALUES(:id,:owner,:owner,'test-event','first_subscription_payment','test',1)"""),
                {"id": uuid4(), "owner": proof.referrer_id},
            )


def test_one_new_person_cannot_be_awarded_to_two_referrers(db, referral):
    proof, ids = referral
    with db.begin() as c:
        award_month(c, proof, policy=POLICY)
        with pytest.raises(PaymentError, match="already_attributed"):
            award_month(
                c, replace(proof, referrer_id=ids[4], source_event_id=str(uuid4())), policy=POLICY
            )
        assert earned_months(c, proof.referrer_id) == 1
        assert earned_months(c, ids[4]) == 0


def test_an_event_cannot_be_reused_for_a_different_person(db, referral):
    proof, ids = referral
    with db.begin() as c:
        award_month(c, proof, policy=POLICY)
        with pytest.raises(PaymentError, match="event_reused"):
            award_month(c, replace(proof, referred_id=ids[2]), policy=POLICY)
        assert earned_months(c, proof.referrer_id) == 1


def test_unconfigured_policy_never_awards_a_free_month(db, referral):
    proof, _ = referral
    with db.begin() as c:
        with pytest.raises(PaymentError, match="qualification_not_configured"):
            award_month(c, proof, policy=ReferralPolicy(qualifying_event=None))
        assert earned_months(c, proof.referrer_id) == 0


def test_signup_events_never_qualify_for_the_approved_paid_referral_policy(db, referral):
    proof, _ = referral
    with db.begin() as c:
        with pytest.raises(PaymentError, match="event_not_qualified"):
            award_month(c, replace(proof, kind="verified_new_account"))
        assert earned_months(c, proof.referrer_id) == 0


@pytest.mark.parametrize("first,amount", [(False, 150), (True, 0), (True, -1), (True, True)])
def test_renewals_free_trials_and_unpaid_events_cannot_earn_months(db, referral, first, amount):
    proof, _ = referral
    with db.begin() as c:
        with pytest.raises(PaymentError, match="first_successful_subscription_payment_required"):
            award_month(
                c,
                replace(
                    proof,
                    kind="first_subscription_payment",
                    first_paid_subscription=first,
                    paid_amount_minor=amount,
                ),
            )
        assert earned_months(c, proof.referrer_id) == 0


def test_approved_default_rewards_monthly_or_yearly_first_payment_only_once(db, referral):
    proof, ids = referral
    with db.begin() as c:
        for person, amount in [(ids[1], 150), (ids[2], 1500)]:
            p = replace(
                proof,
                referred_id=person,
                kind="first_subscription_payment",
                source_event_id=str(uuid4()),
                first_paid_subscription=True,
                paid_amount_minor=amount,
            )
            assert award_month(c, p)["new_award"] is True
            assert award_month(c, p)["new_award"] is False
        assert earned_months(c, proof.referrer_id) == 2


def test_referral_attributed_after_first_payment_is_rejected(db, referral):
    proof, _ = referral
    with db.begin() as c:
        with pytest.raises(PaymentError, match="attribution_before_first_payment"):
            award_month(
                c,
                replace(proof, attributed_at=proof.qualified_at + timedelta(seconds=1)),
                policy=POLICY,
            )


def test_existing_nonpaying_account_can_qualify_on_its_first_payment(db, referral):
    proof, _ = referral
    with db.begin() as c:
        award = award_month(
            c, replace(proof, account_created_at=proof.attributed_at - timedelta(days=30))
        )
        assert award["months"] == 1


def test_awards_are_immutable_and_client_database_roles_cannot_read_or_write_them(db, referral):
    proof, _ = referral
    with db.begin() as c:
        award_month(c, proof, policy=POLICY)
        for sql in [
            "UPDATE subscription_referral_award SET reward_months=2",
            "DELETE FROM subscription_referral_award",
        ]:
            with pytest.raises(DBAPIError, match="immutable"), c.begin_nested():
                c.execute(text(sql))
        for role in ["anon", "authenticated"]:
            c.execute(text(f"SET LOCAL ROLE {role}"))
            for sql in [
                "SELECT * FROM subscription_referral_award",
                "DELETE FROM subscription_referral_award",
            ]:
                with pytest.raises(DBAPIError), c.begin_nested():
                    c.execute(text(sql))
            c.execute(text("RESET ROLE"))


def test_failed_business_transaction_does_not_leak_an_award(db, referral):
    proof, _ = referral
    with db.connect() as c:
        transaction = c.begin()
        award_month(c, proof, policy=POLICY)
        transaction.rollback()
        assert earned_months(c, proof.referrer_id) == 0
