# 21 — Known gaps and blockers

* Native evidence for Batch 1 depends on CI (no emulator/simulator in the authoring workspace).
* Backend: 26 of 232 screens have a confirmed contract in the handover, 64 partial, 142 unverified (`BACKEND_CONTRACT_MAP.csv`). Missing: events catalogue, ad placement/serving, full-body try-on, transformation plans, payment/booking confirmation and settlement contracts, among others.
* Credentials absent: SMS/OTP provider, Google/Facebook/Apple sign-in, push, live OpenAI qualification, Stripe live. Stripe test and Supabase production changes remain separately authorized.
* 639-link navigation baseline not reproduced; 341 statically derived edges recorded.
* Feature-matrix ↔ design-screen reconciliation not started.
* Full list of design deviations: defects `PARITY-B1-001…009`.
