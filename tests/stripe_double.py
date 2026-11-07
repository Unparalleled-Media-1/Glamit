"""Deterministic Stripe TEST DOUBLE. IDs/fees below are not real Stripe evidence."""

import copy
import threading

from glam_api.payments.config import PaymentError
from glam_api.payments.ledger import digest


class StripeDouble:
    def __init__(self):
        self.data, self.idempotency, self.calls = {}, {}, []
        self.guard = threading.RLock()
        self.counter = 0
        self.fee = 1060  # Explicit synthetic fixture; not an observed rate or Stripe quotation.
        self.unknown_once = False
        self.accounts = {
            a: {
                "id": a,
                "country": "US",
                "charges_enabled": True,
                "payouts_enabled": True,
                "capabilities": {"card_payments": "active", "transfers": "active"},
            }
            for a in ["acct_platform", "acct_merchantA", "acct_merchantB"]
        }

    def identifier(self, prefix):
        self.counter += 1
        return f"{prefix}fixture{self.counter}"

    def bt(self, source, amount, fee=0):
        identifier = self.identifier("txn_")
        self.data[identifier] = {
            "id": identifier,
            "source": source,
            "currency": "usd",
            "amount": amount,
            "fee": fee,
            "net": amount - fee,
            "fee_details": [{"type": "stripe_fee", "amount": fee}] if fee else [],
        }
        return identifier

    def call(self, method, path, fields=None, key=None):
        with self.guard:
            self.calls.append((method, path, copy.deepcopy(fields), key))
            if method == "GET":
                if path == "/v1/account":
                    return copy.deepcopy(self.accounts["acct_platform"])
                if path.startswith("/v1/accounts/"):
                    return copy.deepcopy(self.accounts[path.split("/")[-1]])
                if path in {"/v1/transfers", "/v1/refunds", "/v1/disputes"}:
                    prefix = {"/v1/transfers": "tr_", "/v1/refunds": "re_", "/v1/disputes": "dp_"}[
                        path
                    ]
                    data = [v for k, v in self.data.items() if k.startswith(prefix)]
                    for attr in ["charge", "transfer_group"]:
                        if fields and fields.get(attr):
                            data = [v for v in data if v.get(attr) == fields[attr]]
                    return {"data": copy.deepcopy(data), "has_more": False}
                return copy.deepcopy(self.data[path.split("/")[-1]])
            if not key:
                raise AssertionError("Mutation without idempotency key")
            hashed = digest({"path": path, "fields": fields})
            if key in self.idempotency:
                old_hash, result = self.idempotency[key]
                if hashed != old_hash:
                    raise PaymentError("stripe_fixture_idempotency_conflict")
                return copy.deepcopy(result)
            if path == "/v1/payment_intents":
                identifier = self.identifier("pi_")
                succeeded = fields["payment_method"] == "pm_card_visa"
                result = {
                    "id": identifier,
                    "livemode": False,
                    **fields,
                    "status": "succeeded" if succeeded else "requires_payment_method",
                }
                if succeeded:
                    charge = self.identifier("ch_")
                    result["latest_charge"] = charge
                    self.data[charge] = {
                        "id": charge,
                        "livemode": False,
                        "payment_intent": identifier,
                        "amount": fields["amount"],
                        "currency": "usd",
                        "paid": True,
                        "captured": True,
                        "disputed": False,
                        "amount_refunded": 0,
                        "balance_transaction": self.bt(charge, fields["amount"], self.fee),
                    }
            elif path == "/v1/checkout/sessions":
                identifier = self.identifier("cs_test_")
                result = {
                    "id": identifier,
                    "livemode": False,
                    **fields,
                    "url": "https://checkout.stripe.com/test_fixture",
                    "payment_intent": None,
                }
            elif path == "/v1/transfers":
                identifier = self.identifier("tr_")
                result = {
                    "id": identifier,
                    "livemode": False,
                    **fields,
                    "amount_reversed": 0,
                    "balance_transaction": self.bt(identifier, -fields["amount"]),
                }
            elif path == "/v1/refunds":
                identifier = self.identifier("re_")
                result = {
                    "id": identifier,
                    "livemode": False,
                    "currency": "usd",
                    "status": "succeeded",
                    **fields,
                    "balance_transaction": self.bt(identifier, -fields["amount"]),
                }
                self.data[fields["charge"]]["amount_refunded"] += fields["amount"]
            elif path.endswith("/reversals"):
                identifier = self.identifier("trr_")
                transfer = path.split("/")[-2]
                result = {
                    "id": identifier,
                    "currency": "usd",
                    "transfer": transfer,
                    **fields,
                    "balance_transaction": self.bt(identifier, fields["amount"]),
                }
                self.data[transfer]["amount_reversed"] += fields["amount"]
            elif path == "/v1/account_links":
                result = {
                    "object": "account_link",
                    "url": "https://connect.stripe.com/setup/test_fixture",
                    "expires_at": 2000000000,
                }
            else:
                raise AssertionError("Unknown test fixture path: " + path)
            if result.get("id"):
                self.data[result["id"]] = copy.deepcopy(result)
            self.idempotency[key] = (hashed, copy.deepcopy(result))
            if self.unknown_once:
                self.unknown_once = False
                raise PaymentError("stripe_transport_unknown_result")
            return result

    def dispute(self, charge, status="needs_response", fee=1500):
        identifier = self.identifier("dp_")
        amount = self.data[charge]["amount"]
        self.data[charge]["disputed"] = True
        self.data[identifier] = {
            "id": identifier,
            "livemode": False,
            "charge": charge,
            "amount": amount,
            "currency": "usd",
            "status": status,
            "balance_transactions": [self.bt(identifier, -amount, fee)],
        }
        return identifier
