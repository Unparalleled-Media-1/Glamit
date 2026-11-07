import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import bindparam

from glam_api.commerce_policy import POLICY_VERSION, calculate_item_commission
from glam_api.payments.config import (
    PaymentDeclined,
    PaymentError,
    StripeTestConfig,
    eligible_account,
)
from glam_api.payments.ledger import (
    balance,
    digest,
    lock,
    post,
    row,
    rows,
    serialized,
    serialized_line,
    test_object,
)
from glam_api.payments.stripe import Gateway, verify_platform


class PaymentSandbox:
    def __init__(self, engine, gateway: Gateway, config: StripeTestConfig):
        if not (engine.url.database or "").endswith("_test") or engine.url.host not in {
            "localhost",
            "127.0.0.1",
            "postgres",
        }:
            raise PaymentError("isolated_test_database_required")
        self.engine, self.gateway, self.config = engine, gateway, config

    def _binding(self, order):
        return hmac.new(
            self.config.webhook_secret.get_secret_value().encode(),
            ("glam-payment-binding-v1:" + str(order.id) + ":" + order.request_hash).encode(),
            hashlib.sha256,
        ).hexdigest()

    def _order(self, db, identifier):
        value = row(db, "SELECT * FROM stripe_test_order WHERE id=:id FOR UPDATE", id=identifier)
        if not value:
            raise PaymentError("unknown_sandbox_order")
        return value

    def _operation(
        self, order, key, kind, path, fields, effect=lambda db, result: None, read_path=None
    ):
        # Persist intent BEFORE the external effect; unknown outcomes reuse the same Stripe key.
        # Never invent a replacement key after an ambiguous response or the provider
        # retention window.
        request_hash = digest({"kind": kind, "path": path, "fields": fields})
        with self.engine.begin() as db:
            lock(db, order or key)
            existing = row(db, "SELECT * FROM stripe_test_operation WHERE key=:k", k=key)
            if existing and existing.request_hash != request_hash:
                raise PaymentError("payment_idempotency_conflict")
            other = row(
                db,
                "SELECT key FROM stripe_test_operation WHERE order_id=:o "
                "AND key<>:k AND state='pending'",
                o=order,
                k=key,
            )
            if other:
                raise PaymentError("prior_unknown_operation_requires_reconciliation")
            if not existing:
                db.execute(
                    text(
                        "INSERT INTO stripe_test_operation(key,order_id,kind,request_hash,fields) "
                        "VALUES(:k,:o,:t,:h,:f)"
                    ).bindparams(bindparam("f", type_=JSONB)),
                    {"k": key, "o": order, "t": kind, "h": request_hash, "f": fields},
                )
        with self.engine.begin() as db:
            lock(db, order or key)
            operation = row(
                db, "SELECT * FROM stripe_test_operation WHERE key=:k FOR UPDATE", k=key
            )
            if operation.state == "complete":
                if read_path and operation.remote_id:
                    return self.gateway.call("GET", read_path + operation.remote_id)
                raise PaymentError("hosted_link_refresh_requires_new_request")
            if datetime.now(UTC) - operation.created_at > timedelta(hours=23):
                raise PaymentError("ambiguous_operation_expired_manual_reconciliation_required")
            result = self.gateway.call("POST", path, fields, "glam-sandbox-" + digest(key))
            if result.get("livemode") is True:
                raise PaymentError("live_stripe_object_rejected")
            if read_path and result.get("id"):
                result = self.gateway.call("GET", read_path + result["id"])
            effect(db, result)
            db.execute(
                text("UPDATE stripe_test_operation SET state='complete',remote_id=:r WHERE key=:k"),
                {"r": result.get("id"), "k": key},
            )
            return result

    def create_order(self, owner, request_key, choices, flow="hosted"):
        # Public request contains offer IDs and quantities only. Prices/merchant IDs
        # never come from it.
        if (
            not owner
            or not request_key
            or len(request_key) > 160
            or flow not in {"hosted", "api_test"}
        ):
            raise PaymentError("invalid_checkout_request")
        if not 1 <= len(choices) <= 20 or len({str(o) for o, _ in choices}) != len(choices):
            raise PaymentError("invalid_checkout_lines")
        for offer, quantity in choices:
            UUID(str(offer))
            if type(quantity) is not int or not 1 <= quantity <= 100:
                raise PaymentError("invalid_quantity")
        facts_hash = digest({"choices": [(str(o), q) for o, q in choices], "flow": flow})
        with self.engine.begin() as db:
            lock(db, owner + ":" + request_key)
            existing = row(
                db,
                "SELECT * FROM stripe_test_order WHERE owner_ref=:u AND request_key=:k",
                u=owner,
                k=request_key,
            )
            if existing:
                if existing.request_hash != facts_hash:
                    raise PaymentError("checkout_idempotency_conflict")
                return existing.id
            selected = []
            for identifier, quantity in sorted(choices, key=lambda x: str(x[0])):
                offer = row(
                    db, "SELECT * FROM stripe_test_offer WHERE id=:id FOR UPDATE", id=identifier
                )
                if (
                    not offer
                    or offer.kind != "physical"
                    or offer.account not in self.config.connected
                ):
                    raise PaymentError("unapproved_physical_test_offer")
                used = db.scalar(
                    text(
                        "SELECT coalesce(sum(quantity),0) FROM stripe_test_line WHERE offer_id=:id"
                    ),
                    {"id": identifier},
                )
                if used + quantity > offer.stock:
                    raise PaymentError("sandbox_stock_not_available")
                selected.append((offer, quantity))
            total = sum(o.unit_minor * q + o.shipping_minor + o.tax_minor * q for o, q in selected)
            if not 0 < total <= 99999999:
                raise PaymentError("checkout_amount_out_of_range")
            identifier = uuid4()
            db.execute(
                text(
                    "INSERT INTO stripe_test_order"
                    "(id,owner_ref,request_key,request_hash,currency,amount,flow) "
                    "VALUES(:id,:u,:k,:h,'usd',:a,:f)"
                ),
                {
                    "id": identifier,
                    "u": owner,
                    "k": request_key,
                    "h": facts_hash,
                    "a": total,
                    "f": flow,
                },
            )
            for offer, quantity in selected:
                db.execute(
                    text(
                        "INSERT INTO stripe_test_line"
                        "(id,order_id,offer_id,account,quantity,item_minor,"
                        "shipping_minor,tax_minor) "
                        "VALUES(:id,:o,:offer,:a,:q,:n,:s,:t)"
                    ),
                    {
                        "id": uuid4(),
                        "o": identifier,
                        "offer": offer.id,
                        "a": offer.account,
                        "q": quantity,
                        "n": offer.unit_minor * quantity,
                        "s": offer.shipping_minor,
                        "t": offer.tax_minor * quantity,
                    },
                )
            return identifier

    def onboarding(self, account, nonce):
        if account not in self.config.connected or not nonce or len(nonce) > 100:
            raise PaymentError("unapproved_test_merchant")
        current = self.gateway.call("GET", "/v1/accounts/" + account)
        if current.get("id") != account or current.get("country") != "US":
            raise PaymentError("onboarding_country_not_approved")
        fields = {
            "account": account,
            "type": "account_onboarding",
            "return_url": self.config.return_url,
            "refresh_url": self.config.refresh_url,
        }
        result = self._operation(
            None, f"onboard:{account}:{nonce}", "onboarding", "/v1/account_links", fields
        )
        from urllib.parse import urlparse

        if urlparse(result.get("url", "")).hostname != "connect.stripe.com" or not result.get(
            "url", ""
        ).startswith("https://"):
            raise PaymentError("invalid_stripe_hosted_onboarding_link")
        # Return URL only to the authorized merchant/operator; never include tokenized
        # links in reports.
        return {"url": result["url"], "expires_at": result.get("expires_at")}

    def checkout(self, order_id, owner, payment_method=None):
        verify_platform(self.gateway, self.config)
        with self.engine.begin() as db:
            lock(db, order_id)
            order = self._order(db, order_id)
            if order.owner_ref != owner:
                raise PaymentError("checkout_owner_mismatch")
            lines = rows(
                db,
                "SELECT l.*,o.title FROM stripe_test_line l "
                "JOIN stripe_test_offer o ON o.id=l.offer_id WHERE order_id=:id",
                id=order_id,
            )
            fields = {
                "amount": order.amount,
                "currency": "usd",
                "transfer_group": f"glam_test_{order_id}",
                "metadata": {
                    "glam_test_order": str(order_id),
                    "glam_binding": self._binding(order),
                },
                "payment_method_types": ["card"],
            }
            if order.flow == "api_test":
                if payment_method not in {"pm_card_visa", "pm_card_chargeDeclined"}:
                    raise PaymentError("documented_test_payment_method_required")
                fields.update(payment_method=payment_method, confirm=True, off_session=True)
                path, kind, read = "/v1/payment_intents", "payment_intent", "/v1/payment_intents/"
            else:
                if payment_method:
                    raise PaymentError("hosted_checkout_does_not_accept_card_data")
                item_rows = []
                for line in lines:
                    for suffix, amount in [
                        ("item", line.item_minor),
                        ("shipping", line.shipping_minor),
                        ("tax", line.tax_minor),
                    ]:
                        if amount:
                            item_rows.append(
                                {
                                    "quantity": line.quantity if suffix == "item" else 1,
                                    "price_data": {
                                        "currency": "usd",
                                        "unit_amount": amount // line.quantity
                                        if suffix == "item"
                                        else amount,
                                        "product_data": {"name": f"{line.title} / {suffix}"},
                                    },
                                }
                            )
                fields = {
                    "mode": "payment",
                    "line_items": item_rows,
                    "payment_method_types": ["card"],
                    "success_url": self.config.return_url,
                    "cancel_url": self.config.refresh_url,
                    "payment_intent_data": {
                        "transfer_group": f"glam_test_{order_id}",
                        "metadata": {
                            "glam_test_order": str(order_id),
                            "glam_binding": self._binding(order),
                        },
                    },
                    "metadata": {
                        "glam_test_order": str(order_id),
                        "glam_binding": self._binding(order),
                    },
                }
                path, kind, read = "/v1/checkout/sessions", "checkout", "/v1/checkout/sessions/"

        def effect(db, result):
            test_object(result, "pi_" if kind == "payment_intent" else "cs_test_")
            pi = result["id"] if kind == "payment_intent" else result.get("payment_intent")
            if pi:
                db.execute(
                    text("UPDATE stripe_test_order SET payment_intent=:p WHERE id=:o"),
                    {"p": pi, "o": order_id},
                )

        try:
            return self._operation(
                order_id, f"checkout:{order_id}", kind, path, fields, effect, read
            )
        except PaymentDeclined as failure:
            self.observe_payment(failure.payment_id)
            return self.gateway.call("GET", "/v1/payment_intents/" + failure.payment_id)

    def observe_payment(self, payment_id):
        pi = test_object(self.gateway.call("GET", "/v1/payment_intents/" + payment_id), "pi_")
        try:
            order_id = UUID(pi.get("metadata", {}).get("glam_test_order", ""))
        except ValueError:
            raise PaymentError("payment_order_binding_missing") from None
        with serialized(self.engine, order_id), self.engine.begin() as db:
            lock(db, order_id)
            order = self._order(db, order_id)
            operation = row(
                db, "SELECT * FROM stripe_test_operation WHERE key=:k", k=f"checkout:{order_id}"
            )
            metadata = (
                operation.fields.get("metadata", {})
                if operation and operation.kind == "payment_intent"
                else (
                    operation.fields.get("payment_intent_data", {}).get("metadata", {})
                    if operation
                    else {}
                )
            )
            if not metadata.get("glam_binding") or not hmac.compare_digest(
                str(pi.get("metadata", {}).get("glam_binding", "")), metadata["glam_binding"]
            ):
                raise PaymentError("payment_operation_binding_mismatch")

            if (
                pi.get("amount") != order.amount
                or pi.get("currency") != order.currency
                or (order.payment_intent and order.payment_intent != payment_id)
            ):
                raise PaymentError("payment_amount_or_binding_mismatch")
            if operation.kind == "payment_intent" and operation.state == "pending":
                db.execute(
                    text(
                        "UPDATE stripe_test_operation SET "
                        "state='complete',remote_id=:p WHERE key=:k"
                    ),
                    {"p": payment_id, "k": operation.key},
                )
            if pi.get("status") != "succeeded":
                pending_states = {
                    "requires_payment_method": "failed",
                    "canceled": "canceled",
                    "processing": "processing",
                    "requires_action": "requires_action",
                    "requires_capture": "awaiting_capture",
                    "requires_confirmation": "awaiting_confirmation",
                }
                if order.state not in {
                    "paid",
                    "paid_fees_pending",
                    "disputed",
                    "refund_allocation_required",
                }:
                    state = pending_states.get(pi.get("status"), "payment_pending")
                    db.execute(
                        text("UPDATE stripe_test_order SET state=:s,payment_intent=:p WHERE id=:o"),
                        {"s": state, "p": payment_id, "o": order_id},
                    )
                return
            charge = test_object(
                self.gateway.call("GET", "/v1/charges/" + pi["latest_charge"]), "ch_"
            )
            if (
                charge.get("payment_intent") != payment_id
                or charge.get("amount") != order.amount
                or (
                    charge.get("currency") != "usd"
                    or not charge.get("paid")
                    or not charge.get("captured")
                )
            ):
                raise PaymentError("captured_charge_evidence_required")
            line_values = rows(db, "SELECT * FROM stripe_test_line WHERE order_id=:o", o=order_id)
            entries = [("stripe_cash", order.amount)]
            for line in line_values:
                entries.extend(
                    [
                        (f"merchant_hold:{line.id}", -(line.item_minor + line.shipping_minor)),
                        (f"tax_liability:{line.id}", -line.tax_minor),
                    ]
                )
            post(
                db,
                order_id,
                "capture:" + charge["id"],
                "capture",
                {"charge": charge["id"]},
                entries,
            )
            bt_id = charge.get("balance_transaction")
            state = "paid_fees_pending"
            if bt_id:
                bt = balance(db, self.gateway, order_id, bt_id, charge["id"], "charge")
                if bt["amount"] != order.amount or bt["fee"] < 0:
                    raise PaymentError("charge_balance_mismatch")
                if bt["fee"]:
                    post(
                        db,
                        order_id,
                        "fee:" + bt_id,
                        "processor_fee",
                        {"balance_transaction": bt_id},
                        [("stripe_fee_expense", bt["fee"]), ("stripe_cash", -bt["fee"])],
                    )
                state = "paid"
            if order.state in {"disputed", "refund_allocation_required"} or charge.get("disputed"):
                state = (
                    order.state
                    if order.state in {"disputed", "refund_allocation_required"}
                    else "disputed"
                )
            db.execute(
                text(
                    "UPDATE stripe_test_order SET state=:s,payment_intent=:p,charge=:c,"
                    "balance_transaction=:b WHERE id=:o"
                ),
                {"s": state, "p": payment_id, "c": charge["id"], "b": bt_id, "o": order_id},
            )

    def _refunded(self, db, line):
        return row(
            db,
            "SELECT coalesce(sum(item_minor),0)::bigint AS "
            "item,coalesce(sum(shipping_minor),0)::bigint "
            "AS shipping,coalesce(sum(tax_minor),0)::bigint AS tax FROM stripe_test_refund "
            "WHERE line_id=:id",
            id=line.id,
        )

    @serialized_line
    def fulfill(self, line_id, evidence_ref):
        with self.engine.begin() as db:
            line = row(db, "SELECT * FROM stripe_test_line WHERE id=:id", id=line_id)
            if not line or not evidence_ref.strip():
                raise PaymentError("verified_fulfillment_required")
            order_id = line.order_id
            lock(db, order_id)
            order = self._order(db, order_id)
            if order.state != "paid":
                raise PaymentError("reconciled_undisputed_payment_required")
            old_transfer = row(
                db, "SELECT * FROM stripe_test_transfer WHERE line_id=:id", id=line_id
            )
            if old_transfer:
                return self.gateway.call("GET", "/v1/transfers/" + old_transfer.id)
            charge = self.gateway.call("GET", "/v1/charges/" + order.charge)
            refunded_total = db.scalar(
                text(
                    "SELECT coalesce(sum(r.item_minor+r.shipping_minor+r.tax_minor),0) "
                    "FROM stripe_test_refund r JOIN stripe_test_line l ON "
                    "l.id=r.line_id WHERE l.order_id=:o"
                ),
                {"o": order_id},
            )
            if charge.get("disputed") or charge.get("amount_refunded", 0) != refunded_total:
                raise PaymentError("charge_has_unreconciled_refund_or_dispute")
            eligible_account(
                self.gateway.call("GET", "/v1/accounts/" + line.account),
                self.config.platform,
                self.config.connected,
            )
            returned = self._refunded(db, line)
            fee = calculate_item_commission(
                final_item_minor=line.item_minor, completed=True, refunded_item_minor=returned.item
            ).earned_commission_minor
            existing = row(
                db, "SELECT * FROM stripe_test_fulfillment WHERE line_id=:id", id=line_id
            )
            if not existing:
                db.execute(
                    text("INSERT INTO stripe_test_fulfillment(line_id,evidence_ref) VALUES(:l,:e)"),
                    {"l": line_id, "e": evidence_ref[:300]},
                )
                if fee:
                    post(
                        db,
                        order_id,
                        f"commission:{line_id}",
                        "commission_earned",
                        {"line": str(line_id), "policy": POLICY_VERSION},
                        [(f"merchant_hold:{line_id}", fee), ("commission_revenue", -fee)],
                    )
            amount = line.item_minor - returned.item - fee + line.shipping_minor - returned.shipping
            if amount == 0:
                return None
            fields = {
                "amount": amount,
                "currency": "usd",
                "destination": line.account,
                "source_transaction": order.charge,
                "transfer_group": f"glam_test_{order_id}",
                "metadata": {"glam_test_line": str(line_id)},
            }

        def effect(db, result):
            test_object(result, "tr_")
            if any(
                result.get(k) != fields[k]
                for k in ["amount", "currency", "destination", "source_transaction"]
            ):
                raise PaymentError("transfer_allocation_mismatch")
            bt = balance(
                db, self.gateway, order_id, result["balance_transaction"], result["id"], "transfer"
            )
            if bt["amount"] != -amount or bt["fee"] < 0:
                raise PaymentError("transfer_balance_mismatch")
            db.execute(
                text(
                    "INSERT INTO stripe_test_transfer(id,line_id,amount,balance_transaction) "
                    "VALUES(:id,:l,:a,:b) ON CONFLICT DO NOTHING"
                ),
                {"id": result["id"], "l": line_id, "a": amount, "b": bt["id"]},
            )
            post(
                db,
                order_id,
                "transfer:" + result["id"],
                "transfer",
                {"transfer": result["id"], "balance_transaction": bt["id"]},
                [
                    (f"merchant_hold:{line_id}", amount),
                    ("stripe_cash", bt["net"]),
                    ("stripe_fee_expense", bt["fee"]),
                ],
            )

        return self._operation(
            order_id,
            f"transfer:{line_id}",
            "transfer",
            "/v1/transfers",
            fields,
            effect,
            "/v1/transfers/",
        )

    @serialized_line
    def refund_to(self, line_id, item_minor, shipping_minor=0, tax_minor=0):
        targets = [item_minor, shipping_minor, tax_minor]
        if any(type(v) is not int or v < 0 for v in targets):
            raise PaymentError("invalid_refund_allocation")
        key = f"refund:{line_id}:" + digest(targets)
        completed = None
        with self.engine.begin() as db:
            line = row(db, "SELECT * FROM stripe_test_line WHERE id=:id", id=line_id)
            order_id = line.order_id
            lock(db, order_id)
            order = self._order(db, order_id)
            if order.state != "paid":
                raise PaymentError("reconciled_undisputed_payment_required")
            old = row(
                db, "SELECT * FROM stripe_test_operation WHERE key=:k AND state='complete'", k=key
            )
            if old:
                completed = old.remote_id
            else:
                pending_own = row(
                    db,
                    "SELECT 1 FROM stripe_test_operation WHERE key=:k AND state='pending'",
                    k=key,
                )
                if not pending_own:
                    current_charge = test_object(
                        self.gateway.call("GET", "/v1/charges/" + order.charge), "ch_"
                    )
                    recorded_total = db.scalar(
                        text(
                            "SELECT coalesce(sum(r.item_minor+r.shipping_minor+r.tax_minor),0) "
                            "FROM stripe_test_refund r JOIN stripe_test_line l ON l.id=r.line_id "
                            "WHERE l.order_id=:o"
                        ),
                        {"o": order_id},
                    )
                    if (
                        current_charge.get("disputed")
                        or current_charge.get("amount_refunded", 0) != recorded_total
                    ):
                        raise PaymentError("unallocated_remote_refund_or_dispute_requires_review")
                previous = self._refunded(db, line)
                if any(
                    v < prior or v > original
                    for v, prior, original in zip(
                        targets,
                        [previous.item, previous.shipping, previous.tax],
                        [line.item_minor, line.shipping_minor, line.tax_minor],
                        strict=True,
                    )
                ):
                    raise PaymentError("refund_exceeds_line_or_is_stale")
                delta = [
                    item_minor - previous.item,
                    shipping_minor - previous.shipping,
                    tax_minor - previous.tax,
                ]
                if not sum(delta):
                    return None
                fields = {
                    "charge": order.charge,
                    "amount": sum(delta),
                    "metadata": {
                        "glam_test_line": str(line_id),
                        "glam_operation": key,
                        "item": delta[0],
                        "shipping": delta[1],
                        "tax": delta[2],
                    },
                }
        if completed:
            result = self.gateway.call("GET", "/v1/refunds/" + completed)
        else:
            result = self._operation(
                order_id,
                key,
                "refund",
                "/v1/refunds",
                fields,
                lambda db, r: self._refund_effect(db, line_id, key, delta, r),
                "/v1/refunds/",
            )
        self._reverse_for_refund(result["id"])
        return result

    def _refund_effect(self, db, line_id, key, delta, result):
        test_object(result, "re_")
        line = row(db, "SELECT * FROM stripe_test_line WHERE id=:id", id=line_id)
        order = self._order(db, line.order_id)
        if (
            result.get("status") != "succeeded"
            or result.get("charge") != order.charge
            or (result.get("amount") != sum(delta) or result.get("currency") != "usd")
        ):
            # Pending/failed refunds remain unresolved operations, never posted as customer refunds.
            raise PaymentError("refund_not_verified_succeeded")
        previous = self._refunded(db, line)
        fulfilled = row(db, "SELECT 1 FROM stripe_test_fulfillment WHERE line_id=:l", l=line_id)
        commission_reversal = 0
        if fulfilled:
            before = calculate_item_commission(
                final_item_minor=line.item_minor, completed=True, refunded_item_minor=previous.item
            )
            after = calculate_item_commission(
                final_item_minor=line.item_minor,
                completed=True,
                refunded_item_minor=previous.item + delta[0],
            )
            commission_reversal = before.earned_commission_minor - after.earned_commission_minor
        transfer = row(db, "SELECT * FROM stripe_test_transfer WHERE line_id=:l", l=line_id)
        merchant_return = delta[0] + delta[1] - commission_reversal
        bt = balance(
            db, self.gateway, line.order_id, result["balance_transaction"], result["id"], "refund"
        )
        if bt["amount"] != -sum(delta):
            raise PaymentError("refund_balance_mismatch")
        db.execute(
            text(
                "INSERT INTO stripe_test_refund"
                "(id,line_id,operation_key,item_minor,shipping_minor,"
                "tax_minor,balance_transaction) "
                "VALUES(:id,:l,:k,:i,:s,:t,:b)"
            ),
            {
                "id": result["id"],
                "l": line_id,
                "k": key,
                "i": delta[0],
                "s": delta[1],
                "t": delta[2],
                "b": bt["id"],
            },
        )
        entries = [
            ("stripe_cash", bt["net"]),
            ("stripe_fee_expense", bt["fee"]),
            ("commission_revenue", commission_reversal),
            (
                f"merchant_recoverable:{line_id}" if transfer else f"merchant_hold:{line_id}",
                merchant_return,
            ),
            (f"tax_liability:{line_id}", delta[2]),
        ]
        post(
            db,
            line.order_id,
            "refund:" + result["id"],
            "refund",
            {
                "refund": result["id"],
                "commission_reversal": commission_reversal,
                "balance_transaction": bt["id"],
                "allocation": delta,
            },
            entries,
        )

    def _reverse_for_refund(self, refund_id):
        with self.engine.begin() as db:
            refund = row(db, "SELECT * FROM stripe_test_refund WHERE id=:id", id=refund_id)
            if not refund:
                return None
            line = row(db, "SELECT * FROM stripe_test_line WHERE id=:id", id=refund.line_id)
            transfer = row(db, "SELECT * FROM stripe_test_transfer WHERE line_id=:l", l=line.id)
            if not transfer:
                return None
            journal = row(
                db,
                "SELECT evidence FROM stripe_test_journal WHERE business_key=:k",
                k="refund:" + refund_id,
            )
            commission = journal.evidence["evidence"]["commission_reversal"]
            amount = refund.item_minor + refund.shipping_minor - commission
            if not amount:
                return None
            fields = {"amount": amount, "metadata": {"glam_refund": refund_id}}

        def effect(db, result):
            # Transfer reversals lack a livemode field: scope derives from the
            # retrieved test transfer.
            original = test_object(self.gateway.call("GET", "/v1/transfers/" + transfer.id), "tr_")
            if (
                result.get("transfer") != original["id"]
                or result.get("amount") != amount
                or not str(result.get("id", "")).startswith("trr_")
                or result.get("currency") != "usd"
            ):
                raise PaymentError("transfer_reversal_mismatch")
            bt = balance(
                db,
                self.gateway,
                line.order_id,
                result["balance_transaction"],
                result["id"],
                "transfer_reversal",
            )
            if bt["amount"] != amount:
                raise PaymentError("reversal_balance_mismatch")
            db.execute(
                text(
                    "INSERT INTO stripe_test_reversal"
                    "(id,transfer_id,refund_id,amount,balance_transaction) VALUES(:id,:t,:r,:a,:b)"
                ),
                {"id": result["id"], "t": transfer.id, "r": refund_id, "a": amount, "b": bt["id"]},
            )
            post(
                db,
                line.order_id,
                "reversal:" + result["id"],
                "transfer_reversal",
                {"reversal": result["id"], "balance_transaction": bt["id"]},
                [
                    ("stripe_cash", bt["net"]),
                    (f"merchant_recoverable:{line.id}", -amount),
                    ("stripe_fee_expense", bt["fee"]),
                ],
            )

        return self._operation(
            line.order_id,
            "reverse:" + refund_id,
            "reversal",
            "/v1/transfers/" + transfer.id + "/reversals",
            fields,
            effect,
            "/v1/transfers/" + transfer.id + "/reversals/",
        )

    def observe_refund(self, refund_id):
        result = test_object(self.gateway.call("GET", "/v1/refunds/" + refund_id), "re_")
        charge = test_object(self.gateway.call("GET", "/v1/charges/" + result["charge"]), "ch_")
        with self.engine.connect() as db:
            order = row(db, "SELECT * FROM stripe_test_order WHERE charge=:c", c=charge["id"])
        if not order:
            raise PaymentError("unknown_refunded_charge")
        if result.get("status") != "succeeded":
            return
        allocated = False
        with serialized(self.engine, order.id):
            with self.engine.begin() as db:
                lock(db, order.id)
                known = row(db, "SELECT id FROM stripe_test_refund WHERE id=:id", id=refund_id)
                if known:
                    allocated = True
                else:
                    metadata = result.get("metadata", {})
                    operation = row(
                        db,
                        "SELECT * FROM stripe_test_operation WHERE key=:k AND "
                        "order_id=:o AND kind='refund'",
                        k=metadata.get("glam_operation", ""),
                        o=order.id,
                    )
                    if operation:
                        expected = operation.fields
                        if (
                            expected["charge"] != charge["id"]
                            or expected["amount"] != result["amount"]
                            or any(
                                str(metadata.get(k)) != str(v)
                                for k, v in expected["metadata"].items()
                            )
                        ):
                            raise PaymentError("refund_operation_binding_mismatch")
                        delta = [
                            int(expected["metadata"][key]) for key in ["item", "shipping", "tax"]
                        ]
                        self._refund_effect(
                            db,
                            UUID(expected["metadata"]["glam_test_line"]),
                            operation.key,
                            delta,
                            result,
                        )
                        db.execute(
                            text(
                                "UPDATE stripe_test_operation SET "
                                "state='complete',remote_id=:id WHERE key=:k"
                            ),
                            {"id": refund_id, "k": operation.key},
                        )
                        allocated = True
                    else:
                        bt = balance(
                            db,
                            self.gateway,
                            order.id,
                            result["balance_transaction"],
                            refund_id,
                            "unallocated_refund",
                        )
                        if bt["amount"] != -result["amount"]:
                            raise PaymentError("refund_balance_mismatch")
                        post(
                            db,
                            order.id,
                            "unallocated:" + refund_id,
                            "unallocated_refund",
                            {"refund": refund_id, "balance_transaction": bt["id"]},
                            [
                                ("stripe_cash", bt["net"]),
                                ("refund_allocation_suspense", -bt["amount"]),
                                ("stripe_fee_expense", bt["fee"]),
                            ],
                        )
                        db.execute(
                            text(
                                "UPDATE stripe_test_order SET "
                                "state='refund_allocation_required' WHERE id=:o"
                            ),
                            {"o": order.id},
                        )
            if allocated:
                self._reverse_for_refund(refund_id)

    def observe_dispute(self, dispute_id):
        dispute = test_object(self.gateway.call("GET", "/v1/disputes/" + dispute_id), "dp_")
        with self.engine.connect() as db:
            order = row(db, "SELECT * FROM stripe_test_order WHERE charge=:c", c=dispute["charge"])
        if not order or dispute.get("currency") != "usd":
            raise PaymentError("dispute_charge_mismatch")
        with serialized(self.engine, order.id), self.engine.begin() as db:
            lock(db, order.id)
            for identifier in dispute.get("balance_transactions", []):
                bt_id = identifier["id"] if isinstance(identifier, dict) else identifier
                bt = balance(db, self.gateway, order.id, bt_id, dispute_id, "dispute")
                post(
                    db,
                    order.id,
                    "dispute:" + bt_id,
                    "dispute",
                    {"dispute": dispute_id, "balance_transaction": bt_id},
                    [
                        ("stripe_cash", bt["net"]),
                        ("dispute_receivable", -bt["amount"]),
                        ("stripe_fee_expense", bt["fee"]),
                    ],
                )
            if dispute.get("status") == "lost":
                gross = db.scalar(
                    text(
                        "SELECT coalesce(-sum(amount),0)::bigint FROM stripe_test_balance_evidence "
                        "WHERE source=:s AND kind='dispute'"
                    ),
                    {"s": dispute_id},
                )
                if gross > 0:
                    post(
                        db,
                        order.id,
                        "dispute-loss:" + dispute_id,
                        "dispute_lost",
                        {"dispute": dispute_id},
                        [("dispute_loss", gross), ("dispute_receivable", -gross)],
                    )
            # Transfers stay frozen, including won disputes, until an explicit
            # reviewed release policy.
            db.execute(
                text("UPDATE stripe_test_order SET state='disputed' WHERE id=:o"), {"o": order.id}
            )

    def reconcile(self, order_id):
        with serialized(self.engine, order_id), self.engine.begin() as db:
            order = self._order(db, order_id)
            evidence = rows(
                db, "SELECT * FROM stripe_test_balance_evidence WHERE order_id=:o", o=order_id
            )
            verified = []
            for saved in evidence:
                bt = balance(db, self.gateway, order_id, saved.id, saved.source, saved.kind)
                verified.append(
                    {
                        "id": saved.id,
                        "source": saved.source,
                        "kind": saved.kind,
                        "amount": bt["amount"],
                        "fee": bt["fee"],
                        "net": bt["net"],
                        "fee_details": bt.get("fee_details", []),
                    }
                )
            journals = rows(
                db,
                "SELECT j.id,j.kind,j.business_key,j.evidence FROM stripe_test_journal j "
                "WHERE order_id=:o ORDER BY created_at,id",
                o=order_id,
            )
            postings = rows(
                db,
                "SELECT p.account,sum(p.amount)::bigint amount FROM stripe_test_posting p "
                "JOIN stripe_test_journal j ON j.id=p.journal_id "
                "WHERE j.order_id=:o GROUP BY p.account",
                o=order_id,
            )
            totals = {p.account: p.amount for p in postings}
            stripe_net = sum(b["net"] for b in verified)
            gap = totals.get("stripe_cash", 0) - stripe_net
            pending = db.scalar(
                text(
                    "SELECT count(*) FROM stripe_test_operation WHERE order_id=:o "
                    "AND state='pending'"
                ),
                {"o": order_id},
            )
            transfers = rows(
                db,
                "SELECT t.*,l.account AS merchant_account FROM "
                "stripe_test_transfer t JOIN stripe_test_line l "
                "ON l.id=t.line_id WHERE l.order_id=:o",
                o=order_id,
            )
            # Retrieve actual transfer objects, not only projected IDs or the
            # platform's total balance.
            transfer_proof = []
            for saved in transfers:
                actual = test_object(self.gateway.call("GET", "/v1/transfers/" + saved.id), "tr_")
                if (
                    actual.get("amount") != saved.amount
                    or actual.get("destination") != saved.merchant_account
                    or actual.get("source_transaction") != order.charge
                ):
                    raise PaymentError("transfer_reconciliation_mismatch")
                transfer_proof.append(
                    {
                        "id": saved.id,
                        "amount": actual["amount"],
                        "destination": actual["destination"],
                    }
                )
            from glam_api.payments.webhooks import list_stripe

            actual_transfers = list_stripe(
                self.gateway, "/v1/transfers", {"transfer_group": f"glam_test_{order_id}"}
            )
            transfer_ids = {t["id"] for t in actual_transfers}
            recorded_ids = {t.id for t in transfers}
            unknown_transfers = sorted(transfer_ids - recorded_ids)
            absent_transfers = sorted(recorded_ids - transfer_ids)
            reversals_match = True
            for actual in actual_transfers:
                test_object(actual, "tr_")
                if actual.get("source_transaction") != order.charge:
                    raise PaymentError("transfer_group_source_mismatch")
                recorded_reversed = db.scalar(
                    text(
                        "SELECT coalesce(sum(amount),0) FROM stripe_test_reversal "
                        "WHERE transfer_id=:t"
                    ),
                    {"t": actual["id"]},
                )
                if actual.get("amount_reversed", 0) != recorded_reversed:
                    reversals_match = False
            actual_refunds = (
                list_stripe(self.gateway, "/v1/refunds", {"charge": order.charge})
                if order.charge
                else []
            )
            actual_refund_ids = {r["id"] for r in actual_refunds if r.get("status") == "succeeded"}
            recorded_refund_ids = {
                b["source"] for b in verified if b["kind"] in {"refund", "unallocated_refund"}
            }
            unknown_refunds = sorted(actual_refund_ids - recorded_refund_ids)
            actual_disputes = (
                list_stripe(self.gateway, "/v1/disputes", {"charge": order.charge})
                if order.charge
                else []
            )
            observed_dispute_bt = {b["id"] for b in verified if b["kind"] == "dispute"}
            missing_dispute_bt = []
            for dispute in actual_disputes:
                test_object(dispute, "dp_")
                for value in dispute.get("balance_transactions", []):
                    identifier = value["id"] if isinstance(value, dict) else value
                    if identifier not in observed_dispute_bt:
                        missing_dispute_bt.append(identifier)
            line_summary = []
            for line in rows(
                db, "SELECT * FROM stripe_test_line WHERE order_id=:o ORDER BY id", o=order_id
            ):
                returned = self._refunded(db, line)
                fulfilled = bool(
                    row(db, "SELECT 1 FROM stripe_test_fulfillment WHERE line_id=:l", l=line.id)
                )
                projected = calculate_item_commission(
                    final_item_minor=line.item_minor,
                    completed=True,
                    refunded_item_minor=returned.item,
                )
                actual_reversal = db.scalar(
                    text(
                        "SELECT coalesce(sum("
                        "(j.evidence->'evidence'->>'commission_reversal')::bigint),0)::bigint "
                        "FROM stripe_test_refund r JOIN stripe_test_journal j "
                        "ON j.business_key='refund:'||r.id WHERE r.line_id=:l"
                    ),
                    {"l": line.id},
                )
                line_summary.append(
                    {
                        "line_id": str(line.id),
                        "merchant": line.account,
                        "quantity": line.quantity,
                        "eligible_item_minor": line.item_minor,
                        "shipping_minor": line.shipping_minor,
                        "tax_minor": line.tax_minor,
                        "refunded_item_minor": returned.item,
                        "refunded_shipping_minor": returned.shipping,
                        "refunded_tax_minor": returned.tax,
                        "fulfilled": fulfilled,
                        "earned_commission_minor": projected.earned_commission_minor
                        if fulfilled
                        else 0,
                        "commission_reversal_minor": actual_reversal,
                        "unearned_potential_commission_minor": 0
                        if fulfilled
                        else projected.earned_commission_minor,
                        "policy_version": projected.policy_version,
                    }
                )
            complete_evidence = (
                not (unknown_transfers or absent_transfers or unknown_refunds or missing_dispute_bt)
                and reversals_match
            )
            return {
                "mode": "test",
                "order_id": str(order.id),
                "payment_id": order.payment_intent,
                "charge_id": order.charge,
                "state": order.state,
                "gross": order.amount,
                "currency": order.currency,
                "lines": line_summary,
                "transfers": transfer_proof,
                "balance_transactions": verified,
                "stripe_actual_fees": sum(b["fee"] for b in verified),
                "commission_earned": -totals.get("commission_revenue", 0),
                "ledger": [
                    {"id": str(j.id), "kind": j.kind, "key": j.business_key, "evidence": j.evidence}
                    for j in journals
                ],
                "posting_balances": totals,
                "cash_reconciliation_gap": gap,
                "cash_reconciled": bool(evidence) and gap == 0,
                "allocation_review_required": order.state == "refund_allocation_required",
                "pending_operations": pending,
                "unknown_transfers": unknown_transfers,
                "absent_transfers": absent_transfers,
                "unknown_refunds": unknown_refunds,
                "missing_dispute_balance_transactions": missing_dispute_bt,
                "transfer_reversals_match": reversals_match,
                "reconciled": bool(evidence)
                and gap == 0
                and pending == 0
                and complete_evidence
                and order.state != "refund_allocation_required",
                "integration_complete": False,
            }
