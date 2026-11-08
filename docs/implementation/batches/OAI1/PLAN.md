# OAI1 — server OpenAI and native text styling advice

Authority: user's OpenAI-first integration request and N2/native completion directives. Dependencies: reviewed native N1 source in PR37 and approved dark-branding upstream. Feature branch only; do not merge incomplete work into the release candidate.

Scope: GB-034 / FINAL-GB-034 AI Advisor, scoped GB-035 / FINAL-GB-035 styling, and authenticated native service composition within GB-104 / FINAL-GB-104. This does not complete N2, F1B, photo analysis or the entire feature IDs.

Reuse the existing OpenAI Responses adapter, auth/JWKS/session checks, consent/eligibility and opaque audit infrastructure. Install authenticated server readiness/policy/text-advice endpoints; no API keys or provider calls in client bundles. Only typed styling text is accepted: no file/photo URL or privileged body identity. No photo inference, generation, verified catalog/weather/booking claim or invented response fallback.

Current environment has no OpenAI credential or active api.openai.com allowance. A partial environment draft adds only GLAM_OPENAI_API_KEY (server alias because OPENAI_* bindings are reserved), its exact destination and a proposed pinned model. Saving is not activation. Key/model alone do not approve privacy policy or production processing. The server feature flag and reviewed hourly request bound remain explicit configuration.

No migration required for this transient advice operation. Existing immutable audit events store only opaque attempt IDs and actor IDs, never prompt/reply/photo content. An attempt is committed before the provider call so the same actor/key cannot produce a second billable call; responses are transient and are not replayed/saved. Repeating an uncertain response requires a new explicit request. No new customer credits, commission, financial rates or payment changes.

Current approved ai_styling_advice policy, granted consent epoch and trusted adult eligibility are required before submission and rechecked after the provider returns. No invented legal policy or qualification. Requests are bounded, server configuration controls model/output limits, and billable POSTs are never automatically retried. Database locks are released during provider I/O; revoked/replaced consent or session cannot expose returned advice.

Actual native Advisor is wired through an explicit HTTPS FastAPI origin and the existing current Supabase account token. Its separate session-only brief/response/consent state is fenced on logout/account/token changes. Preserve existing editorial styling and other Event/Studio/planning controls; unconfigured services display honest unavailable states. Web/native share typed transport contracts. No special fake native preview.

Tests before/after: missing endpoint; missing/invalid config; health authentication; expired/current/future policy; adult/session checks; malformed/oversized brief; duplicate and concurrent attempts/hourly budget; timeout/refusal/malformed result; post-call revocation/withdraw-regrant; no audit prompt/reply; no cache/secret leakage; shared transport identity/schema/error fencing; real native Advisor handlers with explicit OS/HTTP doubles; dependent Auth/media/native regressions and separate builds. Live OpenAI verification is pending real secret/model activation. Persistent analysis/reports/corrections/Style Passport and proper stack/tab navigation remain subsequent N2 work, not external-key excuses.

Affected files: integrations/providers.py and runtime.py as needed, new ai_stylist server router, main.py mount, shared/generated contracts and shared stylist client, native Advisor card/service composition, tests, CI and scoped backlog receipts. Production schema/data/deployment unchanged.
