# Merchant onboarding and payout matrix

| Condition | Hosted onboarding | Checkout/transfers |
|---|---|---|
| Unknown/unbound account ID | Denied | Denied |
| Existing authenticated merchant owns configured US test binding | Stripe Account Links request permitted | Eligibility still independently rechecked |
| Account requires information / incomplete requirements | Hosted onboarding may collect missing information if account/controller type supports it | Denied until charges/payouts/card_payments/transfers checks pass |
| Cards active + payouts enabled, transfers inactive | May refresh hosted onboarding | Denied; card and payout indicators are insufficient |
| Payouts/charges disabled or merchant restricted | May use hosted flow where Stripe permits | Denied; no payout is assumed or forced |
| Standard/controller model rejects Account Links | Surface safe failure; review approved Connect/OAuth model | No simulated onboarding approval |
| Qualified US test account, actual test transfer accepted | No redundant new KYC collected by GLAM | Test-only source-charge transfer; bank payout not proven |
| Other geography/currency or live account operation | Default-deny pending matrix qualification | Denied |

Onboarding URLs are short-lived, credential-like links returned only to the authorized merchant/operator. Do not commit them, include them in reports or log them. Refresh requires a new explicit request. Existing provider credentials, KYC/bank collection and authority remain with Stripe; GLAM stores no raw identity/bank documents in this module.
