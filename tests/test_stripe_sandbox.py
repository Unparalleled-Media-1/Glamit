import hashlib
import hmac
import json
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from glam_api.auth import Principal, get_principal
from glam_api.payments.app import create_app
from glam_api.payments.config import PaymentError, StripeTestConfig, eligible_account
from glam_api.payments.ledger import row, rows
from glam_api.payments.service import PaymentSandbox
from glam_api.payments.stripe import form_fields, verify_platform
from glam_api.payments.webhooks import process_webhook, verify_signature
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from stripe_double import StripeDouble


@pytest.fixture
def sandbox(db):
    with db.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE "
                "stripe_test_offer,stripe_test_order,"
                "stripe_test_operation,stripe_test_event CASCADE"
            )
        )
    config = StripeTestConfig(
        SecretStr("sk_test_fixture_not_real"),
        SecretStr("whsec_fixture_not_real"),
        "acct_platform",
        ("acct_merchantA", "acct_merchantB"),
        db.url.render_as_string(hide_password=False),
    )
    gateway = StripeDouble()
    service = PaymentSandbox(db, gateway, config)
    offers = [uuid4(), uuid4()]
    with db.begin() as connection:
        for identifier, account, item, shipping, tax in [
            (offers[0], "acct_merchantA", 10000, 1000, 800),
            (offers[1], "acct_merchantB", 20000, 2000, 1600),
        ]:
            connection.execute(
                text(
                    "INSERT INTO stripe_test_offer"
                    "(id,account,owner_ref,title,currency,unit_minor,"
                    "shipping_minor,tax_minor,stock,kind,source) "
                    "VALUES(:id,:a,'test-merchant','TEST FIXTURE "
                    "item','usd',:i,:s,:t,100,'physical',"
                    "'sandbox_operator_fixture')"
                ),
                {"id": identifier, "a": account, "i": item, "s": shipping, "t": tax},
            )
    return service, gateway, offers


def paid(sandbox):
    service, gateway, offers = sandbox
    order = service.create_order("test-owner", "cart", [(o, 1) for o in offers], "api_test")
    pi = service.checkout(order, "test-owner", "pm_card_visa")
    service.observe_payment(pi["id"])
    with service.engine.connect() as db:
        lines = rows(
            db, "SELECT * FROM stripe_test_line WHERE order_id=:o ORDER BY item_minor", o=order
        )
    return service, gateway, order, lines, pi


