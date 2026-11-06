"""Explicit operator-only Stripe test tool. Never reads .env or initializes production/Supabase."""

import argparse
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid5

from glam_api.payments.config import LEGAL_ENTITY, PaymentError, StripeTestConfig
from glam_api.payments.ledger import row
from glam_api.payments.service import PaymentSandbox
from glam_api.payments.stripe import StripeTestGateway, verify_platform
from sqlalchemy import create_engine, text

REQUIRED = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_ACCOUNT_ID",
    "STRIPE_TEST_CONNECTED_ACCOUNT_ID",
    "STRIPE_TEST_DATABASE_URL",
    "STRIPE_TEST_RETURN_URL",
    "STRIPE_TEST_REFRESH_URL",
]


def exercise(service, run_id):
    """Real Stripe test API only; synthetic merchandise is explicitly a sandbox catalog fixture."""
    if len(service.config.connected) < 2:
        raise PaymentError(
            "two_eligible_connected_test_accounts_required_for_multimerchant_acceptance"
        )
    verify_platform(service.gateway, service.config)
    offers = []
    with service.engine.begin() as db:
        for index, account in enumerate(service.config.connected[:2]):
            identifier = uuid5(run_id, account)
            offers.append(identifier)
            facts = {
                "id": identifier,
                "a": account,
                "i": 10000 * (index + 1),
                "s": 1000 * (index + 1),
                "t": 800 * (index + 1),
            }
            db.execute(
                text(
                    "INSERT INTO stripe_test_offer "
                    "(id,account,owner_ref,title,currency,unit_minor,"
                    "shipping_minor,tax_minor,stock,kind,source) "
                    "VALUES(:id,:a,'sandbox-operator','STRIPE TEST FIXTURE "
                    "item','usd',:i,:s,:t,100,"
                    "'physical','sandbox_operator_fixture') ON CONFLICT DO NOTHING"
                ),
                facts,
            )
            existing = row(db, "SELECT * FROM stripe_test_offer WHERE id=:id", id=identifier)
            if (
                existing.account != account
                or existing.unit_minor != facts["i"]
                or existing.kind != "physical"
            ):
                raise PaymentError("sandbox_fixture_price_conflict")
    owner = "sandbox-operator:" + str(run_id)
    order = service.create_order(
        owner, "success:" + str(run_id), [(o, 1) for o in offers], "api_test"
    )
    pi = service.checkout(order, owner, "pm_card_visa")
    service.observe_payment(pi["id"])
    with service.engine.connect() as db:
        lines = (
            db.execute(
                text("SELECT id FROM stripe_test_line WHERE order_id=:o ORDER BY item_minor"),
                {"o": order},
            )
            .scalars()
            .all()
        )
    first = service.fulfill(lines[0], "Stripe test exercise: fixture merchant A fulfillment")
    service.refund_to(lines[0], 3333, 200, 100)
    service.fulfill(lines[1], "Stripe test exercise: fixture merchant B fulfillment")
    service.refund_to(lines[0], 10000, 1000, 800)
    if service.fulfill(lines[0], "Stripe test duplicate fulfillment")["id"] != first["id"]:
        raise PaymentError("duplicate_transfer_detected")
    result = service.reconcile(order)
    if result["commission_earned"] != 2000 or not result["reconciled"]:
        raise PaymentError("actual_stripe_commission_or_reconciliation_failed")
    failed_order = service.create_order(
        owner, "failure:" + str(run_id), [(offers[0], 1)], "api_test"
    )
    failed = service.checkout(failed_order, owner, "pm_card_chargeDeclined")
    service.observe_payment(failed["id"])
    failure = service.reconcile(failed_order)
    if failure["state"] != "failed" or failure["ledger"] or failure["transfers"]:
        raise PaymentError("failed_payment_produced_financial_effect")
    return {
        "run_id": str(run_id),
        "success_refund_multimerchant": result,
        "failure": failure,
        "catalog_source": "sandbox_operator_fixture (not real merchandise)",
        "actual_stripe_financial_subset_passed": True,
        "dispute_and_provider_webhook_delivery": "separate actual evidence still required",
        "integration_complete": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["readiness", "probe", "reconcile", "exercise"])
    parser.add_argument("--order-id", type=UUID)
    parser.add_argument("--run-id", type=UUID)
    parser.add_argument("--confirm-test-only", action="store_true")
    parser.add_argument(
        "--report", default="docs/application-preview/stripe-test-actual-report.json"
    )
    args = parser.parse_args()
    result = {
        "observed_at": datetime.now(UTC).isoformat(),
        "legal_entity": LEGAL_ENTITY,
        "mode": "test",
        "status": "NOT CONFIGURED",
        "integration_complete": False,
        "actual_stripe_payment_ids": [],
        "actual_stripe_transfer_ids": [],
        "actual_stripe_fees": None,
        "actual_reconciliation": None,
        "existing_97_test_balance_is_commission_proof": False,
        "missing_settings": [k for k in REQUIRED if not os.environ.get(k)],
    }
    exit_code = 0
    try:
        if result["missing_settings"]:
            raise PaymentError("stripe_test_configuration_incomplete")
        config = StripeTestConfig.from_environment()
        result["status"] = "CONFIGURED — CONNECTIVITY NOT VERIFIED"
        if args.command != "readiness":
            gateway = StripeTestGateway(config)
            result["verification"] = verify_platform(gateway, config)
            result["status"] = "CONNECTED — TEST API ONLY"
            if args.command == "probe":
                snapshot = gateway.call("GET", "/v1/balance")
                if snapshot.get("livemode") is not False:
                    raise PaymentError("test_balance_scope_required")
                result["platform_balance_snapshot"] = {
                    k: snapshot.get(k) for k in ["available", "pending"]
                }
                result["balance_note"] = "Global balance is not allocated commission evidence."
            if args.command in {"reconcile", "exercise"}:
                engine = create_engine(config.database_url, hide_parameters=True)
                try:
                    service = PaymentSandbox(engine, gateway, config)
                    if args.command == "reconcile":
                        if not args.order_id:
                            raise PaymentError("sandbox_order_id_required")
                        result["actual_reconciliation"] = service.reconcile(args.order_id)
                    else:
                        if not args.confirm_test_only or not args.run_id:
                            raise PaymentError(
                                "explicit_test_write_confirmation_and_stable_run_id_required"
                            )
                        result["exercise"] = exercise(service, args.run_id)
                finally:
                    engine.dispose()
        financial = result.get("actual_reconciliation") or result.get("exercise", {}).get(
            "success_refund_multimerchant"
        )
        if financial:
            result["actual_stripe_payment_ids"] = [financial["payment_id"]]
            failure = result.get("exercise", {}).get("failure")
            if failure:
                result["actual_stripe_payment_ids"].append(failure["payment_id"])
            result["actual_stripe_transfer_ids"] = [t["id"] for t in financial["transfers"]]
            result["actual_stripe_fees"] = financial["stripe_actual_fees"]
        result["evidence_source"] = (
            "Stripe test API" if args.command != "readiness" else "configuration only"
        )
    except PaymentError as exc:
        result["status"] = "NOT CONFIGURED" if result["missing_settings"] else "BLOCKED / DEGRADED"
        result["reason"] = str(exc)
        exit_code = 2
    except Exception:
        # Never emit SQL parameters, provider error bodies, bank/card data or secret exception text.
        result.update(status="BLOCKED / DEGRADED", reason="sandbox_schema_or_transport_unavailable")
        exit_code = 2
    output = Path(args.report)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
