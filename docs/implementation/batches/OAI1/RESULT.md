# OAI1 — native OpenAI text-styling connection

8 November 2026. Branch: feat/openai-service-connection. This batch builds on the N1 source from PR37 and the approved dark-logo merge. It is a source implementation batch, not a production activation or completion of N2.

## Implemented

The actual React Native Advisor now mounts NativeAIStylist through App/StylingJourney. It uses the existing current Supabase account/token and a shared typed HTTPS FastAPI client. Account/role/profile/Creator APIs remain on the original Supabase Edge contract; this batch does not redirect them to incompatible FastAPI endpoints. No privileged database operation or OpenAI key runs in the mobile client.

Server routes:

- GET /v1/ai/openai/status: authenticated model-access probe, truthful NOT CONFIGURED / DEGRADED / CONNECTED and explicit metadata-only scope. Key presence alone cannot establish CONNECTED. Model metadata access does not qualify live advice or analysis.
- GET /v1/ai/stylist/policy: only the current genuinely approved ai_styling_advice document; future documents are excluded.
- POST /v1/ai/stylist/advice: text only, literal consent, body/brief/output bounds, existing JWT/session checks, trusted adult eligibility and exact consent epoch. Photo/owner/model override fields are rejected.

Reuse the existing OpenAI Responses adapter, now with exact model-access checks and strict refusal/malformed-response handling. Requests use store:false; no automatic billable POST retry, fake response, weather/merchant/price/booking fact or image transformation is substituted. Returned directions are explicitly styling concepts, not verified marketplace recommendations. Provider policy/retention and model qualification still require review; store:false does not prove zero provider retention.

Opaque attempt IDs commit before provider I/O. The actor lock serializes quota/duplicate checks, then releases before I/O. A consumed key never causes another provider call or replays a stored reply. Timeouts/failed delivery may mean the provider already processed a request; an explicit new attempt can call it again. Existing immutable audit events contain actor/action/opaque-ID metadata only, not briefs/replies/images. There is no saved conversation/report feature in this batch.

The hourly attempt bound is operational, not customer pricing. Existing credits, 10% marketplace commission and financial logic are unchanged. Backend audit read/write permissions and authoritative visibility must pass before attempts; client DB roles cannot bypass the guard. All consent, active-session and eligibility checks run again before response disclosure. Withdrawal/regrant cannot revive a stale reply.

Native controls include real service checks, legal-policy display, explicit grant/withdrawal, withdrawal retry (including uncertain grant delivery), duplicate-tap locking, account/token fencing, local cancellation and honest error states. Briefs and replies stay in session state and are not transferred to another account or the old device planning notes. Leaving the screen cancels local delivery; it cannot guarantee cancellation of an already submitted provider operation. Other native consumer CompanionConnection operations remain unconnected and are not excused by the OpenAI key.

## Verification

- Full local backend regression: 345 passed, one upstream Starlette deprecation warning.
- Three additional native CI readiness-helper checks passed; this helper waits for actual native tab visibility and still fails for absent tabs/crashed processes. It is not device evidence itself.
- Web/mobile TypeScript, shared styling transport, actual native Advisor handlers under explicit iOS/Android OS/HTTP doubles, existing native photo/Auth regressions, mobile build configuration, Next production build and separate iOS/Android JS exports pass.
- Python lint/format and generated OpenAPI consistency pass.
- Native simulator/emulator CI must verify the changed Advisor source independently; prior N1 native captures do not certify this new component. New compiled-device results are separate from local doubles and exports.
- Evidence receipts are under evidence/. No live OpenAI call passed: the active environment lacks the key/model and OpenAI network rule. openai-configuration.json reports NOT CONFIGURED; neither live advice nor photo analysis was run.

## Files and backlog

Primary code: services/api/src/glam_api/ai_stylist.py, integrations/providers.py and runtime.py, main.py mount, packages/product/ai-stylist.ts, generated contracts, apps/mobile/NativeAIStylist.tsx, App.tsx/StylingJourney.tsx/app.config.ts, scripts/check_openai.py, native readiness helper and targeted tests/CI.

GB-034 / FINAL-GB-034, scoped GB-035 / FINAL-GB-035 and GB-104 / FINAL-GB-104 receive component evidence. All broader feature/defect statuses remain OPEN/PARTIAL. Full conversational memory, proper native navigation stacks, persistent photo upload/analysis jobs/reports/corrections/Style Passport, generation and other consumer-service composition remain N2/F1B application work. No browser mockup or source test supplies native-device/live-provider acceptance.

No migration is required for this transient operation. No production database/storage records, policies, eligibility records, Railway settings, payment state or deployment were changed. Pending0014/0015 and any future F1B migration still need exact-SQL review, recovery evidence and explicit authorization. No user/merchant/customer financial charge was activated.

## OpenAI configuration and activation

Only the OpenAI service key is newly required. The partial environment draft preserves existing bindings and adds GLAM_OPENAI_API_KEY for api.openai.com, a proposed model and non-secret settings. Saved draft is not active configuration. Review/save/publish the execution-environment configuration to load it; that does not publish GLAM Beauty. Never paste a key into chat or add server keys to EXPO_PUBLIC/NEXT_PUBLIC/.env files or Git.

| Setting | Scope | Requirement |
| --- | --- | --- |
| GLAM_OPENAI_API_KEY | Server secret | Managed execution-environment alias; OPENAI_* binding names are reserved here. The server also accepts canonical OPENAI_API_KEY in deployment secrets |
| GLAM_OPENAI_MODEL | Server | Proposed pinned candidate gpt-4.1-mini-2025-04-14; actual account access and live behavior not yet verified; no model auto-substitution |
| GLAM_OPENAI_ADVISOR_ENABLED | Server | false by default; no automatic production enablement |
| GLAM_OPENAI_MAX_REQUESTS_PER_HOUR | Server | Explicit reviewed bound, 1–100 per user; proposed20 is a configuration suggestion, not a commercial rate |
| EXPO_PUBLIC_GLAM_API_ORIGIN | Public native build setting | Exact approved FastAPI HTTPS origin, no path/query/userinfo; do not guess a domain or use the provider's API URL |

Read-only connection check after configuration: `.venv/bin/python scripts/check_openai.py --probe --report <local-report.json>`. It never sends a prompt/photo and never marks live advice qualified from a model GET. Native client operation also needs the reviewed API deployment, current approved purpose policy, trusted eligibility and backend permissions. Do not seed fabricated approvals to enable it. Production deployment/processing remains separately gated.

## Native artifact access

artifact-access-check.json records permitted GitHub metadata access, an unexpired artifact, a fresh unexpired signed URL and a403 at the proxy CONNECT stage before Azure authorization. No signed URL/credential is retained. The active network policy omits the artifact host. No additional GitHub secret is indicated.

In this chat's execution-environment Internet Access / restricted custom allowed domains, append the exact observed productionresultssa13.blob.core.windows.net and earlier productionresultssa9.blob.core.windows.net entries without dropping existing rules; review/save/publish that environment configuration. Fresh GitHub artifact URLs can use another storage hostname, so recheck the exact failed host if it changes. Do not broadly enable all Azure Blob hosts just to bypass a specific block. Activation has not been observed.

Actual N1 captures remain accessible through the existing authorized GitHub Actions artifacts on run42516089742. No browser screenshots were substituted and no PR screenshot binary or new secret is needed. Visual review remains pending until downloads work; development continues independently.