def signed(event, now=None):
    stamp = int(time.time() if now is None else now)
    body = json.dumps(event, sort_keys=True).encode()
    signature = hmac.new(
        b"whsec_fixture_not_real", str(stamp).encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    return body, f"t={stamp},v1={signature}"


def test_test_key_local_database_and_account_guards(sandbox):
    service, gateway, _ = sandbox
    assert verify_platform(gateway, service.config)["platform"] == "acct_platform"
    for key in ["sk_live_not_allowed", "rk_live_not_allowed", ""]:
        with pytest.raises(PaymentError, match="test_key"):
            StripeTestConfig(
                SecretStr(key),
                service.config.webhook_secret,
                "acct_platform",
                service.config.connected,
                service.config.database_url,
            )
    with pytest.raises(PaymentError, match="test_database"):
        StripeTestConfig(
            service.config.secret,
            service.config.webhook_secret,
            "acct_platform",
            service.config.connected,
            "postgresql+psycopg://u:p@localhost/production",
        )
    with pytest.raises(PaymentError, match="local"):
        StripeTestConfig(
            service.config.secret,
            service.config.webhook_secret,
            "acct_platform",
            service.config.connected,
            "postgresql+psycopg://u:p@prod.example/glam_test",
        )
    gateway.accounts["acct_merchantA"]["capabilities"]["transfers"] = "inactive"
    with pytest.raises(PaymentError, match="capabilities"):
        verify_platform(gateway, service.config)
    with pytest.raises(PaymentError, match="unapproved"):
        eligible_account(
            gateway.accounts["acct_platform"], "acct_platform", service.config.connected
        )


def test_server_pricing_hosted_checkout_and_owner_bound_order(sandbox):
    service, gateway, offers = sandbox
    order = service.create_order("buyer", "hosted", [(offers[0], 2), (offers[1], 1)])
    assert service.create_order("buyer", "hosted", [(offers[0], 2), (offers[1], 1)]) == order
    with pytest.raises(PaymentError, match="idempotency"):
        service.create_order("buyer", "hosted", [(offers[0], 1)])
    session = service.checkout(order, "buyer")
    assert session["livemode"] is False
    assert (
        sum(line["quantity"] * line["price_data"]["unit_amount"] for line in session["line_items"])
        == 46200
    )
    assert "application_fee_amount" not in str(session)
    assert session["payment_intent_data"]["transfer_group"] == f"glam_test_{order}"
    with pytest.raises(PaymentError, match="owner"):
        service.checkout(order, "attacker")
    assert dict(form_fields({"metadata": {"id": "test"}, "enabled": True}))["enabled"] == "true"


def test_partial_merchant_fulfillment_earns_only_completed_line_and_transfers_once(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    assert service.reconcile(order)["commission_earned"] == 0
    tr = service.fulfill(lines[0].id, "TEST delivery evidence")
    assert tr["amount"] == 10000  # 90% of $100 item + separately attributed $10 shipping.
    assert tr["destination"] == "acct_merchantA"
    assert service.fulfill(lines[0].id, "TEST delivery evidence")["id"] == tr["id"]
    report = service.reconcile(order)
    assert report["commission_earned"] == 1000
    assert report["stripe_actual_fees"] == 1060  # Fixture provider evidence, not a real Stripe fee.
    assert report["posting_balances"][f"merchant_hold:{lines[1].id}"] == -22000
    assert len(report["transfers"]) == 1 and report["reconciled"]
    assert sum(report["posting_balances"].values()) == 0
    assert not report["integration_complete"]


def test_partial_and_full_refund_reverse_commission_and_recover_transfers(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    service.fulfill(lines[0].id, "TEST delivery")
    first = service.refund_to(lines[0].id, 3333, 200, 100)
    assert first["amount"] == 3633
    assert service.refund_to(lines[0].id, 3333, 200, 100)["id"] == first["id"]
    report = service.reconcile(order)
    assert report["commission_earned"] == 667
    assert report["posting_balances"][f"merchant_recoverable:{lines[0].id}"] == 0
    assert report["cash_reconciliation_gap"] == 0
    service.refund_to(lines[0].id, 10000, 1000, 800)
    report = service.reconcile(order)
    assert report["commission_earned"] == 0 and report["reconciled"]
    assert (
        report["stripe_actual_fees"] == 1060
    )  # Original processing fee has not been assumed refunded.
    with service.engine.connect() as db:
        assert db.scalar(text("SELECT sum(amount) FROM stripe_test_reversal")) == 10000
        assert db.scalar(text("SELECT count(*) FROM stripe_test_refund")) == 2
    with pytest.raises(PaymentError, match="exceeds"):
        service.refund_to(lines[0].id, 10001, 1000, 800)


def test_refund_before_fulfillment_no_commission_and_no_merchant_transfer(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    service.refund_to(lines[0].id, 10000, 1000, 800)
    assert service.fulfill(lines[0].id, "TEST returned before delivery") is None
    report = service.reconcile(order)
    assert report["commission_earned"] == 0 and not report["transfers"]
    assert report["reconciled"]


def test_failed_payment_has_no_commission_and_no_transfer(sandbox):
    service, gateway, offers = sandbox
    order = service.create_order("buyer", "failed", [(offers[0], 1)], "api_test")
    pi = service.checkout(order, "buyer", "pm_card_chargeDeclined")
    service.observe_payment(pi["id"])
    with service.engine.connect() as db:
        assert row(db, "SELECT state FROM stripe_test_order WHERE id=:o", o=order).state == "failed"
        line = row(db, "SELECT id FROM stripe_test_line WHERE order_id=:o", o=order)
        assert db.scalar(text("SELECT count(*) FROM stripe_test_journal")) == 0
    with pytest.raises(PaymentError, match="reconciled"):
        service.fulfill(line.id, "TEST invalid fulfilment")


def test_ambiguous_stripe_response_retries_same_key_without_duplicate_effect(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    gateway.unknown_once = True
    with pytest.raises(PaymentError, match="unknown_result"):
        service.fulfill(lines[0].id, "TEST delivered")
    tr = service.fulfill(lines[0].id, "TEST delivered")
    assert tr["amount"] == 10000
    assert len([k for k in gateway.data if k.startswith("tr_")]) == 1
    assert service.reconcile(order)["reconciled"]


def test_concurrent_fulfillment_cannot_pay_a_merchant_twice(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    with ThreadPoolExecutor(max_workers=4) as pool:
        ids = list(
            pool.map(lambda _: service.fulfill(lines[0].id, "TEST delivered")["id"], range(8))
        )
    assert len(set(ids)) == 1
    assert service.reconcile(order)["commission_earned"] == 1000


def test_signed_duplicate_and_out_of_order_webhooks_are_idempotent(sandbox):
    service, gateway, order, lines, pi = paid(sandbox)
    event = {
        "id": "evt_fixture1",
        "livemode": False,
        "type": "payment_intent.succeeded",
        "data": {"object": {"id": pi["id"]}},
    }
    body, header = signed(event)
    assert not process_webhook(service, body, header)["duplicate"]
    assert process_webhook(service, body, header)["duplicate"]
    event.update(id="evt_fixture2", type="payment_intent.payment_failed")
    process_webhook(service, *signed(event))
    report = service.reconcile(order)
    assert report["state"] == "paid"
    assert len([j for j in report["ledger"] if j["kind"] == "capture"]) == 1
    with pytest.raises(PaymentError, match="signature"):
        verify_signature(body + b" ", header, "whsec_fixture_not_real")
    with pytest.raises(PaymentError, match="signature"):
        verify_signature(*signed(event, time.time() - 301), "whsec_fixture_not_real")
    event["livemode"] = True
    with pytest.raises(PaymentError, match="signature"):
        process_webhook(service, *signed(event))


def test_dispute_posts_actual_withdrawal_and_fee_and_freezes_remaining_transfers(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    service.fulfill(lines[0].id, "TEST delivered")
    charge = service.reconcile(order)["charge_id"]
    dispute = gateway.dispute(charge, "lost")
    service.observe_dispute(dispute)
    service.observe_dispute(dispute)
    report = service.reconcile(order)
    assert report["state"] == "disputed"
    assert report["stripe_actual_fees"] == 2560
    assert report["posting_balances"]["dispute_loss"] == 35400
    assert report["cash_reconciliation_gap"] == 0
    with pytest.raises(PaymentError, match="reconciled"):
        service.fulfill(lines[1].id, "TEST held delivery")


def test_immutable_balanced_ledger_and_order_facts_enforced_by_postgres(sandbox):
    service, _, order, _, _ = paid(sandbox)
    for query in [
        "UPDATE stripe_test_journal SET kind='tampered'",
        "DELETE FROM stripe_test_posting",
        "UPDATE stripe_test_order SET amount=1",
    ]:
        with pytest.raises(DBAPIError), service.engine.begin() as db:
            db.execute(text(query))
    with pytest.raises(DBAPIError), service.engine.begin() as db:
        db.execute(
            text(
                "INSERT INTO stripe_test_journal(id,order_id,business_key,kind,currency,evidence) "
                "VALUES(:id,:o,'unbalanced','test','usd','{}')"
            ),
            {"id": uuid4(), "o": order},
        )
    with service.engine.connect() as db:
        journal = db.scalar(text("SELECT id FROM stripe_test_journal LIMIT 1"))
    with pytest.raises(DBAPIError), service.engine.begin() as db:
        db.execute(
            text(
                "INSERT INTO stripe_test_posting(journal_id,account,amount) VALUES(:j,'tamper',1)"
            ),
            {"j": journal},
        )


def test_onboarding_is_stripe_hosted_and_customer_pricing_fields_are_rejected(sandbox):
    service, gateway, offers = sandbox
    link = service.onboarding("acct_merchantA", "test-link")
    assert link["url"].startswith("https://connect.stripe.com/")
    with pytest.raises(PaymentError, match="merchant"):
        service.onboarding("acct_other", "test-link")
    app = create_app(service.config, service.engine, gateway)
    app.dependency_overrides[get_principal] = lambda: Principal("https://test.invalid", "buyer")
    with TestClient(app) as client:
        response = client.post(
            "/stripe-test/orders",
            headers={"Idempotency-Key": "untrusted"},
            json={"lines": [{"offer_id": str(offers[0]), "quantity": 1, "unit_minor": 1}]},
        )
        assert response.status_code == 422
        assert (
            client.post(
                "/stripe-test/webhook", content=b"{}", headers={"Stripe-Signature": "invalid"}
            ).status_code
            == 409
        )


def test_write_explicit_fixture_financial_report(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    service.fulfill(lines[0].id, "TEST partial merchant delivery")
    service.refund_to(lines[0].id, 3333, 200, 100)
    report = service.reconcile(order)
    report.update(
        evidence_source="ISOLATED STRIPE DOUBLE — NOT ACTUAL STRIPE",
        fees_are="Synthetic fixture amounts returned by test double; not actual Stripe fees",
        local_financial_tests_passed=True,
    )
    target = Path("docs/application-preview/stripe-test-fixture-report.json")
    report = {
        "evidence_source": report.pop("evidence_source"),
        "actual_stripe_api_verified": False,
        "fees_are": report.pop("fees_are"),
        **report,
    }
    target.write_text(json.dumps(report, indent=2) + "\n")
    assert report["reconciled"] and not report["integration_complete"]


def test_unrecorded_remote_transfer_and_refund_cannot_be_called_reconciled(sandbox):
    service, gateway, order, lines, pi = paid(sandbox)
    gateway.call(
        "POST",
        "/v1/transfers",
        {
            "amount": 50,
            "currency": "usd",
            "destination": "acct_merchantA",
            "source_transaction": pi["latest_charge"],
            "transfer_group": f"glam_test_{order}",
        },
        "manual-fixture",
    )
    report = service.reconcile(order)
    assert not report["reconciled"] and report["unknown_transfers"]
    refund = gateway.call(
        "POST",
        "/v1/refunds",
        {"charge": pi["latest_charge"], "amount": 20},
        "manual-refund-fixture",
    )
    assert service.reconcile(order)["unknown_refunds"] == [refund["id"]]
    service.observe_refund(refund["id"])
    report = service.reconcile(order)
    assert report["state"] == "refund_allocation_required"
    assert report["posting_balances"]["refund_allocation_suspense"] == 20
    with pytest.raises(PaymentError, match="reconciled"):
        service.fulfill(lines[0].id, "TEST delivery")


def test_restricted_account_or_changed_balance_evidence_blocks_payout(sandbox):
    service, gateway, order, lines, pi = paid(sandbox)
    gateway.accounts["acct_merchantA"]["payouts_enabled"] = False
    with pytest.raises(PaymentError, match="capabilities"):
        service.fulfill(lines[0].id, "TEST delivery")
    report = service.reconcile(order)
    assert not report["transfers"] and report["commission_earned"] == 0
    bt = gateway.data[gateway.data[pi["latest_charge"]]["balance_transaction"]]
    bt["fee"] += 1
    bt["net"] -= 1
    with pytest.raises(PaymentError, match="evidence_conflict"):
        service.reconcile(order)


def test_success_with_wrong_charge_amount_or_live_object_never_posts(sandbox):
    service, gateway, offers = sandbox
    order = service.create_order("buyer", "wrong", [(offers[0], 1)], "api_test")
    pi = service.checkout(order, "buyer", "pm_card_visa")
    gateway.data[pi["latest_charge"]]["amount"] += 1
    with pytest.raises(PaymentError, match="charge_evidence"):
        service.observe_payment(pi["id"])
    gateway.data[pi["id"]]["livemode"] = True
    with pytest.raises(PaymentError, match="test_stripe"):
        service.observe_payment(pi["id"])
    with service.engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM stripe_test_journal")) == 0


def test_won_dispute_reinstatement_uses_actual_balance_transactions_not_assumed_refund(sandbox):
    service, gateway, order, lines, pi = paid(sandbox)
    dispute = gateway.dispute(pi["latest_charge"])
    service.observe_dispute(dispute)
    remote = gateway.data[dispute]
    remote["status"] = "won"
    remote["balance_transactions"].append(gateway.bt(dispute, remote["amount"], -1500))
    service.observe_dispute(dispute)
    report = service.reconcile(order)
    assert report["posting_balances"]["dispute_receivable"] == 0
    assert report["stripe_actual_fees"] == 1060
    assert (
        report["reconciled"] and report["state"] == "disputed"
    )  # Release remains a separate reviewed decision.


def test_refund_webhook_recovers_unknown_remote_success_and_reversal_once(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    service.fulfill(lines[0].id, "TEST delivered")
    gateway.unknown_once = True
    with pytest.raises(PaymentError, match="unknown_result"):
        service.refund_to(lines[0].id, 3333)
    refund_id = next(k for k in gateway.data if k.startswith("re_"))
    event = {
        "id": "evt_refund_fixture",
        "livemode": False,
        "type": "refund.updated",
        "data": {"object": {"id": refund_id}},
    }
    process_webhook(service, *signed(event))
    process_webhook(service, *signed(event))
    report = service.reconcile(order)
    assert report["commission_earned"] == 667 and report["reconciled"]
    with service.engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM stripe_test_refund")) == 1
        assert db.scalar(text("SELECT count(*) FROM stripe_test_reversal")) == 1


def test_copied_order_metadata_without_server_binding_is_rejected(sandbox):
    service, gateway, order, _, pi = paid(sandbox)
    gateway.data[pi["id"]]["metadata"]["glam_binding"] = "forged"
    with pytest.raises(PaymentError, match="operation_binding"):
        service.observe_payment(pi["id"])


def test_external_refund_freeze_survives_late_payment_webhook(sandbox):
    service, gateway, order, _, pi = paid(sandbox)
    refund = gateway.call(
        "POST", "/v1/refunds", {"charge": pi["latest_charge"], "amount": 20}, "manual"
    )
    service.observe_refund(refund["id"])
    service.observe_payment(pi["id"])
    assert service.reconcile(order)["state"] == "refund_allocation_required"


def test_unconfigured_auth_is_not_bypassed_by_sandbox_api(sandbox):
    service, gateway, offers = sandbox
    with TestClient(create_app(service.config, service.engine, gateway)) as client:
        result = client.post(
            "/stripe-test/orders",
            headers={"Idempotency-Key": "no-auth"},
            json={"lines": [{"offer_id": str(offers[0]), "quantity": 1}]},
        )
        assert result.status_code in {401, 503}


def test_expired_unknown_operation_is_not_reissued_with_a_new_key(sandbox):
    service, gateway, order, lines, _ = paid(sandbox)
    gateway.unknown_once = True
    with pytest.raises(PaymentError):
        service.fulfill(lines[0].id, "TEST delivered")
    # Immutable operation time cannot be edited. Test the boundary by freezing the service clock.
    from datetime import UTC, datetime, timedelta
    from unittest.mock import patch

    class FutureClock:
        @staticmethod
        def now(zone):
            return datetime.now(UTC) + timedelta(hours=24)

    before = len([c for c in gateway.calls if c[0] == "POST"])
    with (
        patch("glam_api.payments.service.datetime", FutureClock),
        pytest.raises(PaymentError, match="manual_reconciliation"),
    ):
        service.fulfill(lines[0].id, "TEST delivered")
    assert len([c for c in gateway.calls if c[0] == "POST"]) == before


def test_real_402_style_decline_can_be_resolved_without_retrying_charge(sandbox):
    from glam_api.payments.config import PaymentDeclined

    service, gateway, offers = sandbox
    real_call = gateway.call

    def declined(method, path, fields=None, key=None):
        result = real_call(method, path, fields, key)
        if method == "POST" and path == "/v1/payment_intents":
            raise PaymentDeclined(result["id"])
        return result

    gateway.call = declined
    order = service.create_order("buyer", "real-decline-shape", [(offers[0], 1)], "api_test")
    pi = service.checkout(order, "buyer", "pm_card_chargeDeclined")
    assert pi["status"] == "requires_payment_method"
    with service.engine.connect() as db:
        assert row(db, "SELECT state FROM stripe_test_order WHERE id=:o", o=order).state == "failed"
        assert db.scalar(text("SELECT count(*) FROM stripe_test_journal")) == 0
    assert len([c for c in gateway.calls if c[0] == "POST"]) == 1


def test_sandbox_rls_hides_financial_records_from_client_role(sandbox):
    service, _, order, _, _ = paid(sandbox)
    with service.engine.begin() as db:
        db.execute(
            text(
                "DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE "
                "rolname='glam_stripe_probe') "
                "THEN CREATE ROLE glam_stripe_probe NOLOGIN; END IF; END $$;"
            )
        )
        db.execute(text("GRANT USAGE ON SCHEMA public TO glam_stripe_probe"))
        db.execute(
            text("GRANT SELECT ON stripe_test_journal,stripe_test_order TO glam_stripe_probe")
        )
        db.execute(text("SET LOCAL ROLE glam_stripe_probe"))
        assert db.scalar(text("SELECT count(*) FROM stripe_test_journal")) == 0
        assert db.scalar(text("SELECT count(*) FROM stripe_test_order")) == 0


def test_sandbox_does_not_modify_existing_credit_or_commercial_policy_records(sandbox):
    service, gateway, offers = sandbox
    with service.engine.connect() as db:
        before = db.scalar(text("SELECT count(*) FROM credit_journal"))
    order = service.create_order("buyer", "separate-ledger", [(offers[0], 1)], "api_test")
    pi = service.checkout(order, "buyer", "pm_card_visa")
    service.observe_payment(pi["id"])
    with service.engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM credit_journal")) == before


def test_unallocated_dashboard_refund_cannot_be_followed_by_another_line_refund(sandbox):
    service, gateway, order, lines, pi = paid(sandbox)
    gateway.call("POST", "/v1/refunds", {"charge": pi["latest_charge"], "amount": 200}, "dashboard")
    with pytest.raises(PaymentError, match="unallocated_remote"):
        service.refund_to(lines[0].id, 300)
    assert len([key for key in gateway.data if key.startswith("re_")]) == 1


def test_cash_balance_without_refund_allocation_is_not_full_reconciliation(sandbox):
    service, gateway, order, _, pi = paid(sandbox)
    refund = gateway.call(
        "POST", "/v1/refunds", {"charge": pi["latest_charge"], "amount": 20}, "manual"
    )
    service.observe_refund(refund["id"])
    report = service.reconcile(order)
    assert report["cash_reconciled"] and report["allocation_review_required"]
    assert not report["reconciled"]


def test_explicit_operator_exercise_is_idempotent_and_reports_test_subset_only(sandbox):
    from scripts.stripe_test import exercise

    service, gateway, _ = sandbox
    run_id = uuid4()
    first = exercise(service, run_id)
    second = exercise(service, run_id)
    assert first["actual_stripe_financial_subset_passed"]
    assert first["success_refund_multimerchant"]["commission_earned"] == 2000
    assert (
        second["success_refund_multimerchant"]["transfers"]
        == first["success_refund_multimerchant"]["transfers"]
    )
    assert not first["integration_complete"]


def test_pre_fulfillment_refund_never_reverses_unearned_commission(sandbox):
    service, _, order, lines, _ = paid(sandbox)
    service.refund_to(lines[0].id, 3333)
    transfer = service.fulfill(lines[0].id, "TEST remaining item delivered")
    assert transfer["amount"] == 7000
    service.refund_to(lines[0].id, 10000, 1000, 800)
    report = service.reconcile(order)
    line = next(row for row in report["lines"] if row["line_id"] == str(lines[0].id))
    assert line["earned_commission_minor"] == 0
    assert line["commission_reversal_minor"] == 667
    assert report["reconciled"]


def test_pending_or_action_required_payment_is_not_a_failed_or_completed_sale(sandbox):
    service, gateway, offers = sandbox
    order = service.create_order("buyer", "pending-states", [(offers[0], 1)], "api_test")
    pi = service.checkout(order, "buyer", "pm_card_visa")
    for status, expected in [
        ("requires_action", "requires_action"),
        ("processing", "processing"),
        ("requires_payment_method", "failed"),
    ]:
        gateway.data[pi["id"]]["status"] = status
        service.observe_payment(pi["id"])
        with service.engine.connect() as db:
            assert (
                row(db, "SELECT state FROM stripe_test_order WHERE id=:o", o=order).state
                == expected
            )
            assert db.scalar(text("SELECT count(*) FROM stripe_test_journal")) == 0


def test_stripe_http_transport_rejects_live_objects_redirects_and_unkeyed_writes(
    sandbox, monkeypatch
):
    from glam_api.payments.stripe import StripeTestGateway

    service, _, _ = sandbox
    transport = StripeTestGateway(service.config)
    responses = [{"id": "pi_live_fixture", "livemode": True}]

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def read(self, size):
            return json.dumps(responses[0]).encode()

    class Opener:
        def open(self, request, timeout):
            assert request.full_url.startswith("https://api.stripe.com/v1/")
            return Response()

    monkeypatch.setattr("glam_api.payments.stripe.build_opener", lambda *handlers: Opener())
    with pytest.raises(PaymentError, match="live_stripe"):
        transport.call("GET", "/v1/payment_intents/pi_live_fixture")
    with pytest.raises(PaymentError, match="idempotency"):
        transport.call("POST", "/v1/transfers", {})

    def redirect(*handlers):
        handler = next(h for h in handlers if hasattr(h, "redirect_request"))
        handler.redirect_request(None, None, 302, "", {}, "https://attacker.invalid")

    monkeypatch.setattr("glam_api.payments.stripe.build_opener", redirect)
    with pytest.raises(PaymentError, match="redirect_rejected"):
        transport.call("GET", "/v1/account")
