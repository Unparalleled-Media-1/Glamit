# Marketplace payment flow — isolated test mode

1. Operator binds an allowlisted, eligible Stripe test connected account to a synthetic physical sandbox offer. No live merchant facts are invented.
2. Authenticated buyer submits offer IDs/quantities with an idempotency key to the separate test API. Server locks inventory snapshots and freezes prices, shipping, taxes, currency, owner and merchants.
3. Server verifies platform and seller capabilities, then creates Stripe-hosted Checkout on the platform. Separate charges/transfers use a transfer group; no destination-charge/application-fee shortcut is substituted.
4. A signed, time-bounded webhook identifies a test object. Server re-fetches the PaymentIntent/Charge and verifies the prepared order binding, captured amount/currency and actual balance transaction. Duplicate IDs have one receipt; stale failures cannot reverse capture state.
5. Gross customer funds are held per line. Stripe fee is an independent expense from actual balance evidence. Unfulfilled merchant proceeds remain held; no commission is earned for that line yet.
6. Confirmed full-line fulfillment earns the approved 10% item-only commission and authorizes one merchant transfer for remaining item value plus attributed shipping. Tax remains a separate liability.
7. A successful refund posts actual customer cash movement and the cumulative commission reversal. Merchant recoverable is cleared only by an actual transfer reversal; failed/unknown reversals remain unresolved.
8. Disputes freeze remaining transfers and record actual withdrawal, recovery and fees. External refunds without known allocation enter suspense and require review.
9. Reconciliation re-fetches platform charge/transfer balance transactions and scans Stripe lists to detect missing refunds, transfers, reversals and dispute balance transactions. Preserve all immutable source IDs and postings in the report.

The optional API factory is `glam_api.payments.app:create_app`. It is separate from the existing app, uses existing authentication without a bypass, and refuses a non-local/non-test database. The return URL is navigation only, never confirmation. No card or bank details pass through GLAM.
