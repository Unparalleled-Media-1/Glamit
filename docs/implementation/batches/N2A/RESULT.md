# N2A — private-photo transport lifecycle result

This is a shared/native source component, not completed N2 or an operational photo-analysis journey. Branch feat/native-private-media-transport is based on OpenAI draft PR38 and N1 PR37; no merge or production deployment is authorized by this result.

Changes:

- Optional AbortSignal on status, policy, consent, list, metadata, deletion, download and upload. Check cancellation/session before work, after hashing and at each asynchronous response boundary; no photo-byte PUT follows a cancelled upload intent.
- A 30-second request deadline remains active through response body consumption, aborts the transport and clears timers/listeners. Cancellation does not claim to reverse a completed server operation. No automatic upload, consent or deletion retry was added; an uncertain operation must be reconciled with the owner's server records.
- Reject redirected/cross-origin responses; omit cookies and cache; reject invalid session header values. Read streaming JSON up to64KiB and photo content up to10MiB, cancel oversized readers and never expose raw error bodies. Legacy transport fallback applies the same post-read limits; Expo fetch uses the streaming path.
- Validate the private_photo_storage policy purpose, identifier, version and nonempty content. Consent receipt must match the requested action. Project public fields only; do not forward extra server fields into device state.
- Native private-media adapter explicitly selects expo/fetch with Expo Crypto hashing, using the existing dependencies. Web retains its existing shared transport.

Evidence: evidence/cancellation-before.txt fails against the original pre-cancellation behavior; private-media-after.txt passes new lifecycle and existing shared Web/native-port contracts. Photo, Advisor and Auth handlers run under explicit OS/HTTP doubles; TypeScript checks independently cover web and mobile. No browser evidence is represented as native evidence. No new native binary or live upload is certified by these source checks.

Required dependent checks: 348 backend tests passed against disposable local PostgreSQL, with one upstream Starlette deprecation warning. Python lint, both client type checks, shared Advisor contracts and the Next production build passed. Evidence receipts are under evidence/. Unrelated generated payment-fixture UUID changes were excluded.

GB-013/GB-022 remain PARTIALLY IMPLEMENTED and their defects OPEN. Missing native upload UX, authenticated consumer composition, proper native navigation and F1B persisted analysis are application-code gaps. Private storage activation, approved retention/consent/eligibility and migration review are separate gates. This batch neither applies0014/0015 nor changes policy/eligibility records, authentication or finance.

OpenAI review remains separate: its feature flag stays false; model-access verification requires the absent server key/model/network configuration first. A model GET cannot qualify live styling. Actual authenticated iOS/Android Advisor requests, provider/refusal/failure/cancellation/withdrawal/rate-limit verification and provider data-handling review are still required before live use. PR38 remains draft pending PR37 and review.
